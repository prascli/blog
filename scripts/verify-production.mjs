#!/usr/bin/env node
/**
 * Verify a deployed site, not a local build.
 *
 *   node scripts/verify-production.mjs [baseUrl]
 *
 * Checks, against the real domain:
 *   - every URL in the sitemap returns 200 with a canonical and a title
 *   - robots.txt advertises the sitemap
 *   - rss.xml parses and has items with links
 *   - the social image is served as PNG
 *   - legacy article URLs redirect to the canonical article URL
 *   - an unknown path returns 404
 *
 * Exits non-zero on the first category of failure, printing every problem.
 */
const base = (process.argv[2] ?? "https://blog.qansa.web.id").replace(/\/$/, "");

const problems = [];
const passes = [];

const pass = message => passes.push(message);
const fail = message => problems.push(message);

async function get(path, redirect = "follow") {
  return fetch(`${base}${path}`, { redirect, headers: { "user-agent": "qansa-blog-verify" } });
}

async function main() {
  const sitemapIndex = await get("/sitemap-index.xml");
  if (!sitemapIndex.ok) fail(`/sitemap-index.xml -> ${sitemapIndex.status}`);
  const indexBody = await sitemapIndex.text();
  const sitemapPaths = [...indexBody.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match =>
    new URL(match[1]).pathname
  );
  if (sitemapPaths.length === 0) fail("sitemap index lists no sitemaps");

  const urls = new Set();
  for (const sitemapPath of sitemapPaths) {
    const response = await get(sitemapPath);
    if (!response.ok) {
      fail(`${sitemapPath} -> ${response.status}`);
      continue;
    }
    const body = await response.text();
    for (const match of body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.add(new URL(match[1]).pathname);
    }
  }

  if (urls.size === 0) fail("sitemap lists no URLs");

  for (const path of [...urls].sort()) {
    const response = await get(path);
    const html = await response.text();
    if (!response.ok) {
      fail(`${path} -> ${response.status}`);
      continue;
    }
    if (!/<title>[^<]+<\/title>/.test(html)) fail(`${path} has no <title>`);
    if (!html.includes('rel="canonical"')) fail(`${path} has no canonical link`);
    if (!html.includes("application/ld+json")) fail(`${path} has no JSON-LD`);
    if (!html.includes('property="og:image"')) fail(`${path} has no og:image`);
    if (!html.includes('name="twitter:card"')) fail(`${path} has no twitter card`);
    pass(`${path} 200 with title, canonical, JSON-LD, social cards`);
  }

  const robots = await get("/robots.txt");
  const robotsBody = await robots.text();
  if (!robotsBody.includes(`${base}/sitemap-index.xml`)) {
    fail("robots.txt does not point at the sitemap");
  } else {
    pass("robots.txt points at the sitemap");
  }

  const rss = await get("/rss.xml");
  const rssBody = await rss.text();
  const itemCount = (rssBody.match(/<item>/g) ?? []).length;
  if (!rss.ok || itemCount === 0) fail(`rss.xml -> ${rss.status}, ${itemCount} items`);
  else if (!rssBody.includes("<pubDate>")) fail("rss.xml items have no pubDate");
  else pass(`rss.xml has ${itemCount} item(s) with dates`);

  const og = await get("/og.png");
  if (!og.ok || !(og.headers.get("content-type") ?? "").includes("image/png")) {
    fail(`/og.png -> ${og.status} ${og.headers.get("content-type")}`);
  } else {
    pass("/og.png is served as PNG");
  }

  for (const url of urls) {
    const match = url.match(/^\/posts\/([^/]+)\/$/);
    if (!match) continue;
    const legacy = `/posts/${match[1]}.html`;
    const response = await get(legacy, "manual");
    if (response.status === 301 || response.status === 308) {
      const location = response.headers.get("location") ?? "";
      if (!location.endsWith(`/posts/${match[1]}/`)) {
        fail(`${legacy} redirects to ${location}`);
      } else {
        pass(`${legacy} -> 301 ${location}`);
      }
    } else if (response.ok) {
      const html = await response.text();
      if (html.includes(`rel="canonical" href="${base}/posts/${match[1]}/"`)) {
        pass(`${legacy} serves a canonical stub`);
      } else {
        fail(`${legacy} resolves but is not a redirect to the canonical article`);
      }
    } else {
      fail(`${legacy} -> ${response.status}`);
    }
  }

  const missing = await get("/this-page-does-not-exist", "manual");
  if (missing.status !== 404) fail(`unknown path -> ${missing.status}, expected 404`);
  else pass("unknown path returns 404");

  for (const line of passes) console.log(`ok   ${line}`);
  for (const line of problems) console.error(`FAIL ${line}`);
  console.log(
    `\n${passes.length} check(s) passed, ${problems.length} failed against ${base}`
  );
  process.exitCode = problems.length === 0 ? 0 : 1;
}

main().catch(error => {
  console.error(`verify-production crashed: ${error.message}`);
  process.exitCode = 1;
});
