# Architecture

## Summary

| Layer | Choice |
| --- | --- |
| Generator | Astro 7 (static output, zero server runtime) |
| Theme base | fork of `satnaing/astro-paper` v7.2.0, MIT |
| Styling | Tailwind CSS 4 + `@tailwindcss/typography` |
| Content | Markdown/MDX files in `src/content/posts`, validated by a Zod schema |
| Search | Pagefind, index generated at build time |
| Social images | satori + sharp, one PNG per post at build time |
| Hosting | Cloudflare Pages (direct upload), domain on Cloudflare |
| CI/CD | GitHub Actions: lint → type check → build → test → deploy → verify |
| Runtime dependencies | none (no API, no database, no auth) |

## Why this stack

The previous site was a 311-line Python generator (`build.py`) that emitted HTML
from Markdown with a regex subset parser, deployed by running a shell script on
the homelab and serving the output from an nginx container behind a Cloudflare
tunnel. It had no syntax highlighting, tags, categories, search, table of
contents, Open Graph images, or structured data, and publishing required shell
access to one machine. `docs/AUDIT.md` records the full comparison against
`astro-theme-cactus` and `hugo-PaperMod`.

Astro was chosen because it produces static HTML with no client framework, ships
the features the brief requires as maintained upstream code (Pagefind search,
ToC, dynamic OG images, archives, tags, reading progress), and keeps content as
plain Markdown in Git. The upstream theme is forked rather than vendored as a
package so the design, content model and SEO layers can be changed without
patching around a dependency.

## Rendering pipeline

1. `astro check` validates TypeScript and `.astro` files.
2. `astro build` renders every route to `dist/`: home, paginated post list, each
   post, category index and category pages, tag index and tag pages, archive,
   search shell, about, 404, RSS, sitemap, robots, `og.png`, and one OG PNG per
   post.
3. `pagefind --site dist` builds the static search index into `dist/pagefind/`.
4. `scripts/postbuild.mjs` writes `dist/_redirects`, emits legacy `.html` stubs
   for the pre-migration article URLs, and fails the build if a required
   artifact (index, 404, OG image, RSS, sitemap, robots, search index, redirects,
   per-post page and OG image, canonical and JSON-LD on the home page) is
   missing.

Everything in that list runs in CI on every pull request, so a broken artifact
cannot reach production.

## Content model

`src/content.config.ts` defines two collections:

- `posts` — `title`, `description`, `pubDatetime`, optional `modDatetime`,
  `author`, `category` (enum), `tags`, optional `featured`, `draft`, `ogImage`,
  `canonicalURL`, `hideToc`, `hideEditPost`, `timezone`.
- `pages` — standalone pages such as `about`, with `title`, `description`,
  optional `ogImage` and `canonicalURL`.

The `category` enum is the fixed taxonomy in `src/utils/categories.ts`
(Backend Engineering, Database Engineering, DevOps & Infrastructure, AI
Engineering, Security Engineering, Open Source, Engineering Notes). It drives
`/categories/` and `/categories/<slug>/`, the header navigation and the
breadcrumb trail. Free-form labels stay in `tags`.

Derived data is computed at build time, never stored: reading time from the
Markdown body, related posts from shared tags and category, tag pages from the
collected tag set.

## URL strategy

| URL | Source |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/posts/` | paginated collection, `src/pages/posts/[...page].astro` |
| `/posts/<slug>/` | `src/pages/posts/[...slug]/index.astro` |
| `/posts/<slug>/index.png` | generated social card |
| `/categories/`, `/categories/<slug>/` | category index and paginated category |
| `/tags/`, `/tags/<tag>/` | tag index and paginated tag |
| `/archives/` | year-grouped archive |
| `/about/` | `src/content/pages/about.md` |
| `/search/` | Pagefind shell |
| `/rss.xml`, `/sitemap-index.xml`, `/robots.txt`, `/og.png` | generated |

Legacy compatibility (301 via `_redirects`, plus a static stub for hosts without
`_redirects` support):

```
/posts/<slug>.html   -> /posts/<slug>/
/feed.xml            -> /rss.xml
/sitemap.xml         -> /sitemap-index.xml
/posts               -> /posts/
```

## Design system

Tokens live in `src/styles/theme.css` and are registered as Tailwind utilities:

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#fbfaf8` warm paper | `#0f1217` slate ink |
| `--foreground` | `#16181d` | `#e7e9ec` |
| `--accent` | `#9c3d18` rust | `#e8a06f` amber |
| `--muted` | `#efece5` | `#1a2029` |
| `--muted-foreground` | `#5b626d` | `#99a3b1` |
| `--border` | `#e2ddd3` | `#242c36` |

Typography is a three-way pairing, all self-hosted at build time by the Astro
Fonts API (no request to Google Fonts at runtime):

- Headings: Newsreader (serif), weight 500, tightened tracking.
- Body and UI: Inter.
- Code and metadata: JetBrains Mono.

Layout is a single 768px column (`max-w-app`) with a full-width header rule and a
three-column footer (identity, navigation, socials and licence). Cards carry
category, date, reading time and tags; article pages carry a breadcrumb, reading
progress bar, table of contents, copy-code buttons, an accessible image lightbox,
share links, related posts and previous/next navigation.

Accessibility is enforced, not assumed: the Playwright suite runs axe with the
WCAG 2.0/2.1/2.2 A and AA tag sets on ten routes, and the palette was adjusted
until it reported zero serious violations in both themes (including code comment
tokens, which the stock dark theme renders below 4.5:1).

## Decisions and trade-offs

- **Static over server.** No database, no API, no auth — matching the brief and
  removing an entire class of operational work.
- **Cloudflare Pages over the homelab nginx container.** GitHub Actions cannot
  deploy to a container behind a private tunnel without exposing SSH or adding a
  pull worker. Cloudflare already terminates DNS and TLS for the domain, so
  Pages keeps the same provider, adds atomic deploys and instant rollback, and
  removes a single-point-of-failure. The homelab stack is retained as a rollback
  path (see `docs/DEPLOYMENT.md`).
- **Committed diagrams.** Mermaid sources live in `src/diagrams/` and are
  rendered to SVG/PNG by `pnpm diagrams`, then committed. CI therefore needs no
  browser, and the image a reader sees is the one that was reviewed.
- **Redirects generated from content.** `postbuild.mjs` derives the legacy
  `/posts/<slug>.html` list from the content directory, so a new article
  automatically keeps its old URL working without anyone editing a redirect
  table.
