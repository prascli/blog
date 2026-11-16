# SEO and discoverability

## Per-page output

Every page is generated with:

- A unique `<title>` (`<page> | Indra Prasetya`).
- A `<meta name="description">` from `description` frontmatter or the page copy.
- `<link rel="canonical">` built from the site URL and the route.
- Open Graph: `og:type`, `og:site_name`, `og:locale`, `og:title`,
  `og:description`, `og:url`, `og:image`, `og:image:alt`.
- Twitter/X: `twitter:card=summary_large_image`, `twitter:title`,
  `twitter:description`, `twitter:image`, `twitter:url`.
- RSS autodiscovery link.
- Exactly one `h1`, with body headings descending in order.

Article pages additionally emit `article:published_time`, `article:modified_time`,
`article:section` (category) and one `article:tag` per tag.

## Structured data

| Type | Where | Fields |
| --- | --- | --- |
| `Person` | every page (in `Layout`) | name, url, jobTitle, knowsAbout, sameAs, worksFor Qansa |
| `WebSite` | every page | name, alternateName, url, inLanguage, publisher, SearchAction |
| `BlogPosting` | article pages | headline, description, image, url, mainEntityOfPage, datePublished, dateModified, articleSection, keywords, timeRequired, author, publisher, isPartOf |
| `BreadcrumbList` | article pages | Home → Category → Article |

All JSON-LD is emitted as `application/ld+json` with `<` escaped, so a title
containing `</script>` cannot break out of the block. The Playwright suite parses
every block and asserts the node types and key fields.

## Social images

- Default: `/og.png`, generated at build time by satori from the site identity.
- Per article: `/posts/<slug>/index.png`, generated with the title, description,
  category, date, reading time and author on the brand palette.
- Both are 1200×630 PNG. `og:image` always points at the absolute URL.

## Crawling

- `/robots.txt` allows everything and points at `/sitemap-index.xml`.
- `/sitemap-index.xml` lists `/sitemap-0.xml`, which contains every published
  route with its `lastmod`.
- `/rss.xml` carries title, description, link and `pubDate` per item.
- `/feed.xml` and `/sitemap.xml` (the previous site's paths) 301 to the new ones.
- `/posts/<slug>.html` (the previous article URLs) 301 to `/posts/<slug>/`.
- `404.html` is served for unknown paths with a real 404 status.

## Internal linking

Header navigation (Writing, Categories, Tags, Archive, About, Search), footer
navigation, breadcrumbs, category links on every card and article, tag pages,
related posts, previous/next navigation, and in-body links. The
`tests/links.spec.ts` suite crawls every internal link from the main entry points
and fails on any non-2xx response.

## Verification checklist (after each deploy)

Run `node scripts/verify-production.mjs https://blog.qansa.web.id`. It checks:

- every URL in the sitemap returns 200 with title, canonical, JSON-LD, `og:image`
  and `twitter:card`
- `robots.txt` references the sitemap
- `rss.xml` parses with items that carry dates
- `/og.png` is served as `image/png`
- each legacy `/posts/<slug>.html` redirects (301) to the canonical article, or
  serves a canonical stub
- an unknown path returns 404

## Search engines

| Console | Status |
| --- | --- |
| Google Search Console | property `blog.qansa.web.id`; submit `sitemap-index.xml`. A verification token can be supplied with `PUBLIC_GOOGLE_SITE_VERIFICATION`, which renders a `google-site-verification` meta tag. |
| Bing Webmaster Tools | verify by importing from Google Search Console, then submit the same sitemap. |
| Social previews | Open Graph and Twitter tags are present on every page; validate a sample with the LinkedIn Post Inspector or the X card validator after changes to metadata. |

Verification of the consoles is an operator step; the site side of all three is
in place and asserted by the tests.
