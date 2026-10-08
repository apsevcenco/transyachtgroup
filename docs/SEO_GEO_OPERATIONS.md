# SEO and GEO (AI-search) operations

Goal: be found in Google and cited by AI assistants for luxury car rental, VIP transfers and yacht charter on the French Riviera and in Courchevel.

## What the system does automatically

| Mechanism | Where | Effect |
|---|---|---|
| **Prerender** | `artifacts/transyachtgroup/scripts/generate-seo-pages.mjs` | After every build, each public URL gets real HTML: title, canonical, Open Graph, structured data (Article, NewsArticle, QAPage/FAQPage, Service, Product/Vehicle, BreadcrumbList) and the full body text |
| **Build gate** | `scripts/verify-seo.mjs` | The build fails if required SEO signals are missing (one `<h1>`, canonical, body text, robots rules, sitemap entries, 404 page) |
| **Sitemaps** | `/sitemap.xml` → `pages-sitemap.xml` (built) + `/api/{vehicles,guides,news,answers}-sitemap.xml` | Complete, clean URLs with `lastmod` where known |
| **robots.txt** | `public/robots.txt` | Allows the public site and the four API sitemaps, blocks `/admin` and the rest of `/api` |
| **Real 404** | `dist/public/404.html` + host rules | Unknown URLs return HTTP 404 (see DEPLOYMENT.md) |
| **IndexNow** | `api-server/src/lib/siteRebuild.ts` | After public content changes, all sitemap URLs are pushed to Bing and partners; key file lives at the site root |
| **Auto-rebuild** | same file | Content edits trigger a debounced rebuild so crawlers see new text quickly |
| **Internal linking** | `src/data/answerLinks.ts`, `vehicleContent.ts`, footer, service pages | Service ↔ answer ↔ vehicle cross-links, mirrored in the prerendered HTML |
| **Link whitelist** | `api-server/src/lib/siteLinks.ts` and `guides.ts` | AI can only link to real pages |

## Content strategy
- **Services and locations**: 25 service landing pages and 6 location pages (copy in `src/data/serviceLandings.ts`, `locations.ts`). Courchevel has a full cluster (transfers from Geneva, Lyon, Chambéry, Turin; brand rentals).
- **Answers** (GEO): short, factual question pages with a self-contained direct answer, a verified fact sheet and FAQ. They are the pages AI assistants cite. Keep the fact sheet in `answers.ts` (`BUSINESS_FACTS`) accurate: distances, durations, winter rules.
- **Guides and news**: long-form articles with the audit/fix workflow; aim for 1,000+ words, one primary keyword, 3+ internal links.
- **Fleet pages**: unique descriptions and clean names matter most for brand + place queries ("Ferrari rental Courchevel").

## Routine
**After publishing**
1. Wait for the rebuild (≈10 minutes). View the page source and confirm the text is present.
2. In Search Console, inspect the URL and request indexing for important new pages.

**Weekly**
- Search Console → Performance: queries and pages; Pages report for indexing problems.
- Bing Webmaster Tools → IndexNow/Sitemaps.
- Publish 1–2 answers or articles on seasonal topics (Courchevel season, Cannes Film Festival, Monaco Grand Prix, yacht shows).

**Monthly**
- Re-audit all guides, news and answers; fix anything below 90.
- Check for cannibalisation (similar articles competing for one keyword).
- Update the fact sheet and service copy when conditions change.
- Confirm business details (name, address, phone, hours, links) are identical on the site, Google Business Profile and directories.

## Current status and gaps
- Language versions (fr/ru/ro/ar) are selected client-side on the same URLs, so search engines mainly index English. Language-prefixed URLs with real hreflang are planned/in progress.
- Answers exist in English only.
- Off-site authority (directories, partner mentions, press) is the main remaining lever for AI-search citations.
- The list endpoints `/api/guides` and `/api/news` return full article text; a lighter list endpoint would speed up pages and builds.

## Rules that protect the brand
No invented prices, amenities, awards or guarantees. Availability, terms and quotations are confirmed individually. The audit flags unverifiable claims and marketing filler; treat flags as errors.
