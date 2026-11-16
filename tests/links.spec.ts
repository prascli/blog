import { expect, test, type Page } from "@playwright/test";

/**
 * Crawl internal links from the main entry points and fail on any that do not
 * resolve. This is the guard against a renamed route shipping with a stale link.
 */
async function internalLinks(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  const hrefs = await page.$$eval("a[href]", anchors =>
    anchors.map(anchor => anchor.getAttribute("href") ?? "")
  );

  return [
    ...new Set(
      hrefs
        .filter(href => href.startsWith("/") && !href.startsWith("//"))
        .map(href => href.split("#")[0])
        .filter(Boolean)
    ),
  ];
}

const entryPoints = [
  "/",
  "/posts/",
  "/posts/hidden-text-in-agent-instruction-files/",
  "/categories/",
  "/tags/",
  "/archives/",
  "/about/",
];

test("every internal link from the main pages resolves", async ({ page }) => {
  const broken: string[] = [];

  for (const entry of entryPoints) {
    for (const href of await internalLinks(page, entry)) {
      const response = await page.request.get(href);
      if (response.status() >= 400) {
        broken.push(`${entry} -> ${href} (${response.status()})`);
      }
    }
  }

  expect(broken).toEqual([]);
});

test("header navigation is complete on every page", async ({ page }) => {
  for (const path of ["/", "/posts/", "/about/", "/archives/"]) {
    await page.goto(path);
    const nav = page.locator("#menu-items");
    for (const target of [
      "/posts/",
      "/categories/",
      "/tags/",
      "/archives/",
      "/about/",
      "/search/",
    ]) {
      await expect(nav.locator(`a[href="${target}"]`)).toHaveCount(1);
    }
  }
});

test("links that open a new tab also declare noopener", async ({ page }) => {
  await page.goto("/about/");
  const blank = page.locator('a[target="_blank"]');
  const count = await blank.count();
  for (let index = 0; index < count; index += 1) {
    const rel = (await blank.nth(index).getAttribute("rel")) ?? "";
    expect(rel.split(/\s+/)).toContain("noopener");
  }
});

test("the external links in the author page point at real destinations", async ({
  page,
}) => {
  await page.goto("/about/");
  const hrefs = await page.$$eval('a[href^="http"]', anchors =>
    anchors.map(anchor => anchor.getAttribute("href") ?? "")
  );
  for (const href of hrefs) {
    const response = await page.request.get(href, { maxRedirects: 5 });
    expect(response.status(), href).toBeLessThan(400);
  }
});
