# Deployment

## Target

| Item | Value |
| --- | --- |
| Host | Cloudflare Pages, project `qansa-blog` |
| Method | direct upload of the built `dist/` directory from GitHub Actions |
| Domain | `blog.qansa.web.id` (CNAME to `qansa-blog.pages.dev`, proxied by Cloudflare) |
| Deploy on | push to `main`, or manual `workflow_dispatch` |
| Rollback | redeploy a previous Pages deployment, or revert the commit |

No server, no container, no database. Each deploy is an immutable snapshot of a
Git commit that already passed lint, type check, build and the Playwright suite.

## Workflows

`.github/workflows/ci.yml` (pull requests and pushes):

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` (ESLint, including `eslint-plugin-astro`)
3. `pnpm format:check` (Prettier)
4. `pnpm build` (`astro check`, build, Pagefind index, post-build artifact guards)
5. `pnpm exec playwright install --with-deps chromium`, then `pnpm test`
6. Lighthouse job: `pnpm lighthouse` with hard thresholds of 95 for performance,
   accessibility, best practices and SEO
7. Uploads `dist` and, on failure, the Playwright report

`.github/workflows/deploy.yml` (push to `main`): repeats build and tests, uploads
`dist`, deploys with `wrangler pages deploy`, then runs
`node scripts/verify-production.mjs` against `https://blog.qansa.web.id` as a
required step. A deploy that breaks a public route fails the workflow visibly
instead of leaving a broken site silently live.

## Required repository secrets

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Account → Cloudflare Pages → Edit** and **Zone → DNS → Edit** for `qansa.web.id` |
| `CLOUDFLARE_ACCOUNT_ID` | `0c25ea1bc1ae493bb1c6d95cecac5d78` (account that owns `qansa-blog`) |

Nothing else is needed: there is no runtime configuration, and the site URL is
compiled in from `astro-paper.config.ts`.

## Local deploy (break glass)

```bash
pnpm build
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
  npx wrangler@4 pages deploy dist --project-name=qansa-blog --branch=main
node scripts/verify-production.mjs https://blog.qansa.web.id
```

Use this only when GitHub Actions is unavailable. It bypasses CI, so run
`pnpm lint && pnpm test` first.

## Rollback

1. **Cloudflare Pages rollback** (fastest): dashboard → Workers & Pages →
   `qansa-blog` → Deployments → pick the last good deployment → "Rollback to this
   deployment". The domain keeps serving immediately; no rebuild.
2. **Git rollback**: `git revert <sha>`, push, let the pipeline deploy the
   reverted state. Preferred when the problem is content, not the build.
3. **Last resort**: restore the previous hosting path (below), then fix forward.

## Previous hosting path (retained for rollback)

Before this rebuild the site was `build.py` output served by an `nginx:alpine`
container bound to `/home/apps/blog/site` on `127.0.0.1:8090`, published through
the Cloudflare tunnel (`blog.qansa.web.id` CNAME →
`393ffb05-a06b-40ad-851f-4417f465c431.cfargotunnel.com`).

That directory and container were left untouched. To go back:

```bash
# 1. point DNS back at the tunnel
curl -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/d2e5eb4274d1751482acdddac655813a/dns_records/e043190524b306da10b5eb19bf6bbe67" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  --data '{"content":"393ffb05-a06b-40ad-851f-4417f465c431.cfargotunnel.com","proxied":true}'

# 2. make sure the container is up
docker start blog

# 3. rebuild + verify the old site
cd /home/apps/blog && ./redeploy.sh
```

The old social preview images and article URLs stay valid either way, because
the new site 301s `/posts/<slug>.html` to `/posts/<slug>/`.

## Operational checks

| Check | Command |
| --- | --- |
| Live routes, metadata, feed, sitemap, redirects | `node scripts/verify-production.mjs` |
| Response headers and TLS | `curl -sI https://blog.qansa.web.id/` |
| Deploy history | `npx wrangler pages deployment list --project-name=qansa-blog` |
| Cache | Cloudflare caches static assets; HTML is served with revalidation. Purge via dashboard if a stale page is ever suspected. |

## Costs

Cloudflare Pages free tier: unlimited requests, 500 builds/month (this project
uses one build per merge), 100 custom domains. No other service is billed.

## Notes

- Builds are reproducible: `pnpm install --frozen-lockfile` on Node 22 with the
  committed `pnpm-lock.yaml`.
- Fonts are fetched at build time by the Astro Fonts API and emitted into
  `_astro/fonts/`, so the deployed site makes no third-party requests.
- `_redirects` is generated during the build, never hand-edited.
