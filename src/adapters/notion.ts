import fetch from 'node-fetch';
import { CMSItem, CMS2MDConfig } from '../types';

export async function fetchNotionItems(config: CMS2MDConfig): Promise<CMSItem[]> {
  const databaseId = config.collection;
  const url = `https://api.notion.com/v1/databases/${databaseId}/query`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
    'Authorization': `Bearer ${config.token}`
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page_size: config.limit || 100 })
  });

  if (!response.ok) {
    throw new Error(`Notion API Error (${response.status}): ${response.statusText}`);
  }

  const json: any = await response.json();
  const results = json.results || [];

  return results.map((page: any) => {
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

    return item;
  });
}
