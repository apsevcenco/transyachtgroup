# Environment variables

Never commit values. Store them in the hosting secret manager (Render → Environment). `VITE_*` variables are embedded into the public frontend at build time, so they must never contain secrets.

## API service (`artifacts/api-server`)

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | yes | Port the server listens on (set by Render) |
| `NODE_ENV` | yes | `production` in production |
| `SUPABASE_DATABASE_URL` or `DATABASE_URL` | yes | PostgreSQL connection string (Supabase pooler URI). `SUPABASE_DATABASE_URL` takes precedence |
| `ADMIN_PASSWORD` | yes | Admin panel password |
| `ADMIN_TOTP_SECRET` | recommended | Base32 TOTP secret; when set, login also needs a 6-digit code |
| `SUPABASE_URL` | yes for private photos | Project URL for server-side storage access |
| `SUPABASE_SERVICE_ROLE_KEY` | yes for private photos | Server-only key (private booking photos, signed URLs) |
| `CORS_ORIGINS` | optional | Extra allowed origins, comma-separated (same-origin works without it) |
| `OPENAI_API_KEY` (or `AI_INTEGRATIONS_OPENAI_API_KEY`) | for AI tools | OpenAI key |
| `OPENAI_BASE_URL` (or `AI_INTEGRATIONS_OPENAI_BASE_URL`) | optional | Alternative API base URL |
| `OPENAI_CONTENT_MODEL` | optional | Model for guides/news (defaults to `gpt-4o`) |
| `OPENAI_ANSWERS_MODEL` | optional | Model for answers (defaults to `gpt-4.1`) |
| `OPENAI_IMAGE_MODEL` | optional | Model for cover-image generation |
| `RESEND_API_KEY` | for email | Resend API key |
| `RESEND_WEBHOOK_SECRET` | for inbound mail | Svix signing secret of the Resend webhook |
| `PARTNER_REPLY_TO` | for partner CRM | Resend receiving address that replies are routed to |
| `PARTNER_NOTIFY_EMAIL` | optional | Recipient of the daily partner digest |
| `PARTNER_DIGEST_ENABLED` / `PARTNER_DIGEST_HOUR` | optional | Switch and local hour for the daily digest |
| `PROPOSAL_EMAIL_FROM`, `REVIEW_EMAIL_FROM` | for email | From addresses for proposals and review requests |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_REVIEW_TEMPLATE_NAME`, `WHATSAPP_REVIEW_TEMPLATE_LANGUAGE` | optional | WhatsApp review automation |
| `PDF_IMAGE_HOSTS` | recommended | Allow-list of image hostnames used in PDF exports |
| `SEO_INTELLIGENCE_CRON_SECRET` | optional | Bearer secret for the scheduled SEO-intelligence endpoint (needs an external cron) |
| `RENDER_DEPLOY_HOOK_URL` | recommended | Render Deploy Hook; triggers a debounced rebuild when public content changes. Treat as a secret |
| `INDEXNOW_KEY` | optional | IndexNow key; defaults to the value of the key file served from the site root |
| `LOG_LEVEL` | optional | Log verbosity |

## Static site build (`artifacts/transyachtgroup`)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL (browser image uploads). Without it the admin panel fails on load |
| `VITE_SUPABASE_ANON_KEY` | yes | Supabase anon (public) key |
| `VITE_API_URL` / `API_URL` | optional | Absolute API URL used by the prerender at build time. If unset the prerender reads `https://www.transyachtgroup.com/api` |
| `VITE_SITE_URL` | optional | Canonical site URL override |
| `VITE_GOOGLE_ADS_ID`, `VITE_GOOGLE_ADS_FORM_CONVERSION_LABEL`, `VITE_GOOGLE_ADS_PHONE_CONVERSION_LABEL`, `VITE_GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL` | optional | Google Ads conversion tracking |
| `BASE_PATH` | optional | Sub-path deployment (default `/`) |

## Notes
- Rotate any key that was ever shared in chat, email or screenshots.
- After a sale, revoke the seller's keys and issue new ones in the buyer's accounts.
