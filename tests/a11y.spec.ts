import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/",
  "/posts/",
  "/posts/hidden-text-in-agent-instruction-files/",
  "/posts/why-this-blog-exists/",
  "/categories/",
  "/categories/security-engineering/",
  "/tags/",
  "/archives/",
  "/about/",
  "/search/",
];

for (const path of pages) {
  test(`no serious WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const blocking = results.violations.filter(
      violation =>
        violation.impact === "critical" || violation.impact === "serious"
    );

    expect(
      blocking.map(
        violation => `${violation.id} (${violation.nodes.length} nodes)`
      )
    ).toEqual([]);
  });
}

test("keyboard focus starts at the skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.id);
  expect(focused).toBe("skip-to-content");
});
