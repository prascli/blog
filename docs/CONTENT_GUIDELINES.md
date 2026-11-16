# Content guidelines

Publishing is a Markdown file and a pull request. Nothing else.

## 1. Create the file

`src/content/posts/<slug>.md` — the filename is the URL: `postgres-performance.md`
becomes `/posts/postgres-performance/`. Use lowercase words separated by hyphens.

## 2. Frontmatter

```yaml
---
title: "PostgreSQL Performance Optimization"
description: "Practical techniques for finding and fixing slow queries, with measurements."
pubDatetime: 2026-11-16T09:00:00+07:00
updatedDatetime: 2026-11-20T10:00:00+07:00   # optional, renders "Updated"
author: "Indra Prasetya"
category: "database-engineering"
tags:
  - PostgreSQL
  - Performance
featured: false
draft: false
---
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Rendered as the single `h1`; also used in `<title>`, OG and JSON-LD |
| `description` | yes | 120–160 characters; used for meta description, cards and OG image |
| `pubDatetime` | yes | ISO 8601 with offset, e.g. `2026-11-16T09:00:00+07:00` |
| `modDatetime` | no | Shows "Updated" and drives `dateModified` in JSON-LD |
| `author` | no | Defaults to the site author |
| `category` | yes | One of the seven fixed slugs below |
| `tags` | no | Free-form; drives tag pages, related posts and article keywords |
| `featured` | no | Pinned to the homepage "Featured" block |
| `draft` | yes in practice | `true` keeps the post out of lists, RSS, sitemap and search |
| `ogImage` | no | A file in `public/`; otherwise a card is generated per post |
| `hideToc` | no | Suppresses the table of contents for a single post |
| `hideEditPost` | no | Hides the "Edit page" link |

Categories (enum in `src/utils/categories.ts`):

```
backend-engineering          Backend Engineering
database-engineering         Database Engineering
devops-and-infrastructure    DevOps & Infrastructure
ai-engineering               AI Engineering
security-engineering         Security Engineering
open-source                  Open Source
engineering-notes            Engineering Notes
```

An unknown category fails the build with a Zod error, which is deliberate: the
taxonomy is part of the publication's navigation, not a free-text field.

## 3. Write

Markdown is supported with MDX available if a post needs a component. Available
out of the box: headings with anchors, tables, fenced code with syntax
highlighting and a copy button, callouts (`> [!NOTE]`), footnotes, images with an
accessible lightbox, task lists.

Conventions that keep the publication consistent:

- One `h1` per article, supplied by the template. Start body headings at `##`.
- Lead with the problem and the measurement, not with background.
- Every number must be reproducible: name the command, the tool, or the source.
- Prefer short paragraphs and a diagram over a wall of prose.
- Link to related articles in this journal where it is genuinely useful; the
  internal-links test will catch a typo that breaks a URL.
- No tracking pixels, no embedded third-party scripts.

## 4. Diagrams

Mermaid sources live in `src/diagrams/` and are rendered ahead of time:

```bash
# 1. write src/diagrams/<slug>-0.mmd
# 2. render (needs a Chrome binary; PUPPETEER_EXECUTABLE_PATH if it is not found)
pnpm diagrams
# 3. reference the committed asset from the article
```

```html
<figure>
  <img src="/diagrams/<slug>-0.svg" alt="Describe the flow in one sentence."
       width="477" height="741" loading="lazy" decoding="async">
  <figcaption>One line, two readers, two different meanings.</figcaption>
</figure>
```

`pnpm diagrams` prints the intrinsic size of each diagram; use those numbers so
the browser reserves space and the article does not shift while loading. Sources
and rendered files are both committed, so CI never needs a browser and what was
reviewed is what ships.

## 5. Review before merging

- [ ] Frontmatter complete, `category` valid, `draft: false` only when ready.
- [ ] `pnpm build` passes (schema validation, type check, artifact checks).
- [ ] `pnpm test` passes (routes, SEO metadata, links, behaviour, axe).
- [ ] Claims, numbers and pull-request references are correct and traceable.
- [ ] No fabricated benchmarks, no invented experience.
- [ ] Slug matches the filename; the legacy `.html` URL is generated
      automatically, so do not hand-edit redirects.

## 6. Publish

Commit, push, open a pull request. CI must be green. Merging to `main` deploys to
Cloudflare Pages and runs `scripts/verify-production.mjs` against the live
domain, which fails the workflow if a public route, its canonical, its structured
data, the feed, the sitemap, the robots file, or a legacy redirect is broken.

## 7. After publishing

- Submit the new URL through Google Search Console if it is time-sensitive.
- Cross-posting to dev.to is fine; set `canonical_url` to the article's URL here.
- If a post gets corrected materially, set `modDatetime` and keep the original
  claim visible with a note, rather than silently rewriting history.
