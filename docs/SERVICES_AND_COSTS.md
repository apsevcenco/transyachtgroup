# Third-party services, replacement options and costs

The code is not locked into any vendor. Each service sits behind a small layer and can be replaced. What matters on a sale is **who owns the accounts**. Fill in the "plan / monthly cost" column from the current invoices at handover; prices change, so they are intentionally not hard-coded here.

| Service | Role | Where it is used | Account owner today | Plan / monthly cost | Replacement options |
|---|---|---|---|---|---|
| **GitHub** | Source code, deploy trigger (push to `main`) | repository `apsevcenco/transyachtgroup` | seller | free / paid | any Git host; Render connects to GitLab/Bitbucket too |
| **Render** | Hosting: static site (frontend) + web service (API) | two services, same-origin `/api` rewrite, deploy hook | seller | per service | Vercel/Netlify (frontend), Railway/Fly/VPS (API) — a plain Node 24 app |
| **Supabase** | PostgreSQL database and file storage | `DATABASE_URL`/`SUPABASE_DATABASE_URL`, storage buckets | seller | free / Pro | any PostgreSQL (Neon, RDS, own server); storage → S3-compatible |
| **Resend** | Outgoing and inbound email for the partner CRM and proposals | `RESEND_API_KEY`, inbound webhook, sending domain | seller | free / paid | Postmark, SendGrid, Mailgun (rewrite `src/lib/resendMail.ts`) |
| **OpenAI** | Article/answer generation, SEO fixes, partner assistant, optional images | `OPENAI_API_KEY`, `OPENAI_CONTENT_MODEL`, `OPENAI_ANSWERS_MODEL` | seller | pay-per-use | Anthropic or another LLM (single request layer per route) |
| **Domain registrar / DNS** | transyachtgroup.com | DNS records (site, email, verification TXT) | seller | yearly | transfer to the buyer |
| **Google Search Console** | Indexing, search analytics, sitemap | domain property | seller | free | add the buyer as owner |
| **Bing Webmaster Tools** | Bing/Copilot/ChatGPT-search indexing, IndexNow | sitemap + IndexNow key file | seller | free | add the buyer as owner |
| **Google Business Profile** | Local/maps presence | listing | seller | free | transfer ownership |
| **Google Ads / Analytics** (optional) | Conversion tracking | `VITE_GOOGLE_ADS_*` | seller | pay-per-use | buyer's own accounts |
| **WhatsApp Cloud API** (optional) | Review-request automation | `WHATSAPP_*` | seller | per message | disable or replace |
| **Frankfurter API** | Public EUR exchange rates shown on vehicle pages | called from the browser, no key | public | free | any rates API |

## What must be transferred

1. Ownership/admin rights on GitHub, Render, Supabase, Resend, OpenAI (or the buyer creates new accounts and supplies keys).
2. Domain and DNS control.
3. Search Console, Bing Webmaster Tools, Google Business Profile ownership.
4. Fonts and image rights (see HANDOVER.md, "Licences").

## Cost drivers to expect

- **Render**: one static site plus one web service; the API service plan decides uptime (free plans sleep).
- **Supabase**: grows with database size and storage (vehicle photos are the bulk).
- **OpenAI**: proportional to how much content is generated; a few cents per article or answer, a moderate monthly amount at the current publishing pace.
- **Resend**: depends on partner mailing volume.

## Replacing a service (outline)

- **Database**: provision PostgreSQL, apply `lib/db/migrations/*.sql` in order, restore data from a dump, set `DATABASE_URL`.
- **Email**: implement the same send/receive functions against the new provider, update the webhook route and the DNS records for the sending domain.
- **LLM**: all calls go through a JSON-completion helper per route (`requestOpenAiJson`); swap the HTTP call and keep the prompts.
- **Hosting**: build commands and routing rules are in DEPLOYMENT.md; the frontend needs the same rewrite rules on any static host.
