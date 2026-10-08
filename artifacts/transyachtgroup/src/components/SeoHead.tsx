import { useEffect } from "react";

import { type LangCode } from "@/contexts/LanguageContext";
import {
  SITE_LANGS,
  alternateLinks,
  languageUrl,
  stripLangPrefix,
} from "@/lib/langRoutes";

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://www.transyachtgroup.com"
).replace(/\/+$/, "");

type JsonLd = Record<string, unknown>;

interface SeoHeadProps {
  title: string;
  description: string;
  /** Route path; a language prefix is ignored (the language comes from `lang`). */
  path?: string;
  lang: LangCode;
  /**
   * Languages in which this page really exists (translated content present). Defaults to every
   * language, which is right for the static pages. When the current language is not listed the
   * page is an untranslated copy: its canonical points at the English URL and it is noindex.
   */
  langs?: readonly LangCode[];
  image?: string;
  robots?: string;
  type?: "website" | "product";
  jsonLd?: JsonLd | JsonLd[];
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) =>
    element!.setAttribute(key, value),
  );
  return element;
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) =>
    element!.setAttribute(key, value),
  );
  return element;
}

/**
 * Absolute URL of a route in one language. The production static host resolves generated route
 * HTML only for directory URLs, so non-root paths always end with a slash.
 */
export function pageUrl(path: string, lang: LangCode) {
  return languageUrl(SITE_URL, stripLangPrefix(path || "/"), lang);
}

export function canonicalUrl(path: string) {
  return pageUrl(path, "en");
}

export function SeoHead({
  title,
  description,
  path = window.location.pathname,
  lang,
  langs = SITE_LANGS,
  image = `${SITE_URL}/opengraph.jpg`,
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  type = "website",
  jsonLd,
}: SeoHeadProps) {
  const availableKey = langs.join(",");
  useEffect(() => {
    const available = availableKey.split(",") as LangCode[];
    const route = stripLangPrefix((path || "/").split(/[?#]/)[0] || "/");
    const exists = available.includes(lang);
    // A page that has no translation must not compete with its English original.
    const canonical = languageUrl(SITE_URL, route, exists ? lang : "en");
    const pageRobots = exists ? robots : "noindex,follow";
    // Editors (and the AI news/guides writer) don't always spell the brand the
    // same way ("TransYachtGroup", "Trans Yacht Group", different casing). A
    // strict substring check misses those and appends the suffix a second
    // time, producing titles like "...| TransYachtGroup | Trans Yacht Group"
    // that Google truncates. Compare on letters only.
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
    const fullTitle = normalize(title).includes("transyachtgroup")
      ? title
      : `${title} | Trans Yacht Group`;
    const absoluteImage = new URL(image, `${SITE_URL}/`).toString();

    document.title = fullTitle;
    document.documentElement.lang = lang;
    upsertMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    upsertMeta('meta[name="robots"]', { name: "robots", content: pageRobots });
    upsertMeta('meta[name="googlebot"]', {
      name: "googlebot",
      content: pageRobots,
    });
    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: canonical,
    });

    // hreflang only for versions that really exist, plus x-default -> English.
    document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((node) => node.remove());
    alternateLinks(SITE_URL, route, exists ? available : []).forEach(
      ({ hreflang, href }) => {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = hreflang;
        link.href = href;
        link.dataset.seo = "language";
        document.head.appendChild(link);
      },
    );

    const socialMeta: Array<[string, string, string]> = [
      ["property", "og:title", fullTitle],
      ["property", "og:description", description],
      ["property", "og:type", type],
      ["property", "og:url", canonical],
      ["property", "og:image", absoluteImage],
      ["property", "og:site_name", "Trans Yacht Group"],
      ["property", "og:locale", lang],
      ["name", "twitter:card", "summary_large_image"],
      ["name", "twitter:title", fullTitle],
      ["name", "twitter:description", description],
      ["name", "twitter:image", absoluteImage],
    ];
    socialMeta.forEach(([attribute, name, content]) =>
      upsertMeta(`meta[${attribute}="${name}"]`, {
        [attribute]: name,
        content,
      }),
    );

    document.head
      .querySelectorAll('script[type="application/ld+json"][data-seo="true"]')
      .forEach((node) => node.remove());
    const graph = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    graph.forEach((data) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "true";
      script.text = JSON.stringify(data).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    });
  }, [description, image, jsonLd, lang, availableKey, path, robots, title, type]);

  return null;
}
