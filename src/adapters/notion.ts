import fetch from 'node-fetch';
import { CMSItem, CMS2MDConfig } from '../types';

const NOTION_VERSION = '2022-06-28';

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
    const response = await fetch(url, { headers: notionHeaders(token) });

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

export async function fetchNotionItems(config: CMS2MDConfig): Promise<CMSItem[]> {
  const databaseId = config.collection;
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: notionHeaders(config.token),
    body: JSON.stringify({ page_size: config.limit || 100 })
  });

  if (!response.ok) {
    throw new Error(`Notion API Error (${response.status}): ${response.statusText}`);
  }

  const json: any = await response.json();
  const results = json.results || [];

  const items: CMSItem[] = [];

  for (const page of results) {
    const properties = page.properties || {};
    const item: CMSItem = { id: page.id, created_at: page.created_time, updated_at: page.last_edited_time };

    for (const [key, prop] of Object.entries<any>(properties)) {
      if (prop.type === 'title' && prop.title && prop.title[0]) {
        item.title = prop.title[0].plain_text;
        item[key] = item.title;
      } else if (prop.type === 'rich_text' && prop.rich_text && prop.rich_text[0]) {
        item[key] = prop.rich_text[0].plain_text;
      } else if (prop.type === 'select' && prop.select) {
        item[key] = prop.select.name;
      }
    }

    // Fetch and convert the actual page body (block children) — properties alone are just metadata.
    item.content = await fetchPageMarkdown(page.id, config.token);

    items.push(item);
  }

  return items;
}
