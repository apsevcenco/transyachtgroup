# Trans Yacht Group — project documentation

Website, admin panel and API for **transyachtgroup.com**: luxury car rental, VIP transfers and yacht charter on the French Riviera and in Courchevel.

## Read in this order

| # | Document | For whom | What it answers |
|---|---|---|---|
| 1 | [HANDOVER.md](HANDOVER.md) | Buyer / new owner | What is delivered, step-by-step transfer of accounts, acceptance checklist |
| 2 | [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | How the pieces fit together, repository layout, request flow |
| 3 | [SERVICES_AND_COSTS.md](SERVICES_AND_COSTS.md) | Owner / finance | Every third-party service, what it does, how to replace it, where costs come from |
| 4 | [ENVIRONMENT.md](ENVIRONMENT.md) | Developers / ops | Every environment variable, which service reads it, required or optional |
| 5 | [DEPLOYMENT.md](DEPLOYMENT.md) | Developers / ops | Build, deploy, static-host routing rules, rollbacks |
| 6 | [DATABASE.md](DATABASE.md) | Developers | Schema overview, how migrations are applied, backups |
| 7 | [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Staff | Day-to-day use of the admin panel |
| 8 | [SEO_GEO_OPERATIONS.md](SEO_GEO_OPERATIONS.md) | Marketing / content | How search and AI-search visibility is produced and maintained |
| 9 | [LANGUAGE-URLS.md](LANGUAGE-URLS.md) | Developers / marketing | How the `/fr` `/ru` `/ro` `/ar` language URLs, hreflang and language sitemaps work; Render rules; known gaps |
| 10 | [ENGINEERING.md](ENGINEERING.md) | Developers | Tooling (lint, format, tests, CI), conventions, shared helpers, refactoring backlog |

Older focused notes that remain valid: [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md), [PRODUCTION_LAUNCH_CHECKLIST.md](PRODUCTION_LAUNCH_CHECKLIST.md), [GDPR-DATA-RETENTION.md](GDPR-DATA-RETENTION.md), [GOOGLE-ADS-CONVERSIONS.md](GOOGLE-ADS-CONVERSIONS.md), [REVIEW-AUTOMATION.md](REVIEW-AUTOMATION.md).

> The production setup is described in these documents (GitHub → Render, Supabase for data). Code conventions, tooling and the refactoring backlog are in [ENGINEERING.md](ENGINEERING.md).

## The system in one paragraph

A React single-page application (public site and `/admin`) is built into static files and served by a static host. A separate Node/Express API stores everything in a PostgreSQL database (Supabase), sends email through Resend and uses OpenAI for content tools. After each build a prerender script writes real HTML for every public URL so that search engines and AI crawlers receive full text, not an empty shell.

## Quick start for a developer

```bash
pnpm install
pnpm run typecheck
pnpm test                                                   # API unit tests
pnpm --filter @workspace/api-server run dev                 # API on $PORT (needs env, see ENVIRONMENT.md)
pnpm --filter @workspace/transyachtgroup run dev            # frontend (Vite)
pnpm --filter @workspace/transyachtgroup run build          # production build + prerender + SEO checks
```

Requirements: Node.js 24, pnpm.
