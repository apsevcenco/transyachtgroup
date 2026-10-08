# Language URLs (fr / ru / ro / ar)

English stays at the unprefixed URLs. French, Russian, Romanian and Arabic live under `/fr/`, `/ru/`, `/ro/`, `/ar/`
(for example `/fr/services/luxury-car-rental-cannes/`). `/admin` and `/api` are never prefixed.

## How it works

* **The URL is the language.** `src/lib/langRoutes.ts` (pure, shared with the build and the tests) parses and builds prefixed URLs.
  `LanguageProvider` reads the language from the pathname; `localStorage` and the browser language never override it and nothing
  redirects automatically. Legacy `?lang=fr` links are replaced client-side with the real `/fr/...` URL.
* **Routing.** `useLangLocation` (a wouter location hook) strips the prefix before routes match and adds the current
  language's prefix to every `setLocation(...)`. Plain `<a href>` links use `lp(path)` from `useLanguage()`.
  Answers have language versions when they carry a complete translation (see below); `englishPath()` forces the English URL where a link must not follow the language.
* **Switcher.** The language menu renders real links to the same page in each language
  (`currentPageInLanguage`); clicks navigate client-side, middle/ctrl-clicks open the real URL.
* **Head.** `SeoHead` computes canonical, hreflang, `<html lang>` / `dir` from the URL language and the list of languages in
  which the page really exists (`langs`). A language page without a translation gets `noindex,follow` and a canonical pointing
  to the English URL, and advertises no alternates.
* **Prerender** (`scripts/generate-seo-pages.mjs`) writes `dist/public/<lang>/<path>/index.html` only where a translation exists,
  and derives every hreflang set and sitemap alternate from the pages it actually generated:

  | Content | Language page exists when |
  | --- | --- |
  | Service pages (23) | translated copy exists in `src/data/serviceLandingsI18n.ts` |
  | Location pages (6) | always (`TEXT[lang]` in `src/data/locations.ts`) |
  | Home, cars, yachts hubs | always (`src/data/routeSeoCopy.ts`) |
  | About, privacy, legal | the CMS text (`/api/content?lang=`) differs from the English text |
  | Guides, news | `translations[lang]` has non-empty `title` and `content` |
  | Guides / news hub | at least one article is translated into that language |
  | Vehicles | `translations[lang]` has non-empty `name` and `description` |
  | Answers | the API serves a complete translation (`/api/answers?lang=<code>` returns `language` = that code) |
  | Answers hub | at least one answer is translated into that language |

* **Sitemaps.** `pages-sitemap.xml` and the API sitemaps (`/api/vehicles|guides|news-sitemap.xml`) list every language URL with
  `xhtml:link` alternates identical to the page's hreflang tags. The old fake alternates (all pointing at one URL) are gone.
* **Answers.** Translations are produced in the admin (Answers → AI translations for fr, ru, ro, ar, stored in the `translations` column) and
  must be complete (question, direct answer, explanation). The prerender fetches `/answers?lang=<code>` for each language and keeps only items served in
  that language, so an answer without a translation never gets a language page. Each language page has translated title, H1, direct answer, explanation,
  FAQ and QAPage/FAQPage JSON-LD (`inLanguage`); "Related questions" blocks on language pages link to the translated answer when it exists, else to the English one.
  `/api/answers-sitemap.xml` lists every language URL with the same alternates; `robots.txt` allows it.
* **Vehicle pages.** The English tidy-ups (`seoVehicleName`, `vehicleShortName`) and the generated factual yacht summary (`yachtSummary`) are
  English-only: language pages use the translated name and never show or prerender the summary. The "Explore" links point to the
  same-language service pages and only to related vehicles that exist in that language.
* **Vehicle slugs** always come from the English name (the API sends `seoSlug` for translated vehicles), so
  `/fr/cars/<slug>/` and `/cars/<slug>/` share one slug.

## Render rewrite rules to add (Redirects/Rewrites -> Rewrite)

Static files (the prerendered pages) are served first. These rules only catch slash-less URLs (`/fr/cars`, which the inline script in
`index.html` normalises to `/fr/cars/`) and client-rendered URLs that were not prerendered. 64 rules, one block per language:

