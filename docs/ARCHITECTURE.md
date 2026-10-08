# Architecture

## Components

```
Visitors / crawlers
        │
        ▼
 Static host (Render Static Site)  ── serves dist/public: SPA + prerendered HTML + sitemap/robots
        │   /api/*  (rewrite, same origin)
        ▼
 API (Render Web Service, Node + Express 5)
        ├── PostgreSQL (Supabase)  — all business data
        ├── Supabase Storage       — images (uploaded through the API; private booking photos via the server key)
        ├── OpenAI                 — article / answer generation, SEO fixes, partner assistant
        ├── Resend                 — outgoing partner & proposal emails, inbound replies (webhook)
        └── Optional: WhatsApp Cloud API (review requests)
```

The browser calls `/api/...` on the same domain; the static host proxies it to the API service (a rewrite rule configured in the Render dashboard). Admin uploads of catalogue images go straight from the browser to Supabase Storage.

## Repository layout (pnpm workspaces)

| Path | Purpose |
|---|---|
| `artifacts/transyachtgroup` | Frontend: React 19, Vite, wouter (routing), TanStack Query, Tailwind. Public site **and** the admin panel (`/admin/*`) |
| `artifacts/transyachtgroup/scripts` | `generate-seo-pages.mjs` (post-build prerender, sitemap, 404 page), `verify-seo.mjs` (build gate) |
| `artifacts/transyachtgroup/src/data` | Pure data/logic modules shared by the React app **and** the prerender (service pages, locations, related-answer rules, vehicle SEO helpers) |
| `artifacts/api-server` | Express API: routes in `src/routes`, helpers in `src/lib`, auth in `src/middleware` |
| `lib/db` | Drizzle ORM schema (`src/schema`) and the SQL migrations (`migrations/*.sql`) |
| `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | OpenAPI contract and generated validators / hooks |
| `scripts` | Utility scripts (fonts, PDF/proposal tests, data seeds) |
| `docs` | This documentation |

## Key flows

### Public page request
1. The static host returns `dist/public/<path>/index.html` when it exists (prerendered page with full text, canonical, JSON-LD) or the SPA shell for dynamic routes listed in the host's rewrite rules; any other path returns the real `404.html`.
2. React mounts, removes the hidden prerender block and renders the live page; data comes from `/api`.
3. `SeoHead` keeps title, meta, canonical and structured data in sync client-side.

### Publishing content
1. An admin creates or edits a guide, news item, answer or vehicle in `/admin`.
2. The API stores it and, for public content changes, schedules a debounced rebuild (`RENDER_DEPLOY_HOOK_URL`, ~5 minutes after the last edit, at most one per 10 minutes).
3. Render rebuilds the static site; the prerender fetches published content from the public API and writes HTML for every URL, plus `pages-sitemap.xml`.
4. About 12 minutes after a rebuild trigger the API submits all sitemap URLs to Bing through IndexNow.

### AI content pipelines (guides, news, answers)
`generate` → deterministic SEO `audit` (score + issues) → `fix-seo` (AI corrects only audit findings, repeated until clean) → human review → publish. Internal links produced by AI are restricted to an approved list of real site pages. Answers additionally carry a verified fact sheet and a list of forbidden claims (see `answers.ts`).

### Admin authentication
Password (`ADMIN_PASSWORD`) plus optional TOTP (`ADMIN_TOTP_SECRET`). A login creates a hashed session token stored in `admin_sessions`; a new login invalidates the previous one (single active session). Admin API routes are protected by the `adminAuth` middleware.

### Partner CRM and email
Contacts and message history live in the database. Outgoing mail is sent through Resend; replies arrive through a Resend inbound webhook (verified with a Svix signature) addressed to the receiving address set in `PARTNER_REPLY_TO`. Unsubscribe requests and clear opt-out replies block the contact automatically. A scheduler (`partnerDigest`) emails a daily summary of due follow-ups and unread replies.

## Routing conventions
- Public URLs end with a trailing slash. A small inline script in `index.html` redirects slash-less URLs (the static host cannot do this with a 301).
- English is served at unprefixed URLs. Other languages are currently selected client-side (see the language work noted in `SEO_GEO_OPERATIONS.md`).
- `/admin` and `/api` are never indexed (robots.txt) and never prerendered.
