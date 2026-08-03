# 📦 CMS2MD — Comprehensive Tutorial & How-To Guide

Welcome to the **CMS2MD** tutorial! This guide covers real-world setup recipes, Directus and Notion sync workflows, SHA-256 diffing, and GitHub Actions CI/CD integration for Next.js, Astro, Nuxt, and Hugo static sites.

---

## 📚 Table of Contents

1. [Quick Installation](#1-quick-installation)
2. [Workflow 1: Syncing Directus Collections to Astro/Next.js](#workflow-1-syncing-directus-collections-to-astronextjs)
3. [Workflow 2: Syncing Notion Databases](#workflow-2-syncing-notion-databases)
4. [Workflow 3: Configuring Custom Filename Fields & Status Filters](#workflow-3-configuring-custom-filename-fields--status-filters)
5. [Workflow 4: Automated CI/CD Sync via GitHub Actions](#workflow-4-automated-cicd-sync-via-github-actions)
6. [Pro License Activation](#pro-license-activation)

---

## 1. Quick Installation

Install CMS2MD globally via npm:

```bash
npm install -g cms2md
```

Or run via `npx`:

```bash
npx cms2md sync --help
```

---

## Workflow 1: Syncing Directus Collections to Astro/Next.js

### Step 1: Create Configuration File
Run `cms2md init` in your static site root:

```bash
cms2md init
```

Edit `cms2md.config.json`:
```json
{
  "cms": "directus",
  "endpoint": "https://your-directus-instance.com",
  "token": "YOUR_DIRECTUS_STATIC_TOKEN",
  "collection": "articles",
  "outputDir": "./src/content/blog",
  "filenameField": "slug",
  "statusFilter": "published"
}
```

### Step 2: Run Sync
```bash
cms2md sync
```

CMS2MD fetches published articles from Directus, converts HTML content into Markdown via `turndown`, injects YAML frontmatter, and calculates SHA-256 checksums to avoid overwriting unchanged files.

---

## Workflow 2: Syncing Notion Databases

To sync a Notion database:

1. Create an integration token in Notion ([notion.so/my-integrations](https://www.notion.so/my-integrations)).
2. Share your Notion database with the integration.
3. Configure `cms2md.config.json`:

```json
{
  "cms": "notion",
  "token": "secret_YOUR_NOTION_TOKEN",
  "collection": "YOUR_NOTION_DATABASE_ID",
  "outputDir": "./content/posts"
}
```

Run sync:
```bash
cms2md sync
```

---

## Workflow 3: Configuring Custom Filename Fields & Status Filters

You can pass configuration parameters directly via CLI flags without a config file:

```bash
cms2md sync \
  --cms directus \
  --endpoint https://your-directus.com \
  --token YOUR_TOKEN \
  --collection products \
  --output ./content/products
```

---

## Workflow 4: Automated CI/CD Sync via GitHub Actions

To automatically sync CMS content and rebuild your static site on GitHub Actions, add `.github/workflows/sync-cms.yml`:

```yaml
name: Sync CMS & Rebuild Site

on:
  schedule:
    - cron: '0 * * * *' # Run hourly
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install & Run CMS2MD
        run: |
          npm install -g cms2md
          cms2md sync --config cms2md.config.json
        env:
          POLAR_LICENSE_KEY: ${{ secrets.POLAR_LICENSE_KEY }}

      - name: Commit Updated Markdown Files
        uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "chore: sync content from CMS via CMS2MD [skip ci]"
```

---

## Pro License Activation

Unlock unlimited item sync and asset downloading by activating your Polar license key:

```json
{
  "licenseKey": "polar_cl_YOUR_POLAR_KEY"
}
```

👉 **[Get Pro License on Polar](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)**

---

Crafted with 💜 by **abteilung83**.
