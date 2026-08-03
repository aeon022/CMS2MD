# 📦 CMS2MD: Directus & Notion to Markdown Sync Engine (CLI)

**CMS2MD** is a zero-config CLI tool and Node module that syncs Directus collections and Notion databases into clean, git-versioned Markdown files with YAML frontmatter, specifically designed for Next.js, Astro, Nuxt, and Hugo static sites.

---

## 🏗️ Architecture & Component Breakdown

```
CMS2MD/
├── src/
│   ├── index.ts               # CLI entry point (Commander)
│   ├── config.ts              # Load cms2md.config.json or .env
│   ├── adapters/
│   │   ├── directus.ts        # Directus REST API fetcher & schema mapping
│   │   └── notion.ts          # Notion API block-to-markdown converter
│   ├── transformer/
│   │   ├── htmlToMd.ts        # HTML/Rich Text to Markdown converter
│   │   └── frontmatter.ts     # YAML frontmatter builder
│   ├── syncEngine.ts          # File writer with sha256 diffing & deletion tracking
│   └── license.ts             # Polar.sh license key validator
├── tests/
│   └── sync.test.ts
├── cms2md.config.example.json
├── package.json
├── tsconfig.json
├── README.md
└── OUTLINE.md
```

---

## ⚡ Core Features

1. **Directus & Notion Support**: Pulls articles, blog posts, documentation, and metadata directly via REST APIs.
2. **Smart Diffing**: Calculates SHA-256 hashes of items to prevent rewriting unchanged files (preserves `mtime`).
3. **YAML Frontmatter Injection**: Formats slugs, dates, tags, authors, and custom fields automatically.
4. **Git-Friendly**: Perfect for CI/CD pipelines (GitHub Actions) to auto-build static websites when CMS content changes.

---

## 💰 Monetization Plan (Polar.sh Integration)

- **Free / Open Source**: Syncs 1 collection / up to 25 items per run.
- **Pro License ($29 One-time via Polar)**:
  - Unlimited collections & items.
  - Image / Asset auto-downloader (downloads CMS images to local `public/images` folder and updates markdown image links).
  - Incremental sync & webhook receiver daemon (`cms2md watch`).
