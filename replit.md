# TransYacht Group

Migrated from GitHub repo `apsevcenco/transyachtgroup` (originally deployed on Render). Multilingual yacht/transport showcase site with admin panel for content and vehicle management.

## Run & Operate

- `pnpm --filter @workspace/transyachtgroup run dev` — frontend (Vite, served at `/`)
- `pnpm --filter @workspace/api-server run dev` — API server (path `/api`)
- `pnpm --filter @workspace/mockup-sandbox run dev` — design sandbox
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter (router), TanStack Query, Tailwind, Radix UI, Framer Motion
- API: Express 5
- DB: Supabase (PostgreSQL) via `pg` + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Required env / secrets

- `SUPABASE_DATABASE_URL` — Supabase Postgres connection string (preferred over `DATABASE_URL`).
  Use the **Pooler** URI from Supabase: Project Settings → Database → Connection string → URI (or Connection pooling).
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key, exposed to the frontend.
- `VITE_SUPABASE_URL` — Supabase project URL (e.g. `https://<project-ref>.supabase.co`), exposed to the frontend. Without it, the admin panel crashes on load.
- `ADMIN_PASSWORD` — admin panel password.
- `SESSION_SECRET` — Express session secret.

Optional (not yet configured):
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — for the `/api/translate` route (Replit AI Integrations proxy). Without it, translate falls back to Google Translate.

Note: image uploads in admin go **directly from the browser to Supabase Storage** (using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). No server-side upload route or Google Cloud Storage is used.

## Where things live

- `artifacts/transyachtgroup/` — React frontend (the public site + admin panel)
- `artifacts/api-server/` — Express API at `/api`
- `lib/db/src/schema/` — Drizzle schema (vehicles, site_content, admin_sessions, contact_requests, analytics_events)
- `lib/db/src/index.ts` — DB client; reads `SUPABASE_DATABASE_URL` first, falls back to `DATABASE_URL`
- `lib/api-spec/openapi.yaml` — API contract (source of truth for codegen)

## Architecture decisions

- Uses Supabase as the source of truth (kept from the original Render deployment). Replit's built-in PostgreSQL is **not** used.
- The DB schema already exists in Supabase from production — **do not run `db push` or seed scripts** against it.
- The api-server prefers `SUPABASE_DATABASE_URL` over `DATABASE_URL` so the workspace's auto-provisioned `DATABASE_URL` (built-in PG) is ignored.
- `backup.dump` at the repo root is a Postgres custom-format dump from the original deployment, kept for reference.

## Gotchas

- If `SUPABASE_DATABASE_URL` rejects auth, reset the database password in Supabase (Project Settings → Database → Reset password) and replace `[YOUR-PASSWORD]` in the URI string. URL-encode special characters in the password.
- Don't run `pnpm dev` at the workspace root — use the configured workflows or `pnpm --filter @workspace/<name> run dev`.

## User preferences

- Communication in Russian.
- Keep using Supabase as the database; do not migrate to Replit's built-in PostgreSQL without explicit request.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and TypeScript setup.
