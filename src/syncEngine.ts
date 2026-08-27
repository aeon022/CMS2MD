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

    // State from the last successful sync: filename -> hash of the content cms2md wrote.
    // Used to tell "CMS changed" apart from "user hand-edited the local file" before overwriting.
    const stateFilePath = path.join(outputDir, '.cms2md-sync-state.json');
    let syncState: Record<string, string> = {};
    if (await fs.pathExists(stateFilePath)) {
      try {
        syncState = await fs.readJson(stateFilePath);
      } catch {
        syncState = {}; // corrupt/unreadable state file — fall back to "no prior record" (safe default)
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let conflicts = 0;

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

        const stateKey = `${sanitizedFilename}.md`;
        const filePath = path.join(outputDir, stateKey);
        const { fullContent } = convertToMarkdown(item);
        const newHash = calculateHash(fullContent);

        if (await fs.pathExists(filePath)) {
          const existingContent = await fs.readFile(filePath, 'utf8');
          const existingHash = calculateHash(existingContent);

          if (existingHash === newHash) {
            skipped++;
            continue;
          }

          const lastSyncedHash = syncState[stateKey];
          // No prior record = nothing to protect = safe to write normally (e.g. first sync,
          // or a pre-existing file that predates cms2md tracking it).
          const editedSinceLastSync = lastSyncedHash !== undefined && lastSyncedHash !== existingHash;

          if (editedSinceLastSync) {
            const conflictPath = `${filePath}.new`;
            await fs.writeFile(conflictPath, fullContent, 'utf8');
            conflicts++;
            console.warn(`  ⚠ Local edit detected — CMS changes NOT applied: ${stateKey}`);
            console.warn(`    Your local edit was preserved. Incoming CMS content saved to: ${stateKey}.new`);
            console.warn(`    Review and merge manually, then re-run sync.`);
            continue; // don't touch the local file or its recorded hash
          }

          await fs.writeFile(filePath, fullContent, 'utf8');
          syncState[stateKey] = newHash;
          updated++;
          console.log(`  ✓ Updated: ${stateKey}`);
        } else {
          await fs.writeFile(filePath, fullContent, 'utf8');
          syncState[stateKey] = newHash;
          created++;
          console.log(`  + Created: ${stateKey}`);
        }
      } catch (err: any) {
        errors++;
        console.error(`  ✗ Error syncing item ${item.id}: ${err.message}`);
      }
    }

    await fs.writeJson(stateFilePath, syncState, { spaces: 2 });

    return {
      total: items.length,
      created,
      updated,
      skipped,
      errors,
      conflicts,
      isPro
    };
  }
}
