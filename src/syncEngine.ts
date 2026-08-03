import * as fs from 'fs-extra';
import * as path from 'path';
import { CMS2MDConfig, CMSItem, SyncResult } from './types';
import { fetchDirectusItems } from './adapters/directus';
import { fetchNotionItems } from './adapters/notion';
import { convertToMarkdown } from './utils/htmlToMd';
import { calculateHash } from './utils/diff';
import { validatePolarLicense } from './license';

export class SyncEngine {
  private config: CMS2MDConfig;

  constructor(config: CMS2MDConfig) {
    this.config = config;
  }

  public async run(): Promise<SyncResult> {
    const licenseCheck = await validatePolarLicense(this.config.licenseKey);
    console.log(`[CMS2MD] License Status: ${licenseCheck.message}`);

    const isPro = licenseCheck.valid;
    const itemLimit = isPro ? (this.config.limit || 1000) : 25;

    console.log(`[CMS2MD] Fetching items from ${this.config.cms.toUpperCase()}...`);
    let items: CMSItem[] = [];

    if (this.config.cms === 'directus') {
      items = await fetchDirectusItems({ ...this.config, limit: itemLimit });
    } else if (this.config.cms === 'notion') {
      items = await fetchNotionItems({ ...this.config, limit: itemLimit });
    } else {
      throw new Error(`Unsupported CMS adapter: ${this.config.cms}`);
    }

    if (!isPro && items.length > 25) {
      console.log(`[CMS2MD] Free Tier Limit: Processing first 25 items (Upgrade to Pro for unlimited items).`);
      items = items.slice(0, 25);
    }

    const outputDir = path.resolve(this.config.outputDir);
    await fs.ensureDir(outputDir);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const filenameKey = this.config.filenameField && item[this.config.filenameField]
          ? String(item[this.config.filenameField])
          : (item.slug || item.id || `item_${Date.now()}`);

        const sanitizedFilename = String(filenameKey)
          .toLowerCase()
          .replace(/[/\\?%*:|"<>]/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const filePath = path.join(outputDir, `${sanitizedFilename}.md`);
        const { fullContent } = convertToMarkdown(item);
        const newHash = calculateHash(fullContent);

        if (await fs.pathExists(filePath)) {
          const existingContent = await fs.readFile(filePath, 'utf8');
          const existingHash = calculateHash(existingContent);

          if (existingHash === newHash) {
            skipped++;
            continue;
          }

          await fs.writeFile(filePath, fullContent, 'utf8');
          updated++;
          console.log(`  ✓ Updated: ${sanitizedFilename}.md`);
        } else {
          await fs.writeFile(filePath, fullContent, 'utf8');
          created++;
          console.log(`  + Created: ${sanitizedFilename}.md`);
        }
      } catch (err: any) {
        errors++;
        console.error(`  ✗ Error syncing item ${item.id}: ${err.message}`);
      }
    }

    return {
      total: items.length,
      created,
      updated,
      skipped,
      errors,
      isPro
    };
  }
}
