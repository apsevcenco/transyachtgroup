# Deployment and operations

Production runs as two Render services built from the `main` branch of the GitHub repository (auto-deploy on push). Exact commands and plans are configured in the Render dashboard; the values below describe what the repository expects. **Check them against the dashboard at handover.**

## 1. API service (Render Web Service)

| Setting | Value |
|---|---|
| Runtime | Node 24 |
| Build | install dependencies, then build the API: `pnpm install` and `pnpm --filter @workspace/api-server run build` |
| Start | `pnpm --filter @workspace/api-server run start` (runs `node dist/index.mjs`) |
| Health | `GET /api/healthz` (health router) |
| Env | see ENVIRONMENT.md |

## 2. Static site (Render Static Site)

| Setting | Value |
|---|---|
| Build | `pnpm install` and `pnpm --filter @workspace/transyachtgroup run build` |
| Publish directory | `artifacts/transyachtgroup/dist/public` |
| What the build does | `vite build` → `generate-seo-pages.mjs` (prerender, sitemap, `404.html`) → `verify-seo.mjs` (fails the build if SEO signals are missing) |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional ads variables |

If the public API is unreachable during the build the prerender skips dynamic content (guides, news, answers, vehicles) with a warning instead of failing; the next successful build restores it.

### Redirects / rewrites (Render dashboard → Redirects/Rewrites)

Rules are evaluated top to bottom. Existing static files are always served first. Everything not listed returns the real `404.html` with HTTP 404.

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://<api-service>.onrender.com/api/*` | Rewrite |
| `/admin` , `/admin/*` | `/index.html` | Rewrite |
| `/vehicle/*` | `/index.html` | Rewrite |
| `/cars` , `/cars/*` | `/index.html` | Rewrite |
| `/yachts` , `/yachts/*` | `/index.html` | Rewrite |
| `/about` , `/privacy` , `/legal` | `/index.html` | Rewrite |
| `/guides` , `/guides/*` | `/index.html` | Rewrite |
| `/news` , `/news/*` | `/index.html` | Rewrite |
| `/answers` , `/answers/*` | `/index.html` | Rewrite |
| `/locations/*` , `/services/*` | `/index.html` | Rewrite |

Why the rewrites exist: they let freshly published content (not yet in the last build) open through the SPA, and they let slash-less URLs reach the inline redirect script in `index.html`. If new top-level route prefixes are added to the app, add matching rules.

### Deploy Hook
Render → Static Site → Settings → Deploy Hook. The URL is stored as `RENDER_DEPLOY_HOOK_URL` on the **API** service. Editing public content triggers a rebuild a few minutes later.

## 3. Release procedure

1. Work on a branch; run `pnpm run typecheck`, `pnpm test`, and for frontend changes `pnpm --filter @workspace/transyachtgroup run build`.
2. Merge to `main`; Render deploys both services automatically.
3. If the change includes a database migration, **apply the SQL in Supabase first** (see DATABASE.md), then deploy.
4. Verify: open the site, `/admin`, one prerendered page (`view-source:` should show the text), `/api/healthz`.

## 4. Rollback
- Render keeps previous deploys: Service → Events/Deploys → "Rollback" to a previous successful deploy.
- Code: `git revert <commit>` and push.
- Migrations are not rolled back automatically; write a compensating SQL script.

## 5. Scheduled work
- Partner digest: runs inside the API process (`PARTNER_DIGEST_*`). A free API plan that sleeps will skip it; use an always-on plan.
- SEO intelligence: the endpoint `/api/internal/seo-intelligence/daily` expects a Bearer `SEO_INTELLIGENCE_CRON_SECRET` and must be called by an external scheduler (e.g. Render Cron Job) if the daily scan is wanted.

## 6. Monitoring checklist (weekly)
- Render: both services healthy, no failed deploys.
- Search Console: coverage and performance reports; sitemap status.
- Bing Webmaster Tools: IndexNow submissions.
- Resend: bounces/complaints.
- OpenAI: usage and spend.
