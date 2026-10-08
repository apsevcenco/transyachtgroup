/**
 * Language-prefixed URLs. English keeps the unprefixed URLs (`/cars/`); fr/ru/ro/ar live under
 * `/fr/…`, `/ru/…`, `/ro/…`, `/ar/…`. Pure module (no imports) so the React app, the build-time
 * prerender (scripts/generate-seo-pages.mjs) and the tests share one rule set.
 */
export const SITE_LANGS = ["en", "fr", "ru", "ro", "ar"] as const;
export type SiteLang = (typeof SITE_LANGS)[number];
export const PREFIXED_LANGS = ["fr", "ru", "ro", "ar"] as const;

const PREFIX_RE = /^\/(fr|ru|ro|ar)(?=\/|$)/;
const ENGLISH_MARK_RE = /^\/en(?=[/?#]|$)/;
const NEVER_PREFIXED_RE = /^\/(admin|api)(?=[/?#]|$)/;

export function isSiteLang(value: unknown): value is SiteLang {
  return typeof value === "string" && (SITE_LANGS as readonly string[]).includes(value);
}

/** Language encoded in a pathname; anything without a prefix (including /admin) is English. */
export function langFromPathname(pathname: string): SiteLang {
  const match = pathname.match(PREFIX_RE);
  return (match ? match[1] : "en") as SiteLang;
}

/** `/fr/cars/` -> `/cars/`, `/fr` -> `/`. Unprefixed paths are returned unchanged. */
export function stripLangPrefix(pathname: string): string {
  if (!PREFIX_RE.test(pathname)) return pathname;
  return pathname.replace(PREFIX_RE, "") || "/";
}

/**
 * Adds the language prefix to an internal path (query string and hash are kept).
 *  - English, external, relative and `#hash` hrefs are returned unchanged.
 *  - /admin and /api are never prefixed.
 *  - A path that already carries a prefix is left alone (explicit target language).
 *  - `/en/...` is an internal marker meaning "force the English URL": the marker is dropped.
 */
export function withLangPrefix(path: string, lang: SiteLang): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (ENGLISH_MARK_RE.test(path)) return path.replace(ENGLISH_MARK_RE, "") || "/";
  if (lang === "en" || PREFIX_RE.test(path) || NEVER_PREFIXED_RE.test(path)) return path;
  return `/${lang}${path === "/" ? "/" : path}`;
}

/** Force the English (unprefixed) URL for a path, whatever the current language is. */
export function englishPath(path: string): string {
  return `/en${path.startsWith("/") ? path : `/${path}`}`;
}

/** Adds the directory-style trailing slash that the static host expects (pathname only). */
export function withTrailingSlash(pathname: string): string {
  if (pathname === "/" || pathname.endsWith("/")) return pathname;
  return /\.[a-z0-9]+$/i.test(pathname.split("/").pop() || "") ? pathname : `${pathname}/`;
}

/** Absolute URL of a (language-less) route path in one language, with trailing slash. */
export function languageUrl(origin: string, path: string, lang: SiteLang): string {
  const clean = (path || "/").split(/[?#]/)[0] || "/";
  const prefixed = lang === "en" ? clean : `/${lang}${clean === "/" ? "/" : clean}`;
  return `${origin.replace(/\/+$/, "")}${withTrailingSlash(prefixed)}`;
}

/** hreflang alternates for the versions that really exist; always includes en and x-default -> English. */
export function alternateLinks(origin: string, path: string, langs: readonly SiteLang[]): Array<{ hreflang: string; href: string }> {
  const available = SITE_LANGS.filter((code) => code === "en" || langs.includes(code));
  return [
    ...available.map((code) => ({ hreflang: code, href: languageUrl(origin, path, code) })),
    { hreflang: "x-default", href: languageUrl(origin, path, "en") },
  ];
}

// ---------------------------------------------------------------- which translations really exist
type Translations = Record<string, Record<string, unknown> | null | undefined> | null | undefined;
const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0;

/**
 * Languages (besides English) in which `translations` carries a non-empty copy of every `fields`
 * entry. Only non-empty text counts: the API silently falls back to English per field, so a missing
 * field must never produce a language URL.
 */
export function translatedLangs(translations: Translations, fields: readonly string[]): SiteLang[] {
  if (!translations || typeof translations !== "object") return [];
  return PREFIXED_LANGS.filter((code) => {
    const entry = translations[code];
    return Boolean(entry) && typeof entry === "object" && fields.every((field) => filled(entry![field]));
  });
}

/** Guides and news: title + body must be translated. */
export function articleLangs(item: { translations?: unknown }): SiteLang[] {
  return ["en", ...translatedLangs(item.translations as Translations, ["title", "content"])] as SiteLang[];
}

/** Vehicles: translated name + description. */
export function vehicleLangs(item: { translations?: unknown }): SiteLang[] {
  return ["en", ...translatedLangs(item.translations as Translations, ["name", "description"])] as SiteLang[];
}

// ---------------------------------------------------------------- links inside translated content
const STATIC_ROOTS = new Set(["/", "/cars", "/yachts", "/about", "/guides", "/news", "/privacy", "/legal"]);

/**
 * Rewrites an internal href found in translated copy (guide/news bodies) to the same-language URL
 * when that page exists in the language: always for the hub pages, services and locations, and for
 * any other path the optional `exists` callback accepts (detail pages are only known at build time).
 * Everything else (answers, untranslated details, external links) stays on the English URL.
 */
export function localizeInternalHref(href: string, lang: SiteLang, exists?: (normalizedPath: string) => boolean): string {
  if (lang === "en" || !href.startsWith("/") || href.startsWith("//")) return href;
  const pathname = href.split(/[?#]/)[0];
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (STATIC_ROOTS.has(normalized) || /^\/(services|locations)\/[^/]+$/.test(normalized) || exists?.(normalized)) {
    return withLangPrefix(href, lang);
  }
  return href;
}
