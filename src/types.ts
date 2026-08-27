export interface CMS2MDConfig {
  cms: 'directus' | 'notion';
  endpoint: string;
  token?: string;
  collection: string;
  outputDir: string;
  filenameField?: string; // e.g. "slug" or "id"
  statusFilter?: string; // e.g. "published"
  limit?: number;
  downloadAssets?: boolean;
  assetsDir?: string;
  licenseKey?: string;
}

export interface CMSItem {
  id: string | number;
  title?: string;
  slug?: string;
  content?: string;
  body?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  conflicts: number;
  isPro: boolean;
}
