#!/usr/bin/env node
/**
 * Fail if any rendered text in a diagram is clipped by the SVG canvas.
 *
 * Mermaid sizes the canvas from its layout maths, and a subgraph title sits a
 * few units from the top edge, so a text run can end up half outside the
 * viewBox and still look normal in the source. This loads each SVG in a real
 * browser, measures every text node, and compares it with the canvas.
 *
 *   node scripts/check-diagram-bounds.mjs            # all diagrams
 *   node scripts/check-diagram-bounds.mjs <slug>      # one diagram
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = "public/diagrams";
const MARGIN = 2; // px of clearance required on every side

const filter = process.argv[2];
const files = readdirSync(ROOT)
  .filter(file => file.endsWith(".svg"))
  .filter(file => !filter || file.includes(filter));

if (files.length === 0) {
  console.error(`No SVG found in ${ROOT}${filter ? ` for "${filter}"` : ""}`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
let failures = 0;

for (const file of files) {
  const svg = readFileSync(join(ROOT, file), "utf8");
  const viewBox = svg
    .match(/viewBox="([^"]+)"/)?.[1]
    ?.split(/\s+/)
    .map(Number);
  if (!viewBox || viewBox.length !== 4) {
    console.error(`FAIL ${file}: no usable viewBox`);
    failures += 1;
    continue;
  }
  const [minX, minY, width, height] = viewBox;
  const maxX = minX + width;
  const maxY = minY + height;

  await page.setContent(
    `<html><body style="margin:0">${svg}</body></html>`,
    { waitUntil: "load" }
  );

  const problems = await page.evaluate(
    ({ minX, minY, maxX, maxY, margin }) => {
      const out = [];
      const nodes = document.querySelectorAll("text, foreignObject");
      for (const node of nodes) {
        const label = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (!label) continue;
        let box;
        if (node.tagName === "foreignObject") {
          const inner = node.querySelector("*");
          if (!inner) continue;
          box = inner.getBoundingClientRect();
          const svgEl = node.ownerSVGElement;
          const svgBox = svgEl.getBoundingClientRect();
          const scale = svgEl.viewBox.baseVal.width / svgBox.width;
          box = {
            x: (box.x - svgBox.x) * scale,
            y: (box.y - svgBox.y) * scale,
            width: box.width * scale,
            height: box.height * scale,
          };
        } else {
          box = node.getBBox();
        }
        if (box.width === 0 && box.height === 0) continue;
        const hit =
          box.x < minX + margin ||
          box.y < minY + margin ||
          box.x + box.width > maxX - margin ||
          box.y + box.height > maxY - margin;
        if (hit) {
          out.push({
            label: label.slice(0, 40),
            x: +box.x.toFixed(1),
            y: +box.y.toFixed(1),
            right: +(box.x + box.width).toFixed(1),
            bottom: +(box.y + box.height).toFixed(1),
          });
        }
      }
      return out;
    },
    { minX, minY, maxX, maxY, margin: MARGIN }
  );

  if (problems.length) {
    failures += 1;
    console.error(
      `FAIL ${file}: ${problems.length} clipped label(s), canvas ${minX} ${minY} ${width}x${height}`
    );
    for (const p of problems)
      console.error(
        `  "${p.label}" x=${p.x} y=${p.y} right=${p.right} bottom=${p.bottom}`
      );
  } else {
    console.log(`ok   ${file} (${width}x${height})`);
  }
}

await browser.close();
if (failures) {
  console.error(`\n${failures} diagram(s) have text outside the canvas`);
  process.exit(1);
}
