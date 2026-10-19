const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'c2m-home-'));
process.env.CMS2MD_FAST_RETRY = '1';
delete process.env.POLAR_LICENSE_KEY;

const calls = [];
let handler = async () => ({ ok: true, status: 200, json: async () => ({}), headers: { get: () => null } });
const fake = async (url, init) => { calls.push({ url, init }); return handler(url, init); };
require.cache[require.resolve('node-fetch')] = { id: 'x', filename: 'x', loaded: true, exports: Object.assign(fake, { default: fake, __esModule: true }) };

const { propertyValue, fetchNotionItems } = require('../dist/adapters/notion');
const { fetchDirectusItems } = require('../dist/adapters/directus');
const { SyncEngine } = require('../dist/syncEngine');

const reply = (body, status = 200, headers = {}) => ({ ok: status < 400, status, statusText: String(status), json: async () => body, headers: { get: (k) => headers[k.toLowerCase()] ?? null } });
const rt = (...parts) => parts.map((p) => ({ plain_text: p }));

test('Notion properties become frontmatter values, multi-part titles are kept whole', () => {
  assert.strictEqual(propertyValue({ type: 'title', title: rt('Hello ', 'world') }), 'Hello world');
  assert.deepStrictEqual(propertyValue({ type: 'multi_select', multi_select: [{ name: 'a' }, { name: 'b' }] }), ['a', 'b']);
  assert.strictEqual(propertyValue({ type: 'status', status: { name: 'Published' } }), 'Published');
  assert.strictEqual(propertyValue({ type: 'date', date: { start: '2026-10-19' } }), '2026-10-19');
  assert.strictEqual(propertyValue({ type: 'checkbox', checkbox: false }), false);
  assert.strictEqual(propertyValue({ type: 'number', number: 0 }), 0);
  assert.strictEqual(propertyValue({ type: 'title', title: [] }), undefined);
  assert.strictEqual(propertyValue({ type: 'relation' }), undefined);
});

test('Notion: follows the cursor, never asks for more than 100 rows at once, stops at the limit', async () => {
  calls.length = 0;
  const page = (n, more) => reply({ results: Array.from({ length: n }, (_, i) => ({ id: `p${calls.length}-${i}`, properties: {} })), has_more: more, next_cursor: more ? 'cur' : null });
  let q = 0;
  handler = async (url, init) => {
    if (url.includes('/children')) return reply({ results: [], has_more: false });
    q++;
    return q === 1 ? page(100, true) : page(100, true);
  };
  const items = await fetchNotionItems({ collection: 'db', token: 't', limit: 150 });
  const queries = calls.filter((c) => c.url.endsWith('/query')).map((c) => JSON.parse(c.init.body));
  assert.strictEqual(items.length, 150);
  assert.deepStrictEqual(queries.map((b) => b.page_size), [100, 50]);
  assert.strictEqual(queries[1].start_cursor, 'cur');
});

test('Notion: a 429 is retried', async () => {
  calls.length = 0;
  let n = 0;
  handler = async (url) => {
    if (url.includes('/children')) return reply({ results: [] });
    return ++n === 1 ? reply({}, 429, { 'retry-after': '0' }) : reply({ results: [{ id: 'a', properties: {} }], has_more: false });
  };
  const items = await fetchNotionItems({ collection: 'db', token: 't', limit: 10 });
  assert.strictEqual(items.length, 1);
  assert.strictEqual(n, 2);
});

test('Directus: collection is URL-encoded and the status filter is sent', async () => {
  calls.length = 0;
  handler = async () => reply({ data: [{ id: 1, slug: 'a' }] });
  const items = await fetchDirectusItems({ endpoint: 'https://d.example.com/', collection: 'my articles/x', limit: 5, statusFilter: 'published', token: 'tok' });
  assert.strictEqual(items.length, 1);
  assert.match(calls[0].url, /items\/my%20articles%2Fx\?limit=5/);
  assert.match(calls[0].url, /filter\[status\]\[_eq\]=published/);
  assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer tok');
});

function engine(items, extra = {}) {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c2m-out-'));
  handler = async () => reply({ data: items });
  return { outputDir, run: () => new SyncEngine({ cms: 'directus', endpoint: 'https://d.example.com', collection: 'c', outputDir, filenameField: 'slug', ...extra }).run() };
}

test('sync writes files, skips unchanged ones, and protects local edits', async () => {
  const items = [{ id: 1, slug: 'first', title: 'First', content: 'Body one' }];
  const e = engine(items);
  let r = await e.run();
  assert.deepStrictEqual([r.created, r.updated, r.skipped, r.conflicts, r.errors], [1, 0, 0, 0, 0]);
  const file = path.join(e.outputDir, 'first.md');
  assert.match(fs.readFileSync(file, 'utf8'), /title: First[\s\S]*Body one/);

  r = await e.run();
  assert.strictEqual(r.skipped, 1);

  fs.writeFileSync(file, 'my own edit\n');
  items[0].content = 'Body changed in the CMS';
  r = await e.run();
  assert.strictEqual(r.conflicts, 1);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), 'my own edit\n');
  assert.match(fs.readFileSync(file + '.new', 'utf8'), /Body changed in the CMS/);
});

test('sync: slugs cannot escape the output directory, colliding names are reported', async () => {
  const e = engine([
    { id: 1, slug: '../../evil', content: 'x' },
    { id: 2, slug: 'A/B', content: 'one' },
    { id: 3, slug: 'a-b', content: 'two' },
  ]);
  const r = await e.run();
  assert.strictEqual(r.errors, 1, 'the second item with the same file name is an error, not a silent overwrite');
  assert.strictEqual(r.created, 2);
  for (const f of fs.readdirSync(e.outputDir)) assert.ok(!f.includes('/'));
  assert.ok(!fs.existsSync(path.join(e.outputDir, '..', '..', 'evil.md')));
});

test('free tier processes at most 25 items', async () => {
  const items = Array.from({ length: 40 }, (_, i) => ({ id: i, slug: `s${i}`, content: 'x' }));
  const e = engine(items);
  const r = await e.run();
  assert.strictEqual(r.created, 25);
  assert.strictEqual(r.isPro, false);
});
