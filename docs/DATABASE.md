# Database

PostgreSQL on Supabase, accessed with Drizzle ORM (`lib/db`). Schema definitions: `lib/db/src/schema/index.ts`. Plain SQL migrations: `lib/db/migrations/NNNN_name.sql`.

## Main data areas

| Area | Tables (see migrations) | Notes |
|---|---|---|
| Fleet | `vehicles`, deletion log, `agents` | `category` = `car` or `yacht`; `specs` JSON holds specifications and the long description; `translations` JSON holds fr/ru/ro/ar copy; soft-delete with trash and log |
| Site content | `site_content` | Editable texts (about, footer, contact details) |
| Public content | `guides`, `news`, `answers` | SEO fields, translations, scheduling, audit data, search metrics |
| Bookings | rental history and bookings tables, `contracts`, `customers` | Booking photos in private storage |
| Requests & reviews | `contact_requests`, `customer_reviews`, review-delivery settings | |
| Analytics | `analytics_events`, `seo_page_metrics` | First-party events and imported search metrics |
| SEO intelligence | `seo_content_plans`, `seo_competitors`, `seo_competitor_snapshots`, `seo_opportunities` | |
| Partner CRM | `partner_contacts`, `partner_messages`, business letters | Email history, follow-ups, opt-outs |
| System | `admin_sessions`, `app_state` | Hashed admin session tokens; small key/value state (e.g. digest bookkeeping) |

## Migrations
- Files are numbered and applied **manually**: open Supabase → SQL Editor, run the file contents in numeric order. There is no migration runner in production.
- Apply a migration **before** deploying code that needs it. Keep a record of which number was applied last.
- Latest at the time of writing: `0042_seo_page_metrics.sql`.
- Two files share the number 0037 (`answers` and `customers_crm`); they are independent.
- Do not run schema push/seed tooling against production data.

## Backups
- Enable Supabase backups (daily on paid plans; point-in-time recovery optional).
- Take a manual dump before each risky migration (`pg_dump` custom format).
- Test restoring a dump into a scratch database at least once before handover.

## Privacy
Personal data (contact requests, customers, partner contacts, booking data) is subject to GDPR; retention rules are in `GDPR-DATA-RETENTION.md`. Private booking photos live in the private storage bucket; see `SECURITY_DEPLOYMENT.md` for the required storage policies.
