#!/usr/bin/env node
/**
 * Render every Mermaid source in src/diagrams/ to public/diagrams/.
 *
 * Diagram sources live next to the content because they are part of the post,
 * but they are rendered ahead of time and committed. The CI build therefore
 * needs no browser, and a post shows the exact image that was reviewed.
 *
 *   pnpm run diagrams           # render all
 *   pnpm run diagrams -- slug   # render one post's diagrams
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const SOURCE_DIR = "src/diagrams";
const OUT_DIR = "public/diagrams";

const MERMAID_CONFIG = {
  theme: "base",
  themeVariables: {
    background: "#f7f4ee",
    primaryColor: "#fffdf9",
    primaryTextColor: "#16181c",
    primaryBorderColor: "#b0a79a",
    secondaryColor: "#f1ece3",
    secondaryTextColor: "#16181c",
    tertiaryColor: "#efe9df",
    tertiaryTextColor: "#16181c",
    lineColor: "#3f454e",
    textColor: "#16181c",
    clusterBkg: "#efe9df",
    titleColor: "#16181c",
    clusterTextColor: "#16181c",
    clusterBorder: "#c3baad",
    edgeLabelBackground: "#f7f4ee",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: "17px",
  },
  flowchart: { curve: "basis", padding: 12 },
};

const PUPPETEER_CONFIG = {
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  ...(process.env.PUPPETEER_EXECUTABLE_PATH
    ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
    : {}),
};

const filter = process.argv[2];
const sources = readdirSync(SOURCE_DIR)
  .filter(file => file.endsWith(".mmd"))
  .filter(file => !filter || file.includes(filter));

if (sources.length === 0) {
  console.error(`No .mmd sources found in ${SOURCE_DIR}${filter ? ` for "${filter}"` : ""}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(".cache", { recursive: true });
const configPath = join(".cache", "mermaid-config.json");
const puppeteerPath = join(".cache", "puppeteer.json");
writeFileSync(configPath, JSON.stringify(MERMAID_CONFIG, null, 2));
writeFileSync(puppeteerPath, JSON.stringify(PUPPETEER_CONFIG, null, 2));

const mermaidBin = process.env.MERMAID_BIN ?? "mmdc";

for (const file of sources) {
  const slug = basename(file, ".mmd");
  const svgOut = join(OUT_DIR, `${slug}.svg`);
  const pngOut = join(OUT_DIR, `${slug}.png`);

  for (const out of [svgOut, pngOut]) {
    const args = [
      "-i",
      join(SOURCE_DIR, file),
      "-o",
      out,
      "-c",
      configPath,
      "-p",
      puppeteerPath,
      "-b",
      MERMAID_CONFIG.themeVariables.background,
    ];
    if (out.endsWith(".png")) args.push("-s", "2");
    execFileSync(mermaidBin, args, { stdio: "inherit" });
  }

  const svg = readFileSync(svgOut, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
  if (viewBox?.length === 4) {
    const [, , w, h] = viewBox;
    console.log(`${svgOut} ${pngOut} -> ${Math.round(w)}x${Math.round(h)}`);
  } else {
    console.log(`${svgOut} ${pngOut}`);
  }
}
