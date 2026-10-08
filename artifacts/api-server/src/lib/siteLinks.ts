/** Public pages AI-written content may link to (keep in sync with src/data in the frontend). */
const SERVICE_SLUGS = [
  "luxury-car-rental-cannes", "luxury-car-rental-monaco", "luxury-car-rental-nice", "luxury-car-rental-saint-tropez",
  "luxury-car-rental-antibes", "luxury-car-rental-courchevel", "courchevel-private-transfers",
  "geneva-airport-to-courchevel-transfer", "lyon-airport-to-courchevel-transfer", "private-jet-to-car-transfer-courchevel",
  "yacht-charter-cannes", "yacht-charter-monaco", "yacht-charter-nice", "yacht-charter-saint-tropez",
  "lamborghini-rental-french-riviera", "lamborghini-rental-courchevel", "mercedes-rental-french-riviera",
  "mercedes-rental-courchevel", "ferrari-rental-french-riviera", "ferrari-rental-courchevel",
  "rolls-royce-rental-french-riviera", "rolls-royce-rental-courchevel", "bentley-rental-courchevel",
];
const LOCATION_SLUGS = ["cannes", "monaco", "nice", "antibes", "saint-tropez", "courchevel"];

export const INTERNAL_PATHS: string[] = [
  "/cars/",
  "/yachts/",
  "/about/",
  ...SERVICE_SLUGS.map((slug) => `/services/${slug}/`),
  ...LOCATION_SLUGS.map((slug) => `/locations/${slug}/`),
];

const INTERNAL_SET = new Set(INTERNAL_PATHS);

/** "/services/x" or "https://www.transyachtgroup.com/services/x/?a=1" -> "/services/x/" (or null). */
export function normalizeInternalPath(value: string): string | null {
  const trimmed = value.trim();
  const path = trimmed.replace(/^https?:\/\/(?:www\.)?transyachtgroup\.com(?=\/|$)/i, "").split(/[?#]/)[0] || "/";
  if (!path.startsWith("/")) return null;
  const withSlash = path.endsWith("/") ? path : `${path}/`;
  return INTERNAL_SET.has(withSlash) ? withSlash : null;
}

/**
 * Public path for any link on our own domain, or null for anything else. Query strings and hashes are
 * dropped and a trailing slash is added, matching the URLs we publish (no language query parameters).
 */
export function canonicalInternalHref(value: string): string | null {
  try {
    const url = value.startsWith("/") && !value.startsWith("//")
      ? new URL(value, "https://www.transyachtgroup.com")
      : new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "www.transyachtgroup.com") return null;
    if (url.pathname !== "/" && !url.pathname.endsWith("/")) url.pathname += "/";
    return url.pathname;
  } catch {
    return null;
  }
}

/** Keeps links to real pages (normalised to the canonical trailing-slash form); unwraps all others. */
export function restrictInternalLinks(html: string): string {
  return html.replace(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi, (_match, dq, sq, inner) => {
    const normalized = normalizeInternalPath(dq ?? sq ?? "");
    return normalized ? `<a href="${normalized}">${inner}</a>` : inner;
  });
}
