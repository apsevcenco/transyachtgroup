# Handover package

This document describes what a buyer receives and how the transfer is carried out. It is a working checklist, not a legal agreement; ownership and warranty terms belong in the sales contract.

## 1. What is delivered

- Source code: GitHub repository (full history) — public site, admin panel, API, database schema and migrations, prerender/SEO tooling, tests.
- Production deployment: Render services, Supabase project, Resend domain/webhook, domain and DNS.
- Content: vehicles and yachts, guides, news, answers, site texts, translations.
- Search presence: Search Console and Bing properties, sitemap, IndexNow key, Google Business Profile.
- This documentation (`docs/`).

## 2. Transfer steps

| # | Step | Done |
|---|---|---|
| 1 | Add the buyer as owner on GitHub (or transfer the repository) | ☐ |
| 2 | Transfer or recreate the Render services (static site + API); re-enter environment variables (ENVIRONMENT.md); recreate the Deploy Hook | ☐ |
| 3 | Transfer the Supabase project (or restore a dump into the buyer's project and update `DATABASE_URL`); confirm storage buckets and policies (SECURITY_DEPLOYMENT.md) | ☐ |
| 4 | Move the Resend account or create a new one; verify the sending domain DNS; recreate the inbound address and webhook; update `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `PARTNER_REPLY_TO` | ☐ |
| 5 | OpenAI: buyer's own API key and billing | ☐ |
| 6 | Domain registrar and DNS control transferred | ☐ |
| 7 | Search Console and Bing Webmaster Tools: add the buyer as owner, then remove the seller | ☐ |
| 8 | Google Business Profile ownership transferred | ☐ |
| 9 | Google Ads/Analytics (if used) transferred or replaced | ☐ |
| 10 | Change admin password and TOTP secret; revoke all seller keys and sessions | ☐ |
| 11 | Remove the seller from every account after acceptance | ☐ |

## 3. Acceptance checklist (run together)

- `pnpm install`, `pnpm run typecheck`, `pnpm test` pass on a clean machine.
- Frontend build completes (prerender + SEO check) and the site deploys from `main`.
- Public pages open; `view-source:` of a service page, an answer and a vehicle shows full text.
- `/admin` login works with the new credentials; create, edit and hide a test vehicle.
- A test contact-form request arrives in **Requests**.
- Partner CRM: send a test email to an owned address; the reply appears in the contact history.
- Publish a test answer (as a draft first), confirm the automatic rebuild runs, then delete or unpublish it.
- `sitemap.xml` and the four API sitemaps load; `robots.txt` is correct; an unknown URL returns 404.
- Backups: a Supabase backup exists and a dump restores into a scratch database.

## 4. Licences and rights to confirm in the contract

- **Fonts**: the interface uses the typeface "Porter FT" (see `scripts/gen-fonts.mjs` and `public/fonts`). Confirm its licence covers the buyer for commercial web use, or replace the font.
- **Images and logos**: vehicle and yacht photos, logo and brand assets — confirm who owns them and that the buyer may use them. Some listing images may be hosted by third parties.
- **Open-source dependencies**: standard permissive licences (MIT and similar); see `pnpm-lock.yaml`.
- **Generated content**: articles and answers were produced with AI assistance and reviewed by the owner; keep a statement of who is responsible for factual accuracy.
- **Personal data**: the database holds personal data (requests, customers, partner contacts). Transfer must comply with GDPR (lawful basis, notice, data-processing terms). See `GDPR-DATA-RETENTION.md`.

## 5. Known limitations and open items

- Language versions share one URL per page (client-side switching); prefixed language URLs are a planned improvement.
- Some fleet data needs editorial cleanup: yacht names are in a technical format (e.g. "LEOPARD – 27M – 12 Passagers"), one listing combines three models, a typo in one name, and Courchevel is mentioned in few descriptions.
- Answers are English-only.
- A weak news article (`mercedes-wedding-cars-on-the-french-riviera…`) scores low in the SEO audit.
- Migrations are applied manually in Supabase (see DATABASE.md).
- A few build-time leftovers from an earlier hosting setup remain (the `@replit/*` Vite plugins); they are harmless and listed in [ENGINEERING.md](ENGINEERING.md).

## 6. Support and handover period

Recommended in the contract: a fixed period (for example 1–2 months) of email/chat support for questions, a short video or live walkthrough of the admin panel and of the release procedure, and a list of what is out of scope.

## 7. Contacts and inventories to fill in at handover

| Item | Value |
|---|---|
| Domain registrar and expiry date | |
| Render workspace / service names | |
| Supabase project reference | |
| Resend domain | |
| Monthly costs per service (see SERVICES_AND_COSTS.md) | |
| Who holds the TOTP recovery material | |
