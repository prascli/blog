#!/usr/bin/env node
/**
 * Local Lighthouse run against the production build.
 *
 * Starts `astro preview`, audits a fixed set of routes, prints the four
 * category scores, and writes the raw JSON to .cache/lighthouse/. Exits
 * non-zero when a score is below the threshold in THRESHOLDS.
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = ".cache/lighthouse";

const THRESHOLDS = {
  performance: 0.95,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
};

const routes = (() => {
  const posts = readdirSync("src/content/posts")
    .filter(file => /\.(md|mdx)$/.test(file))
    .map(file => `/posts/${file.replace(/\.(md|mdx)$/, "")}/`);
  const categories = readdirSync("src/content/posts")
    .filter(file => /\.(md|mdx)$/.test(file))
    .map(file => {
      const raw = readFileSync(join("src/content/posts", file), "utf8");
      return raw.match(/^category:\s*"?([a-z-]+)"?/m)?.[1];
    })
    .filter(Boolean)
    .map(slug => `/categories/${slug}/`);

  return ["/", ...new Set(posts), ...new Set(categories), "/categories/", "/about/", "/archives/"];
})();

mkdirSync(OUT, { recursive: true });

// Lighthouse needs a full Chrome, not the headless shell Playwright ships for
// tests. Prefer an explicit CHROME_PATH, then the newest Playwright chromium.
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = `${process.env.HOME}/.cache/ms-playwright`;
  if (!existsSync(base)) return undefined;
  const candidates = readdirSync(base)
    .filter(name => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
    .map(name => join(base, name, "chrome-linux64", "chrome"))
    .filter(path => existsSync(path));
  return candidates[0];
}

const chromePath = findChrome();
const env = { ...process.env, ...(chromePath ? { CHROME_PATH: chromePath } : {}) };

// Detached so the whole process group can be terminated afterwards; the npx
// wrapper otherwise leaves the preview server listening on the port.
mkdirSync(OUT, { recursive: true });
const previewLog = join(OUT, "preview.log");
const previewLogFd = openSync(previewLog, "w");
const preview = spawn(
  "npx",
  ["astro", "preview", "--host", "127.0.0.1", "--port", String(PORT)],
  { stdio: ["ignore", previewLogFd, previewLogFd], detached: true }
);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await wait(500);
  }
  const output = existsSync(previewLog) ? readFileSync(previewLog, "utf8") : "";
  throw new Error(`preview server did not start\n${output.slice(-800)}`);
}

function assertScores(results, label) {
  const failures = [];
  for (const [category, threshold] of Object.entries(THRESHOLDS)) {
    const score = results.categories[category]?.score ?? 0;
    if (score < threshold) {
      failures.push(`${category} ${Math.round(score * 100)} < ${threshold * 100}`);
    }
  }
  if (failures.length > 0) {
    console.error(`FAIL ${label}: ${failures.join(", ")}`);
    return false;
  }
  return true;
}

try {
  await waitForServer();

  let ok = true;
  for (const route of routes) {
    const name = route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_|_$/g, "");
    const outPath = join(OUT, `${name}.json`);
    const chromeFlags = "--headless=new --no-sandbox --disable-dev-shm-usage";

    execFileSync(
      "npx",
      [
        "lighthouse",
        `${BASE}${route}`,
        "--quiet",
        "--output=json",
        `--output-path=${outPath}`,
        `--chrome-flags=${chromeFlags}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--preset=desktop",
      ],
      { stdio: "inherit", env }
    );

    const report = JSON.parse(readFileSync(outPath, "utf8"));
    const scores = Object.fromEntries(
      Object.entries(report.categories).map(([key, value]) => [
        key,
        Math.round((value.score ?? 0) * 100),
      ])
    );
    console.log(
      `${route}  perf ${scores.performance}  a11y ${scores.accessibility}  bp ${scores["best-practices"]}  seo ${scores.seo}`
    );
    ok = assertScores(report, route) && ok;
  }

  console.log(ok ? "lighthouse: all routes pass" : "lighthouse: threshold not met");
  process.exitCode = ok ? 0 : 1;
} finally {
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    preview.kill("SIGTERM");
  }
  closeSync(previewLogFd);
}
