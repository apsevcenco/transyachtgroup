import { useEffect } from "react";

import { LANGUAGES, type LangCode } from "@/contexts/LanguageContext";

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://www.transyachtgroup.com"
).replace(/\/+$/, "");

type JsonLd = Record<string, unknown>;

interface SeoHeadProps {
  title: string;
  description: string;
  path?: string;
  lang: LangCode;
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

export function localizedUrl(path: string, lang: LangCode) {
  const url = new URL(path || "/", `${SITE_URL}/`);
  url.searchParams.set("lang", lang);
  return url.toString();
}

export function SeoHead({
  title,
  description,
  path = window.location.pathname,
  lang,
  image = `${SITE_URL}/opengraph.jpg`,
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  type = "website",
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    const canonical = localizedUrl(path, lang);
    const fullTitle = title.includes("Trans Yacht Group")
      ? title
      : `${title} | Trans Yacht Group`;
    const absoluteImage = new URL(image, `${SITE_URL}/`).toString();

    document.title = fullTitle;
    document.documentElement.lang = lang;
    upsertMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
    upsertMeta('meta[name="googlebot"]', {
      name: "googlebot",
      content: robots,
    });
    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: canonical,
    });

    document.head
      .querySelectorAll('link[rel="alternate"][data-seo="language"]')
      .forEach((node) => node.remove());
    LANGUAGES.forEach(({ code }) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = code;
      link.href = localizedUrl(path, code);
      link.dataset.seo = "language";
      document.head.appendChild(link);
    });
    const defaultLink = document.createElement("link");
    defaultLink.rel = "alternate";
    defaultLink.hreflang = "x-default";
    defaultLink.href = localizedUrl(path, "en");
    defaultLink.dataset.seo = "language";
    document.head.appendChild(defaultLink);

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
  }, [description, image, jsonLd, lang, path, robots, title, type]);

  return null;
}
