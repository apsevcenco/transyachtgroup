/**
 * Language versions of public URLs. English lives at the unprefixed URL, fr/ru/ro/ar under
 * /fr, /ru, /ro, /ar. A language version exists only when the content really carries a
 * translation of the required fields; sitemap alternates must match the hreflang tags the
 * prerendered pages declare (artifacts/transyachtgroup/src/lib/langRoutes.ts keeps the same rules).
 */
export const SITE_LANGS = ["en", "fr", "ru", "ro", "ar"] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

type Translations = Record<string, Record<string, unknown> | null | undefined> | null | undefined;

const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0;

/** English plus every language whose translation has a non-empty value for each of `fields`. */
export function availableLangs(translations: unknown, fields: readonly string[]): SiteLang[] {
  const source = translations && typeof translations === "object" ? (translations as Translations) : null;
  return SITE_LANGS.filter((code) => {
    if (code === "en") return true;
    const entry = source?.[code];
    return Boolean(entry) && typeof entry === "object" && fields.every((field) => filled(entry![field]));
  });
}

export function languageUrl(siteUrl: string, path: string, lang: SiteLang): string {
  const clean = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const prefixed = lang === "en" ? clean : `/${lang}${clean === "/" ? "/" : clean}`;
  return `${siteUrl.replace(/\/+$/, "")}${prefixed}`;
}

/** `<xhtml:link>` lines for one page; empty when the page only exists in English. */
export function alternateXml(siteUrl: string, path: string, langs: readonly SiteLang[]): string {
  if (langs.length < 2) return "";
  const lines = langs.map((code) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${languageUrl(siteUrl, path, code)}"/>`);
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${languageUrl(siteUrl, path, "en")}"/>`);
  return lines.join("\n");
}

/**
 * One `<url>` block per language version. `fields(lang)` returns the inner XML (lastmod,
 * changefreq, priority, images); alternates are appended to every block.
 */
export function urlBlocks(siteUrl: string, path: string, langs: readonly SiteLang[], fields: (lang: SiteLang) => string): string {
  const alternates = alternateXml(siteUrl, path, langs);
  return langs
    .map((code) => `  <url>\n    <loc>${languageUrl(siteUrl, path, code)}</loc>\n${fields(code)}${alternates ? `\n${alternates}` : ""}\n  </url>`)
    .join("\n");
}
