import { expect, test } from "@playwright/test";

const SITE = "https://blog.qansa.web.id";

test.describe("metadata", () => {
  test("home page has complete SEO metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Indra Prasetya");
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length).toBeGreaterThan(50);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${SITE}/`
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${SITE}/og.png`
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    await expect(
      page.locator('link[rel="alternate"][type="application/rss+xml"]')
    ).toHaveCount(1);
  });

  test("article page carries article metadata and structured data", async ({
    page,
  }) => {
    const slug = "hidden-text-in-agent-instruction-files";
    await page.goto(`/posts/${slug}/`);

    await expect(page).toHaveTitle(
      /Hidden text in agent instruction files.*\| Indra Prasetya/
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article"
    );
    await expect(
      page.locator('meta[property="article:published_time"]')
    ).toHaveCount(1);
    await expect(page.locator('meta[property="article:section"]')).toHaveAttribute(
      "content",
      "Security Engineering"
    );

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const data = blocks.flatMap(block => JSON.parse(block));
    const types = data.map(node => node["@type"]);

    expect(types).toContain("Person");
    expect(types).toContain("WebSite");
    expect(types).toContain("BlogPosting");
    expect(types).toContain("BreadcrumbList");

    const article = data.find(node => node["@type"] === "BlogPosting");
    expect(article.headline).toContain("Hidden text");
    expect(article.author[0].name).toBe("Indra Prasetya");
    expect(article.publisher.name).toBe("Qansa");
    expect(article.articleSection).toBe("Security Engineering");
    expect(article.keywords).toContain("Prompt Injection");
    expect(article.mainEntityOfPage["@id"]).toBe(`${SITE}/posts/${slug}/`);

    const breadcrumb = data.find(node => node["@type"] === "BreadcrumbList");
    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(breadcrumb.itemListElement[2].item).toBe(`${SITE}/posts/${slug}/`);
  });

  test("headings follow a single h1 hierarchy", async ({ page }) => {
    await page.goto("/posts/hidden-text-in-agent-instruction-files/");
    await expect(page.locator("h1")).toHaveCount(1);
    const h2 = await page.locator("article#article h2").count();
    expect(h2).toBeGreaterThan(1);
  });
});

test.describe("feeds and crawler files", () => {
  test("robots.txt advertises the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Sitemap: https://blog.qansa.web.id/sitemap-index.xml");
  });

  test("sitemap lists the article URLs", async ({ request }) => {
    const index = await request.get("/sitemap-index.xml");
    expect(index.status()).toBe(200);
    expect(await index.text()).toContain("sitemap-0.xml");

    const sitemap = await request.get("/sitemap-0.xml");
    const body = await sitemap.text();
    expect(body).toContain(`${SITE}/posts/hidden-text-in-agent-instruction-files/`);
    expect(body).toContain(`${SITE}/categories/security-engineering/`);
  });

  test("RSS feed has items with dates and links", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<item>");
    expect(body).toContain("<pubDate>");
    expect(body).toContain(`${SITE}/posts/why-this-blog-exists/`);
  });

  test("legacy feed and sitemap paths are redirected", async ({ request }) => {
    const body = await (await request.get("/_redirects")).text();
    expect(body).toContain("/feed.xml /rss.xml 301");
    expect(body).toContain(
      "/posts/why-this-blog-exists.html /posts/why-this-blog-exists/ 301"
    );
  });

  test("social image is generated", async ({ request }) => {
    const response = await request.get("/og.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});