| Source | Destination | Action |
| --- | --- | --- |
| `/fr` | `/index.html` | Rewrite |
| `/fr/cars` | `/index.html` | Rewrite |
| `/fr/cars/*` | `/index.html` | Rewrite |
| `/fr/yachts` | `/index.html` | Rewrite |
| `/fr/yachts/*` | `/index.html` | Rewrite |
| `/fr/about` | `/index.html` | Rewrite |
| `/fr/privacy` | `/index.html` | Rewrite |
| `/fr/legal` | `/index.html` | Rewrite |
| `/fr/guides` | `/index.html` | Rewrite |
| `/fr/guides/*` | `/index.html` | Rewrite |
| `/fr/news` | `/index.html` | Rewrite |
| `/fr/news/*` | `/index.html` | Rewrite |
| `/fr/answers` | `/index.html` | Rewrite |
| `/fr/answers/*` | `/index.html` | Rewrite |
| `/fr/locations/*` | `/index.html` | Rewrite |
| `/fr/services/*` | `/index.html` | Rewrite |
| `/ru` | `/index.html` | Rewrite |
| `/ru/cars` | `/index.html` | Rewrite |
| `/ru/cars/*` | `/index.html` | Rewrite |
| `/ru/yachts` | `/index.html` | Rewrite |
| `/ru/yachts/*` | `/index.html` | Rewrite |
| `/ru/about` | `/index.html` | Rewrite |
| `/ru/privacy` | `/index.html` | Rewrite |
| `/ru/legal` | `/index.html` | Rewrite |
| `/ru/guides` | `/index.html` | Rewrite |
| `/ru/guides/*` | `/index.html` | Rewrite |
| `/ru/news` | `/index.html` | Rewrite |
| `/ru/news/*` | `/index.html` | Rewrite |
| `/ru/answers` | `/index.html` | Rewrite |
| `/ru/answers/*` | `/index.html` | Rewrite |
| `/ru/locations/*` | `/index.html` | Rewrite |
| `/ru/services/*` | `/index.html` | Rewrite |
| `/ro` | `/index.html` | Rewrite |
| `/ro/cars` | `/index.html` | Rewrite |
| `/ro/cars/*` | `/index.html` | Rewrite |
| `/ro/yachts` | `/index.html` | Rewrite |
| `/ro/yachts/*` | `/index.html` | Rewrite |
| `/ro/about` | `/index.html` | Rewrite |
| `/ro/privacy` | `/index.html` | Rewrite |
| `/ro/legal` | `/index.html` | Rewrite |
| `/ro/guides` | `/index.html` | Rewrite |
| `/ro/guides/*` | `/index.html` | Rewrite |
| `/ro/news` | `/index.html` | Rewrite |
| `/ro/news/*` | `/index.html` | Rewrite |
| `/ro/answers` | `/index.html` | Rewrite |
| `/ro/answers/*` | `/index.html` | Rewrite |
| `/ro/locations/*` | `/index.html` | Rewrite |
| `/ro/services/*` | `/index.html` | Rewrite |
| `/ar` | `/index.html` | Rewrite |
| `/ar/cars` | `/index.html` | Rewrite |
| `/ar/cars/*` | `/index.html` | Rewrite |
| `/ar/yachts` | `/index.html` | Rewrite |
| `/ar/yachts/*` | `/index.html` | Rewrite |
| `/ar/about` | `/index.html` | Rewrite |
| `/ar/privacy` | `/index.html` | Rewrite |
| `/ar/legal` | `/index.html` | Rewrite |
| `/ar/guides` | `/index.html` | Rewrite |
| `/ar/guides/*` | `/index.html` | Rewrite |
| `/ar/news` | `/index.html` | Rewrite |
| `/ar/news/*` | `/index.html` | Rewrite |
| `/ar/answers` | `/index.html` | Rewrite |
| `/ar/answers/*` | `/index.html` | Rewrite |
| `/ar/locations/*` | `/index.html` | Rewrite |
| `/ar/services/*` | `/index.html` | Rewrite |

Compact alternative (8 rules): `/fr`, `/fr/*`, `/ru`, `/ru/*`, `/ro`, `/ro/*`, `/ar`, `/ar/*` -> `/index.html`. Unknown URLs under a
prefix then return the SPA shell (the React 404 page, `noindex`) instead of the real `404.html`.

## Deploy order

1. Deploy the API first (`seoSlug`, sitemap alternates), then the static site (the build calls the live API).
2. Add the Render rewrite rules.
3. Submit `https://www.transyachtgroup.com/sitemap.xml` again in Search Console.

## Rollback

* Remove the Render rules for the language prefixes. The `/fr/...` pages disappear from the host and English is untouched.
* To roll back in code, revert the commit(s) of this change: English URLs, markup and prerender output are unchanged by it
  (verified byte-for-byte except for the hreflang links).

## Known gaps

* An answer without a complete translation in a language shows English text under `/fr/answers/<slug>/` when reached through the language switcher; the page is `noindex` with an English canonical and is not prerendered or listed in the sitemap.
* Content check: a translation whose question was left in English (the `book-courchevel-transfer-christmas-new-year` Russian one at the time of writing) is still published; `verify-seo` prints a warning for it. Re-translate it in the admin.
* Vehicles: only vehicles with a translation get language pages; for the others a `/fr/cars/<slug>/` URL still renders in the
  client (French chrome, English text) but is `noindex` with an English canonical.
* Location pages keep Latin city names in Russian text (the sentence templates cannot decline them); Arabic and Romanian use local names.
* hreflang for About/Privacy/Legal in the React app assumes the CMS has translations (true today); the build skips pages whose CMS text is missing.
