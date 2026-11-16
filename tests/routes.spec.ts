import { expect, test } from "@playwright/test";

const postSlugs = [
  "hidden-text-in-agent-instruction-files",
  "why-this-blog-exists",
];

const routes = [
  { path: "/", heading: "Indra Prasetya" },
  { path: "/posts/", heading: "Writing" },
  { path: "/categories/", heading: "Categories" },
  { path: "/tags/", heading: "Tags" },
  { path: "/archives/", heading: "Archive" },
  { path: "/about/", heading: "About" },
  { path: "/search/", heading: "Search" },
];

test.describe("pages render", () => {
  for (const route of routes) {
    test(`${route.path} responds 200 with its heading`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toContainText(route.heading);
      await expect(page.locator("main#main-content")).toBeVisible();
    });
  }

  for (const slug of postSlugs) {
    test(`/posts/${slug}/ renders the article`, async ({ page }) => {
      const response = await page.goto(`/posts/${slug}/`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("article#article")).toBeVisible();
      await expect(page.locator("article#article p").first()).not.toBeEmpty();
      // Every published article carries a rendered diagram.
      await expect(page.locator("article#article figure img")).toHaveCount(1);
    });
  }

  test("unknown path returns the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist/");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toContainText("404");
  });
});

test.describe("category navigation", () => {
  test("every category page lists its articles", async ({ page, request }) => {
    await page.goto("/categories/");
    const links = page.locator('main#main-content a[href^="/categories/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    const hrefs = new Set<string>();
    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute("href");
      if (href) hrefs.add(href);
    }

    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
      const html = await response.text();
      expect(html, href).toContain('id="main-content"');
      expect(html, href).toContain('href="/posts/');
    }
  });
});

test.describe("legacy URLs", () => {
  for (const slug of postSlugs) {
    test(`/posts/${slug}.html still resolves`, async ({ page }) => {
      const response = await page.goto(`/posts/${slug}.html`);
      expect(response?.status()).toBe(200);
      // Static stub points crawlers at the canonical article URL.
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(canonical).toBe(`https://blog.qansa.web.id/posts/${slug}/`);
    });
  }
});
