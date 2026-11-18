#!/usr/bin/env node
/**
 * Keep the Cloudflare Pages site inside the free plan.
 *
 *   node scripts/check-pages-limits.mjs dist     # local: files and file sizes
 *   node scripts/check-pages-limits.mjs usage    # API: projects, domains, deployments
 *
 * Free plan limits that matter here: 20,000 files per site, 25 MiB per file,
 * 100 projects per account, 100 custom domains per project. The 500 builds per
 * month limit only applies to builds Pages runs from Git; this repo deploys with
 * `wrangler pages deploy` (direct upload), so GitHub Actions does the build and
 * that quota is not consumed.
 *
 * Exit 1 on a hard limit, 0 with a warning line at 80 percent.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_FILES = 20000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PROJECTS = 100;
const MAX_DOMAINS = 100;
const WARN_AT = 0.8;

function walk(dir) {
  let files = 0;
  let bytes = 0;
  let largest = { path: "", size: 0 };
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(path);
      files += sub.files;
      bytes += sub.bytes;
      if (sub.largest.size > largest.size) largest = sub.largest;
      continue;
    }
    const size = statSync(path).size;
    files += 1;
    bytes += size;
    if (size > largest.size) largest = { path, size };
  }
  return { files, bytes, largest };
}

function checkDist(dir) {
  const { files, bytes, largest } = walk(dir);
  const problems = [];
  const warnings = [];
  if (files > MAX_FILES) problems.push(`${files} files exceeds ${MAX_FILES}`);
  else if (files > MAX_FILES * WARN_AT) warnings.push(`${files} files is above 80 percent of ${MAX_FILES}`);
  if (largest.size > MAX_FILE_BYTES) problems.push(`${largest.path} is ${(largest.size / 1048576).toFixed(1)} MiB, over 25 MiB`);
  else if (largest.size > MAX_FILE_BYTES * WARN_AT) warnings.push(`${largest.path} is above 80 percent of 25 MiB`);
  console.log(`dist: ${files} files (${(bytes / 1048576).toFixed(1)} MiB), largest ${largest.path} ${(largest.size / 1048576).toFixed(1)} MiB`);
  for (const warning of warnings) console.log(`WARN: ${warning}`);
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  return problems.length === 0;
}

async function cf(path, token) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await res.json();
  if (!body.success) throw new Error(`Cloudflare ${path}: ${JSON.stringify(body.errors)}`);
  return body.result;
}

async function listDeployments(account, project, token) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await cf(
      `/accounts/${account}/pages/projects/${project}/deployments?page=${page}&per_page=25`,
      token,
    );
    out.push(...batch);
    if (batch.length < 25) break;
    const oldest = new Date(batch[batch.length - 1].created_on);
    if (oldest < monthStart) break;
  }
  return out;
}

async function checkUsage() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    console.error("FAIL: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required for usage mode");
    return false;
  }
  const projects = await cf(`/accounts/${account}/pages/projects`, token);
  const project = projects.find(p => p.name === "qansa-blog");
  const domains = project ? await cf(`/accounts/${account}/pages/projects/${project.name}/domains`, token) : [];
  const deployments = project ? await listDeployments(account, project.name, token) : [];
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const thisMonth = deployments.filter(d => new Date(d.created_on) >= monthStart);

  const latest = deployments[0] || {};
  const problems = [];
  const warnings = [];

  const pct = (n, max) => Math.round((n / max) * 100);
  console.log(`projects: ${projects.length}/${MAX_PROJECTS} (${pct(projects.length, MAX_PROJECTS)}%)`);
  console.log(`domains on qansa-blog: ${domains.length}/${MAX_DOMAINS}`);
  console.log(`deployments this month: ${thisMonth.length} (direct upload, so the 500 Git builds quota is untouched)`);
  console.log(`latest deployment: ${latest.short_id || "-"} ${latest.created_on || "-"} environment=${latest.environment || "-"}`);

  if (projects.length > MAX_PROJECTS) problems.push("project limit reached");
  else if (projects.length > MAX_PROJECTS * WARN_AT) warnings.push("projects above 80 percent of the limit");
  if (domains.length > MAX_DOMAINS) problems.push("custom domain limit reached");
  else if (domains.length > MAX_DOMAINS * WARN_AT) warnings.push("custom domains above 80 percent of the limit");

  for (const warning of warnings) console.log(`WARN: ${warning}`);
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  return problems.length === 0;
}

const mode = process.argv[2];
let ok;
if (mode === "dist") ok = checkDist(process.argv[3] || "dist");
else if (mode === "usage") ok = await checkUsage();
else {
  console.error("usage: node scripts/check-pages-limits.mjs dist|usage [dir]");
  process.exit(2);
}
process.exit(ok ? 0 : 1);
