# Engineering guide

How the code is checked, the conventions it follows and what is still to be cleaned up.

## Commands

| Command | What it does |
|---|---|
| `pnpm run typecheck` | TypeScript across all packages (must pass before every push) |
| `pnpm test` | Unit tests (API: Node test runner; web: shared data helpers) |
| `pnpm run lint` | ESLint over the whole repository. Everything is a **warning** for now |
| `pnpm run lint:report` | Short summary: totals, top rules, files with the most warnings |
| `pnpm run format:check` / `pnpm run format` | Prettier check / rewrite (printWidth 120, double quotes). **Not applied repository-wide yet**, see "Formatting" |
| `pnpm audit --prod` | Known vulnerabilities in production dependencies |
| `pnpm --filter @workspace/transyachtgroup run build` | Production build + prerender + SEO checks (needs the public API) |

## Continuous integration
`.github/workflows/ci.yml` runs on every push to `main` and on pull requests: install with the frozen lockfile → typecheck → unit tests → Vite build. Lint and the dependency audit run afterwards as informational steps (they do not block). `.github/dependabot.yml` opens weekly grouped update pull requests (minor and patch).

## Shared helpers (do not copy them again)
- **OpenAI requests:** `artifacts/api-server/src/lib/openaiJson.ts` → `requestOpenAiJson(system, user, { maxTokens, modelEnv, defaultModel })`. It owns model selection (`OPENAI_CONTENT_MODEL`, optional per-feature variable such as `OPENAI_ANSWERS_MODEL`), the fallback chain `preferred → gpt-4o → gpt-4o-mini`, timeouts and the error codes (`OPENAI_NOT_CONFIGURED`, `OPENAI_<status>:<detail>`, `INVALID_AI_RESPONSE`). It has unit tests; routes only add a one-line wrapper with their own token limit. Other OpenAI calls (reviews, translate, image generation) use different response shapes and stay separate.
- **Internal links:** `lib/siteLinks.ts` is the single list of pages AI-written content may link to, plus `canonicalInternalHref`.
- **Answer translations:** `lib/answerTranslations.ts` (shape, validation, language selection).
- **Page copy shared by the app and the prerender:** `artifacts/transyachtgroup/src/data/*` must stay pure (no imports from the app) because `scripts/generate-seo-pages.mjs` loads them directly.

## Conventions
- Small, pure modules with tests for logic; routes and components stay thin.
- Public content is changed through the admin; code that publishes content must keep the prerender and sitemaps in sync (see SEO_GEO_OPERATIONS.md).
- A database change needs a numbered SQL file in `lib/db/migrations` **and** the Drizzle schema change; apply the SQL in Supabase before deploying code that reads the column (DATABASE.md).
- Never commit secrets; environment variables are listed in ENVIRONMENT.md.

## Formatting
Prettier is configured but intentionally **not run over the whole repository yet**: a single reformat would rewrite thousands of lines and make history and parallel work harder. Plan: finish the file splits below first, then run `pnpm run format` once in its own commit (and turn `format:check` into a CI gate).

## Cleanup already done
Removed because nothing used them (verified by import search, typecheck and builds): the `artifacts/mockup-sandbox` package, the old PDF layout engine files in `api-server/src/documents` (`paginateBlocks`, `renderBlocksToHtml`, `measure`, `renderModelToBlocks`, `renderModelToPdfHtml`), the browser Supabase client, the `scripts/scraper` import tools for a third-party site, the template `scripts` package (`hello.ts`) and the Replit `post-merge.sh` hook (it ran `db push` against the database), plus 48 unused frontend dependencies (Radix primitives, Uppy, react-hook-form, recharts and others). Dead `href="#"` footer links (Instagram, LinkedIn) were removed and a made-up fallback phone number was replaced by the real business number.

## Refactoring backlog
**Done:** `web/src/lib/api.ts` (1,783 lines) is now `web/src/lib/api/` with 14 modules by area (auth, vehicles, guides, seo, news, answers, agents, site, bookings, customers, partners, proposals, contracts, reviews; the largest is ~260 lines) and an `index.ts` that re-exports everything, so `import … from "@/lib/api"` is unchanged. Shared request helpers live in `core.ts`. New API calls go into the module of their area.

**Remaining:**

Measured with `pnpm run lint:report` (rule `max-lines`, 800 lines) and a line count. Order = risk-adjusted value; each step must keep behaviour identical and ship on its own.

| File | Lines | Plan |
|---|---|---|
| `web/src/pages/admin/dashboard.tsx` | ~4,000 | Split by dashboard tab into modules; highest risk, needs browser verification per tab |
| `web/src/components/admin/ProposalsDashboard.tsx` | ~1,850 | Extract forms, list and PDF dialogs |
| `web/src/components/admin/CarBookingCalendar.tsx` | ~1,650 | Extract calendar grid, booking form, helpers |
| `api/src/routes/guides.ts` | ~1,330 | Split generation, audit/fix, SEO plan and sitemap-related code |
| `api/src/routes/proposals.ts` | ~1,320 | Split PDF building from the routes |
| `web/src/pages/home.tsx`, `ContractGenerator.tsx`, `catalog.tsx`, `vehicle-detail.tsx`, `contracts.ts` | 880–1,120 | Extract sections / helpers |

Other cleanups: remove the `@replit/*` Vite plugins and the `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` fallback, replace the 68 explicit `any` types in the lint report, resolve unused variables, and consolidate the duplicated small text helpers (`plainText`, `slugify`) only after adding tests for each variant (their behaviour differs slightly between files).

Lint baseline when this guide was written: 183 files, 0 errors, ~170 warnings (explicit `any` 68, undefined globals in the old scraper scripts 33, unused variables 32, files over 800 lines 12).
