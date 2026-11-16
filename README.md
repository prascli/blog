# Indra Prasetya — Engineering Journal

Static engineering publication at **https://blog.qansa.web.id/**.

Built with [Astro](https://astro.build/) on a customised fork of
[satnaing/astro-paper](https://github.com/satnaing/astro-paper) (MIT). Content is
Markdown in Git; GitHub Actions builds, tests and deploys it to Cloudflare Pages.
There is no CMS, no database, no admin panel and no tracking script.

## Publishing an article

1. Add `src/content/posts/my-article.md` with frontmatter:

   ```yaml
   ---
   title: "PostgreSQL Performance Optimization"
   description: "Practical PostgreSQL performance optimization techniques."
   pubDatetime: 2026-11-16T09:00:00+07:00
   author: "Indra Prasetya"
   category: "database-engineering"
   tags:
     - PostgreSQL
     - Performance
   draft: false
   ---
   ```

2. Write the article in Markdown.
3. Commit, push, open a pull request. CI lints, type-checks, builds, runs the
   Playwright and accessibility suites, and enforces Lighthouse budgets.
4. Merging to `main` deploys to production and verifies the live routes.

Full details, including diagrams, categories and the review checklist, are in
[docs/CONTENT_GUIDELINES.md](docs/CONTENT_GUIDELINES.md).

## Local development

```bash
pnpm install
pnpm dev              # http://localhost:4321
pnpm build            # type check, build, search index, legacy redirects
pnpm preview          # serve dist/
pnpm test             # Playwright + axe, against the production build
pnpm lighthouse       # Lighthouse budgets for a fixed route set
pnpm diagrams         # re-render Mermaid sources in src/diagrams/
```

Node 22.23.4 or newer is required.

## Repository map

```
src/content/posts/      articles (Markdown or MDX)
src/content/pages/      standalone pages (about)
src/diagrams/           Mermaid sources, rendered to public/diagrams/
src/pages/              routes: home, posts, categories, tags, archive, search
src/components/         header, footer, cards, pagination, tags
src/layouts/            Layout (site chrome, Person/WebSite JSON-LD), PostLayout
src/utils/              categories, reading time, related posts, slugs, paths
scripts/                post-build, diagram rendering, Lighthouse, live verification
tests/                  Playwright suites: routes, SEO, behaviour, links, a11y
docs/                   architecture, content, SEO, deployment, testing
```

## Documentation

| Document                                                 | Contents                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| [docs/AUDIT.md](docs/AUDIT.md)                           | What was in production before this rebuild, options considered, decisions |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)             | Stack, content model, rendering, URL strategy, design system              |
| [docs/CONTENT_GUIDELINES.md](docs/CONTENT_GUIDELINES.md) | Writing, frontmatter, categories, diagrams, review checklist              |
| [docs/SEO.md](docs/SEO.md)                               | Metadata, structured data, feeds, sitemap, indexing checklist             |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                 | CI/CD, secrets, deploys, rollback, the homelab fallback                   |
| [docs/TESTING.md](docs/TESTING.md)                       | Test suites, how to run them, Lighthouse budgets, results                 |

## Credits and licence

The theme is a fork of AstroPaper by Sat Naing, used under the MIT licence; the
original [LICENSE](LICENSE) is kept in this repository. Site-specific code,
layout, palette and content are © Indra Prasetya. Article text is licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
