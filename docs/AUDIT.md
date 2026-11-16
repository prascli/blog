# Initial audit and implementation plan

Status: completed before any production change.
Date: 2026-11-16.
Scope: `https://blog.qansa.web.id/` and the local repository that produced it
(`/home/apps/blog`).

## 1. What was in production

| Item | Observed value |
| --- | --- |
| Framework | none. Hand-written Python generator (`build.py`, 311 lines) |
| Output | static HTML in `site/`, served by an `nginx:alpine` container on `127.0.0.1:8090` |
| Edge | Cloudflare (proxied CNAME to `393ffb05-...cfargotunnel.com`, tunnel `cloudflared` on the homelab) |
| Content | 2 Markdown files in `content/` (`why-this-blog-exists.md`, `hidden-text-in-agent-instruction-files.md`) |
| Publishing | manual: edit file, run `./redeploy.sh` on the homelab |
| Version control | local git repository only. No remote. `master` had uncommitted changes and no CI |
| Templates | one 235-line `PAGE` string in `build.py`; all CSS inline in `<style>` |
| RSS | `/feed.xml` (RSS 2.0, no `pubDate`, no `guid`) |
| Sitemap | `/sitemap.xml`, `<loc>` only |
| Markdown support | headings, paragraphs, fenced code, lists, blockquotes, bold, italic, inline code, links |
| Mermaid | rendered at build time by `npx @mermaid-js/mermaid-cli` + Puppeteer + a local Chrome |

### Measured gaps against the brief

Probed the built output (`grep` over `site/`):

- `og:image` 0 files, `twitter:` 0 files: no social preview image, no Twitter/X cards.
- `application/ld+json` 0 files: no structured data at all (no Article, Person, Organization, Breadcrumb).
- Highlighting 0 files: fenced code is escaped plain text, no syntax colours, no copy button.
- Tags 0 files, categories 0 files, ToC 0 files, archive 0 files, search 0 files, related posts 0.
- Dark/light mode: `prefers-color-scheme` only, no user toggle, no persistence.
- No reading time, no reading progress, no pagination, no prev/next, no share links.
- No tables, footnotes, callouts, MDX, or heading anchors; the parser is a 70-line regex subset.
- Publishing requires homelab access; a GitHub-only workflow is impossible today because
  there is no remote, no CI, and the build needs a local Chrome for diagrams.

## 2. Options considered

Data pulled from the GitHub API on 2026-11-16.

| Candidate | Stars / forks | Last push | Latest release | License | Stack |
| --- | --- | --- | --- | --- | --- |
| `satnaing/astro-paper` | 5,212 / 1,129 | 2026-11-15 | v7.2.0 (2026-11-15) | MIT | Astro 7, Tailwind 4, Pagefind, satori |
| `chrismwilliams/astro-theme-cactus` | 1,750 / 279 | 2026-11-01 | v8.3.0 (2026-09-18) | MIT | Astro, Tailwind |
| `adityatelange/hugo-PaperMod` | 14,043 / 3,431 | 2026-10-25 | v8.0 (2024-11-03) | MIT | Hugo (Go), no JS build |

Evaluation against the brief:

| Criterion | astro-paper | cactus | hugo-PaperMod |
| --- | --- | --- | --- |
| Migration cost from current content | low (Markdown) | low | low |
| Built-in search | yes (Pagefind, static index) | no | no |
| Table of contents | yes | no | partial |
| Dynamic OG images | yes (satori, per post) | no | no |
| Tags / archive / pagination | yes | tags only | yes |
| Dark mode toggle | yes | yes | yes |
| Reading progress, copy code | yes | partial | partial |
| Maintenance signal | release same day as audit | last release 2 months ago | last release 2 years ago |
| Build toolchain | Node 22+, one `pnpm build` | Node | Hugo binary in CI |
| Attribution | MIT | MIT | MIT |

Decision: **fork `satnaing/astro-paper` v7.2.0**. It is the only candidate that ships
search, ToC, dynamic OG images, archives, tags and reading progress as maintained
upstream code, so the custom work stays inside branding, content model, category
navigation, structured data and the legacy URL layer. Hugo would have meant a second
toolchain (Go) for no functional gain; cactus would have meant writing search, ToC and
OG generation from scratch.

Rejected alternative (recorded for completeness): keep `build.py` and bolt features on.
It would have meant owning a Markdown parser, a highlighter, an OG image generator and a
search index, which is precisely the "custom CMS" the brief forbids in spirit.

## 3. Hosting decision

Today the site is a container bind-mount on the homelab behind a Cloudflare tunnel. That
path cannot be driven by GitHub Actions without either exposing SSH or adding a pull
worker, and it makes the publication depend on one machine being up.

Decision: **Cloudflare Pages, direct upload from GitHub Actions**, with GitHub as the only
source of truth. Cloudflare is already the existing edge for `qansa.web.id` (DNS, TLS,
proxy, tunnel), so this reuses the provider rather than adding infrastructure, and it
removes the last container from the publishing path. Rollback is a DNS record plus the
previous Pages deployment.

The homelab container and `build.py` stay untouched as the rollback path until the new
production is verified; see `docs/DEPLOYMENT.md`.

## 4. URL compatibility

Existing article URLs: `/posts/<slug>.html`, plus `/feed.xml`, `/sitemap.xml`, `/robots.txt`.

The new site keeps `/posts/<slug>/` as the canonical form (trailing-slash directory
output, which is what Astro and Pagefind expect) and serves **301 redirects** for every
legacy path, generated from the content collection at build time:

- `/posts/<slug>.html` -> `/posts/<slug>/`
- `/feed.xml` -> `/rss.xml`
- `/sitemap.xml` -> `/sitemap-index.xml`

A static HTML redirect stub is emitted at each legacy `.html` path as well, so the same
output behaves correctly on a host without `_redirects` support.

## 5. Implementation plan

1. Repository: fork the theme into `prascli/blog`, strip demo content, keep MIT licence
   and upstream attribution.
2. Content model: `category` added to the post schema (7 fixed categories), existing
   tags kept; both articles migrated with their original text unchanged.
3. Design: warm-paper light theme, ink dark theme, serif display headings, sans body,
   mono code; editorial homepage, category navigation, author page, footer with the
   Qansa affiliation.
4. Features: search, categories, tags, archive, ToC, reading time, reading progress,
   copy code, lightbox, related posts, prev/next, share links, RSS, sitemap, robots.
5. SEO: canonical URLs, OG and Twitter cards, per-post dynamic OG images, Article,
   Person, Organization, WebSite and BreadcrumbList JSON-LD, semantic headings, internal
   linking.
6. Legacy URLs: generated `_redirects` plus static stubs.
7. QA: Playwright suite (routes, metadata, JSON-LD, internal links, mobile nav, theme
   toggle, search), axe accessibility checks, Lighthouse run against the build output.
8. CI/CD: GitHub Actions (lint, type check, build, test, Lighthouse, deploy to Cloudflare
   Pages) with deployment verification against the public domain.
9. Documentation: README, architecture, content guidelines, SEO, deployment, testing.
10. Production: build, deploy, DNS cutover, then verify every public route, metadata,
    feed, sitemap, structured data and Lighthouse score on the live domain.
