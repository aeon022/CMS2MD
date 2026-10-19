import fetch from 'node-fetch';
import { CMSItem, CMS2MDConfig } from '../types';

const NOTION_VERSION = '2022-06-28';
const NOTION_PAGE_MAX = 100; // Notion rejects page_size > 100
const MAX_RETRIES = 4;

// fetch with a retry on 429 (Notion's rate limit), honouring Retry-After.
async function notionFetch(url: string, init: any): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;
    const wait = Number(res.headers?.get?.('retry-after')) || 1;
    await new Promise((r) => setTimeout(r, Math.min(wait, 10) * (process.env.CMS2MD_FAST_RETRY ? 1 : 1000)));
  }
}

function notionHeaders(token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
    'Authorization': `Bearer ${token}`
  };
}

// Converts a Notion rich_text array into Markdown, honoring bold/italic/code/link annotations.
function richTextToMarkdown(richText: any[] | undefined): string {
  if (!Array.isArray(richText)) return '';

  return richText.map((t) => {
    let text = t.plain_text ?? t.text?.content ?? '';
    const annotations = t.annotations || {};
    const href = t.href || t.text?.link?.url;

    if (annotations.code) text = `\`${text}\``;
    if (annotations.bold) text = `**${text}**`;
    if (annotations.italic) text = `*${text}*`;
    if (href) text = `[${text}](${href})`;

    return text;
  }).join('');
}

// Converts a single Notion block object into a Markdown line/snippet.
// Unhandled block types degrade gracefully (skipped with a comment) instead of crashing.
function blockToMarkdown(block: any): string {
  const type = block.type;
  const data = block[type] || {};

  switch (type) {
    case 'paragraph':
      return richTextToMarkdown(data.rich_text);
    case 'heading_1':
      return `# ${richTextToMarkdown(data.rich_text)}`;
    case 'heading_2':
      return `## ${richTextToMarkdown(data.rich_text)}`;
    case 'heading_3':
      return `### ${richTextToMarkdown(data.rich_text)}`;
    case 'bulleted_list_item':
      return `- ${richTextToMarkdown(data.rich_text)}`;
    case 'numbered_list_item':
      return `1. ${richTextToMarkdown(data.rich_text)}`;
    case 'quote':
      return `> ${richTextToMarkdown(data.rich_text)}`;
    case 'code': {
      const lang = data.language || '';
      return `\`\`\`${lang}\n${richTextToMarkdown(data.rich_text)}\n\`\`\``;
    }
    case 'to_do':
      return `- [${data.checked ? 'x' : ' '}] ${richTextToMarkdown(data.rich_text)}`;
    case 'callout':
      return `> ${richTextToMarkdown(data.rich_text)}`;
    case 'toggle':
      return `**${richTextToMarkdown(data.rich_text)}**`;
    case 'divider':
      return `---`;
    case 'image': {
      const url = data.file?.url || data.external?.url || '';
      const caption = richTextToMarkdown(data.caption) || '';
      return url ? `![${caption}](${url})` : '';
    }
    default:
      // Unhandled block type (e.g. table, embed, callout, toggle) — skip rather than crash.
      // Note: deliberately not an HTML comment — htmlToMd.ts sniffs for "<" to decide whether
      // to run the body through turndown, and an HTML comment there would trip that heuristic.
      return `[cms2md: unhandled Notion block type "${type}" skipped]`;
  }
}

// Fetches all children blocks of a Notion page/block, following pagination.
async function fetchBlockChildren(blockId: string, token?: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;

  do {
    const url = `https://api.notion.com/v1/blocks/${blockId}/children${cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100'}`;
    const response = await notionFetch(url, { headers: notionHeaders(token) });

    if (!response.ok) {
      throw new Error(`Notion Blocks API Error (${response.status}): ${response.statusText}`);
    }

    const json: any = await response.json();
    blocks.push(...(json.results || []));
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

async function fetchPageMarkdown(pageId: string, token?: string): Promise<string> {
  const blocks = await fetchBlockChildren(pageId, token);
  return blocks
    .map(blockToMarkdown)
    .filter((line) => line.length > 0)
    .join('\n\n');
}

const plain = (rt: any[] | undefined): string => (Array.isArray(rt) ? rt.map((t) => t.plain_text ?? '').join('') : '');

// Turns one Notion property into a frontmatter value (undefined = not representable, skipped).
export function propertyValue(prop: any): any {
  switch (prop?.type) {
    case 'title': return plain(prop.title) || undefined;
    case 'rich_text': return plain(prop.rich_text) || undefined;
    case 'select': return prop.select?.name;
    case 'status': return prop.status?.name;
    case 'multi_select': return prop.multi_select?.length ? prop.multi_select.map((o: any) => o.name) : undefined;
    case 'date': return prop.date?.start;
    case 'checkbox': return prop.checkbox;
    case 'number': return prop.number ?? undefined;
    case 'url': return prop.url ?? undefined;
    case 'email': return prop.email ?? undefined;
    case 'phone_number': return prop.phone_number ?? undefined;
    default: return undefined;
  }
}

export async function fetchNotionItems(config: CMS2MDConfig): Promise<CMSItem[]> {
  const databaseId = encodeURIComponent(config.collection);
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
  const want = config.limit || NOTION_PAGE_MAX;

  // Notion returns at most 100 rows per request: follow the cursor until `want` rows are in.
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const body: any = { page_size: Math.min(NOTION_PAGE_MAX, want - results.length) };
    if (cursor) body.start_cursor = cursor;
    const response = await notionFetch(url, { method: 'POST', headers: notionHeaders(config.token), body: JSON.stringify(body) });
    if (!response.ok) {
      throw new Error(`Notion API Error (${response.status}): ${response.statusText}`);
    }
    const json: any = await response.json();
    results.push(...(json.results || []));
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor && results.length < want);

  const items: CMSItem[] = [];

  for (const page of results.slice(0, want)) {
    const properties = page.properties || {};
    const item: CMSItem = { id: page.id, created_at: page.created_time, updated_at: page.last_edited_time };

    for (const [key, prop] of Object.entries<any>(properties)) {
      const value = propertyValue(prop);
      if (value === undefined) continue;
      item[key] = value;
      if (prop.type === 'title') item.title = value;
    }

    // Fetch and convert the actual page body (block children) — properties alone are just metadata.
    item.content = await fetchPageMarkdown(page.id, config.token);

    items.push(item);
  }

  return items;
}
