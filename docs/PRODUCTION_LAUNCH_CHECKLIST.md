# Production Launch Checklist

Use this checklist before publishing or promoting Yachtworth production releases. Treat it as the required launch QA pass unless the user narrows the scope.

## SEO And Indexing

- SSR, SSG, or prerendering is configured for public pages where needed.
- `robots.txt` is present and production-safe.
- `sitemap.xml` is present and current.
- Canonical URLs are present on public pages.
- Duplicate URLs are removed or redirected: trailing slash variants, query duplicates, HTTP/HTTPS, www/non-www.
- 301 redirects are configured for old or duplicate routes.
- A branded 404 page exists and works.
- Meta title and description are unique and useful.
- OpenGraph and social preview tags are configured.
- Favicon, Apple touch icon, and webmanifest are present.
- Schema.org JSON-LD is added where useful.
- Breadcrumb structured data is added for nested content.
- Article/Product/Organization/LocalBusiness/etc. schema matches the page type where applicable.
- `hreflang` is configured if localized pages exist.
- Service, auth, admin, internal, and staging pages are `noindex` where appropriate.
- Production pages are not accidentally `noindex`.
- Googlebot rendering is checked.
- Google Rich Results validation is checked for structured pages.

## Performance

- Core Web Vitals are checked.
- LCP is optimized.
- CLS is low and visual layout does not jump.
- Images and heavy blocks use lazy loading where appropriate.
- Caching headers are configured.
- CDN is configured where needed.
- Gzip or Brotli compression is enabled.
- Images are responsive and appropriately sized.
- JS and CSS bundles are reviewed for obvious excess.
- Final Playwright pass is completed.

## Legal And Compliance

- Privacy Policy is present and linked.
- Cookie Policy is present and linked.
- Terms / User Agreement is present and linked.
- Offer / public offer is present where required.
- Contact details are present.
- Company details and registration details are present where required.
- Company / Impressum page is present where required.
- Cookie banner is present where required.
- Consent mode is connected to cookie choices.
- Data processing consent is present on every relevant form.
- Age confirmation exists where required.
- GDPR / DS / local compliance requirements are reviewed.

## Analytics And Marketing

- Google Tag Manager is installed where required.
- Google Analytics / GA4 is configured where required.
- Yandex Metrica is configured where required.
- Advertising pixels are installed where required.
- Conversion events are configured.
- Form goals are configured.
- UTM structure is documented and tested.
- Consent mode prevents tracking before consent where required.
- Analytics events are verified in realtime/debug views.

## Security

- HTTPS is enabled.
- CSP is configured.
- `X-Frame-Options` or `frame-ancestors` is configured.
- Forms and API endpoints have rate limiting where appropriate.
- Captcha or anti-spam protection is present where needed.
- Secrets are not exposed in frontend code, repository files, source maps, logs, or public artifacts.
- Dependencies are current enough for release.
- Vulnerability checks are reviewed.
- Staging/basic-auth/noindex settings have not leaked into production.

## Infrastructure

- Production domain is connected.
- DNS records are correct.
- TTL values are reviewed.
- CDN and hosting production configuration are checked.
- Backups are configured.
- Backup schedule/time is known.
- Backup monitoring is configured.
- Uptime and error monitoring are configured.
- Production logs are accessible.
- Rollback path is known.

## Content And UX

- No lorem ipsum or placeholder content remains.
- Texts are proofread.
- All important links are checked for 404s and wrong targets.
- Forms submit successfully.
- Emails are delivered.
- Email domain is configured.
- SPF, DKIM, and DMARC are configured.
- Accessibility is checked.
- Cross-browser testing is completed.
- Mobile and responsive layouts are checked.
- Locales, dates, and currencies are correct.
- Logo and brand assets are current.
- Headings and page labels are current.
- Social links and contact links are current.

## Final Release Pass

- Full Playwright pass is completed.
- Google Rich Results check is completed where applicable.
- Googlebot rendering check is completed.
- Production URL is checked directly.
- Staging, basic auth, and accidental noindex are removed from production.
- Launch report or AI export is saved when requested.
