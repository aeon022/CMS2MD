#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SyncEngine } from './syncEngine';
import { CMS2MDConfig } from './types';

const program = new Command();

program
  .name('cms2md')
  .description('Zero-config Directus & Notion to Markdown Sync Engine for Next.js, Astro & Hugo')
  .version('0.1.0');

// Init Command
program
  .command('init')
  .description('Generate example cms2md.config.json configuration file')
  .action(async () => {
    const configPath = path.resolve(process.cwd(), 'cms2md.config.json');
    const defaultConfig: CMS2MDConfig = {
      cms: 'directus',
      endpoint: 'https://directus.example.com',
      token: 'YOUR_DIRECTUS_STATIC_TOKEN',
      collection: 'articles',
      outputDir: './content/articles',
      filenameField: 'slug',
      statusFilter: 'published',
      licenseKey: 'polar_cl_YOUR_POLAR_KEY'
    };

    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    console.log(`[CMS2MD] Created configuration file: ${configPath}`);
  });

// Sync Command
program
  .command('sync')
  .description('Synchronize CMS items into local Markdown files')
  .option('-c, --config <path>', 'Path to config file', 'cms2md.config.json')
  .option('--cms <type>', 'CMS type: directus or notion')
  .option('-e, --endpoint <url>', 'CMS API Endpoint')
  .option('-t, --token <token>', 'API Auth Token')
  .option('-col, --collection <name>', 'Collection name or Notion Database ID')
  .option('-o, --output <dir>', 'Output directory for Markdown files')
  .option('-l, --license <key>', 'Polar.sh Pro License Key')
  .action(async (options) => {
    try {
      let config: CMS2MDConfig;
      const configPath = path.resolve(process.cwd(), options.config);

      if (await fs.pathExists(configPath)) {
        const fileContent = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(fileContent);
      } else {
        config = {
          cms: options.cms || 'directus',
          endpoint: options.endpoint || '',
          token: options.token,
          collection: options.collection || 'articles',
          outputDir: options.output || './content',
          licenseKey: options.license
        };
      }

      // Override with CLI flags if passed
      if (options.cms) config.cms = options.cms;
      if (options.endpoint) config.endpoint = options.endpoint;
      if (options.token) config.token = options.token;
      if (options.collection) config.collection = options.collection;
      if (options.output) config.outputDir = options.output;
      if (options.license) config.licenseKey = options.license;

      if (!config.endpoint && config.cms === 'directus') {
        console.error('[CMS2MD] Error: Missing CMS endpoint. Provide via config file or --endpoint flag.');
        process.exit(1);
      }

      const engine = new SyncEngine(config);
      const result = await engine.run();

      console.log('\n[CMS2MD] Sync Summary:');
      console.log(`  Total Processed : ${result.total}`);
      console.log(`  Created         : ${result.created}`);
      console.log(`  Updated         : ${result.updated}`);
      console.log(`  Skipped (Diff)  : ${result.skipped}`);
      console.log(`  Conflicts (Local Edits) : ${result.conflicts}`);
      console.log(`  Errors          : ${result.errors}`);
      console.log(`  Pro Mode        : ${result.isPro ? 'ENABLED ✓' : 'DISABLED (Free Tier)'}\n`);

      if (result.conflicts > 0) {
        console.log(`⚠ ${result.conflicts} file(s) had local edits — incoming CMS content was saved to *.md.new instead of overwriting. Review and merge manually.\n`);
      }

      if (!result.isPro) {
        console.log('💡 Support development & unlock unlimited items: https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH');
      }
    } catch (err: any) {
      console.error(`[CMS2MD] Fatal Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
