# 📦 CMS2MD: Directus & Notion to Markdown Sync Engine

[![npm version](https://img.shields.io/npm/v/cms2md.svg)](https://www.npmjs.com/package/cms2md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support on Polar](https://img.shields.io/badge/Support_CMS2MD-Polar-0066FF.svg?style=flat-square&logo=polar)](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)
[![Created by abteilung83](https://img.shields.io/badge/Crafted%20by-abteilung83-black.svg)](https://github.com/aeon022)

**CMS2MD** is a zero-config CLI tool and Node.js sync engine developed by **abteilung83**. It fetches content from **Directus** or **Notion** and converts items into clean, git-versioned Markdown files with YAML frontmatter for **Next.js**, **Astro**, **Nuxt**, and **Hugo** static sites.

---

## 🚀 Quickstart & Tutorial

Follow this 2-minute step-by-step tutorial to get your headless CMS synced into local Markdown files.

### Step 1: Install CMS2MD
Install globally via npm or run directly with `npx`:

```bash
npm install -g cms2md
```

### Step 2: Initialize Configuration
Generate an example `cms2md.config.json` in your static site project root:

```bash
cms2md init
```

This creates a `cms2md.config.json` file:
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

### Step 3: Run Sync
Synchronize items from Directus / Notion to local Markdown files:

```bash
cms2md sync
```

Or pass configuration flags directly via CLI without a config file:
```bash
cms2md sync --cms directus --endpoint https://your-directus-instance.com --token YOUR_TOKEN --collection articles --output ./src/content/blog
```

---

## ✨ Features

- 🔄 **Directus & Notion Adapters**: Fetch articles, posts, and documentation directly via REST APIs.
- 📝 **HTML-to-Markdown Conversion**: Uses `turndown` to transform rich text / HTML into clean Markdown.
- ⚡ **SHA-256 Checksum Diffing**: Avoids overwriting unchanged files, preserving file modification timestamps (`mtime`).
- 🏷️ **YAML Frontmatter Injection**: Formats slugs, dates, tags, and custom metadata automatically.
- 🚀 **Git & CI/CD Ready**: Perfect for GitHub Actions to build static sites whenever CMS content updates.
- 🔑 **Polar.sh Pro License**: Unlock unlimited items & asset downloading via Polar checkout.

---

## 💜 Pro License & Support

Support further development and unlock **unlimited item sync** and **asset downloading**!

👉 **[Support & Unlock Pro on Polar](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)**

---

## 🏢 About abteilung83

**CMS2MD** is engineered and maintained by **abteilung83** — specializing in modern web architecture, headless CMS integrations, static site generator workflows, and developer tools.

- **GitHub**: [@aeon022](https://github.com/aeon022)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
