import fetch from 'node-fetch';
import { CMSItem, CMS2MDConfig } from '../types';

export async function fetchDirectusItems(config: CMS2MDConfig): Promise<CMSItem[]> {
  const baseUrl = config.endpoint.replace(/\/+$/, '');
  let url = `${baseUrl}/items/${config.collection}?limit=${config.limit || 100}`;

  if (config.statusFilter) {
    url += `&filter[status][_eq]=${encodeURIComponent(config.statusFilter)}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Directus API Error (${response.status}): ${response.statusText}`);
  }

  const json: any = await response.json();
  const data = json.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}
