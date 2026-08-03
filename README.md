# 📦 CMS2MD: Directus & Notion to Markdown Sync Engine

[![npm version](https://img.shields.io/npm/v/cms2md.svg)](https://www.npmjs.com/package/cms2md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support on Polar](https://img.shields.io/badge/Support_CMS2MD-Polar-0066FF.svg?style=flat-square&logo=polar)](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)

**CMS2MD** is a zero-config CLI tool and Node.js sync engine that fetches content from **Directus** or **Notion** and converts items into clean, git-versioned Markdown files with YAML frontmatter for **Next.js**, **Astro**, **Nuxt**, and **Hugo** static sites.

---

## ✨ Features

- 🔄 **Directus & Notion Adapters**: Fetch articles, posts, and documentation directly via REST APIs.
- 📝 **HTML-to-Markdown Conversion**: Uses `turndown` to transform rich text / HTML into clean Markdown.
- ⚡ **SHA-256 Checksum Diffing**: Avoids overwriting unchanged files, preserving file modification timestamps (`mtime`).
- 🏷️ **YAML Frontmatter Injection**: Formats slugs, dates, tags, and custom metadata automatically.
- 🚀 **Git & CI/CD Ready**: Perfect for GitHub Actions to build static sites whenever CMS content updates.
- 🔑 **Polar.sh Pro License**: Unlock unlimited items & asset downloading via Polar checkout.

---

## 🚀 Quick Start

### 1. Installation
Install globally or run via `npx`:

```bash
npm install -g cms2md
```

### 2. Initialize Configuration
Generate an example `cms2md.config.json` in your project root:

```bash
cms2md init
```

Example `cms2md.config.json`:
```json
{
  "cms": "directus",
  "endpoint": "https://your-directus-instance.com",
  "token": "YOUR_DIRECTUS_STATIC_TOKEN",
  "collection": "articles",
  "outputDir": "./content/articles",
  "filenameField": "slug",
  "statusFilter": "published",
  "licenseKey": "polar_cl_YOUR_POLAR_KEY"
}
```

### 3. Run Sync
Synchronize items from Directus / Notion to local Markdown files:

```bash
cms2md sync
```

Or pass parameters via CLI flags directly:
```bash
cms2md sync --cms directus --endpoint https://your-directus.com --collection articles --output ./content/posts
```

---

## 💜 Pro License & Support

Support further development and unlock **unlimited item sync** and **asset downloading**!

👉 **[Support & Unlock Pro on Polar](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)**

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
