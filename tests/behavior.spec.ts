import { expect, test } from "@playwright/test";

test.describe("article reading experience", () => {
  test("table of contents, reading time and progress bar are present", async ({
    page,
  }) => {
    await page.goto("/posts/hidden-text-in-agent-instruction-files/");

    await expect(page.locator("text=/\\d+ min read/").first()).toBeVisible();
    await expect(page.locator("#myBar")).toHaveCount(1);
    // A table of contents is rendered for every article: a side column on wide
    // viewports and a floating control below that, hence one or two instances.
    expect(await page.locator("[data-toc-nav]").count()).toBeGreaterThanOrEqual(
      1
    );
    await expect(page.locator("#toc-side-label").first()).toContainText(
      "Table of contents"
    );
  });

  test("code blocks get a copy control", async ({ page }) => {
    await page.goto("/posts/hidden-text-in-agent-instruction-files/");
    const button = page.locator("button.copy-code").first();
    await expect(button).toBeVisible();
    await expect(button).toHaveText("Copy");
  });

  test("previous and next navigation links between articles", async ({
    page,
  }) => {
    await page.goto("/posts/hidden-text-in-agent-instruction-files/");
    await expect(page.locator('a[href="/posts/why-this-blog-exists/"]')).toHaveCount(
      1
    );
  });

  test("related writing section exists when a sibling shares a tag or category", async ({
    page,
  }) => {
    await page.goto("/posts/hidden-text-in-agent-instruction-files/");
    // The TOTP article now shares the security-engineering category, so the
    // related section renders for the hidden-text article.
    await expect(page.locator("#related")).toHaveCount(1);
  });
});

test.describe("theme", () => {
  test("toggle switches theme and survives a reload", async ({ page, viewport }) => {
    await page.goto("/");
    if ((viewport?.width ?? 1280) <= 640) {
      await page.locator("#menu-btn").click();
    }
    const initial = await page.locator("html").getAttribute("data-theme");
    await page.locator("#theme-btn").click();
    const flipped = await page.locator("html").getAttribute("data-theme");
    expect(flipped).not.toBe(initial);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", flipped!);
    expect(
      await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    ).not.toBe("");
  });
});

test.describe("search", () => {
  test("static search index finds an article by its body text", async ({
    page,
  }) => {
    await page.goto("/search/");
    const input = page.locator(".pagefind-ui__search-input");
    await expect(input).toBeVisible();
    await input.fill("cfgaudit");
    await expect(
      page.locator('.pagefind-ui__result a[href*="hidden-text"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("mobile navigation", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 640, "desktop only");

  test("menu opens, shows the navigation and closes", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("#menu-btn");
    const menu = page.locator("#menu-items");

    await expect(menu).toBeHidden();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();
    await expect(menu.locator('a[href="/categories/"]')).toBeVisible();
    await button.click();
    await expect(menu).toBeHidden();
  });
});
