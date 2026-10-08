import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithEsbuild } from "vite";

/**
 * Post-build prerender. The app is a client-rendered SPA, so for every public URL we write
 * `dist/public/<path>/index.html` that already contains the page head (title, canonical, OG,
 * JSON-LD) AND the real body text (inside #root, visually hidden until React mounts and
 * replaces it). Crawlers, link previews and AI bots therefore never receive the bare shell.
 *
 * Languages: English lives at the unprefixed URLs. fr/ru/ro/ar get `dist/public/<lang>/<path>/`
 * pages, but ONLY where a genuine translation exists (service/location copy, CMS texts, and
 * guides/news/vehicles whose `translations` JSON carries that language). No English copy is ever
 * written under a language prefix. hreflang alternates are derived from the pages that were
 * actually generated, so they can never point at a version that does not exist.
 *
 * Data comes from (a) the page-copy modules in src/data and (b) the public API
 * (guides, news, answers, vehicles, CMS content). API failures are non-fatal: that group is skipped.
 */
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectDir, "dist", "public");
const source = await readFile(join(outputDir, "index.html"), "utf8");
const siteUrl = "https://www.transyachtgroup.com";
const brand = "Trans Yacht Group";
const languages = ["en", "fr", "ru", "ro", "ar"];
const translatedLanguages = languages.filter((code) => code !== "en");

const rawApiBase = process.env.VITE_API_URL || process.env.API_URL || "";
const apiBase = (/^https?:\/\//i.test(rawApiBase) ? rawApiBase : `${siteUrl}/api`).replace(/\/$/, "");

// ---------------------------------------------------------------- shared copy modules
async function importTsModule(relativePath) {
  const file = join(projectDir, relativePath);
  const { code } = await transformWithEsbuild(await readFile(file, "utf8"), file, { loader: "ts", format: "esm" });
  const dir = await mkdtemp(join(tmpdir(), "seo-data-"));
  const out = join(dir, "module.mjs");
  await writeFile(out, code, "utf8");
  try {
    return await import(pathToFileURL(out).href);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const { LANDINGS, COURCHEVEL_CLUSTER_SLUGS, UI } = await importTsModule("src/data/serviceLandings.ts");
const { localizeLanding, landingLangs, landingTitle } = await importTsModule("src/data/serviceLandingsI18n.ts");
const { LOCATIONS, LOCATION_SERVICES, TEXT, locationName } = await importTsModule("src/data/locations.ts");
const { ROUTE_COPY } = await importTsModule("src/data/routeSeoCopy.ts");
const { PAGE_LABELS, VEHICLE_TITLE_SUFFIX, RELATED_QUESTIONS } = await importTsModule("src/data/pageLabels.ts");
const { GUIDES_COPY, NEWS_COPY, ANSWERS_COPY } =await importTsModule("src/data/hubCopy.ts");
const { vehiclePath } = await importTsModule("src/lib/vehicleSeo.ts");
const { alternateLinks, articleLangs, languageUrl, localizeInternalHref, vehicleLangs } = await importTsModule("src/lib/langRoutes.ts");
const { answersForService, answersForLocation, moreAnswers } = await importTsModule("src/data/answerLinks.ts");
const { seoVehicleName, vehicleShortName, vehicleServiceLinks, relatedVehicles, yachtSummary } = await importTsModule("src/data/vehicleContent.ts");

// ---------------------------------------------------------------- helpers
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value) {
  return decodeEntities(
    String(value ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function compactDescription(...values) {
  const text = values.map(stripHtml).find(Boolean) || "Luxury mobility insights from Trans Yacht Group.";
  return text.length > 155 ? `${text.slice(0, 152).trim()}…` : text;
}

function withBrand(title) {
  const clean = stripHtml(title);
  return clean.toLowerCase().replace(/[^a-z]/g, "").includes("transyachtgroup") ? clean : `${clean} | ${brand}`;
}

/** Absolute URL of a route (language-less path) in one language, with trailing slash. */
function cleanUrl(path, lang = "en") {
  return languageUrl(siteUrl, path, lang);
}

/** Site-relative href of a route in one language, with trailing slash. */
function rel(path, lang = "en") {
  return languageUrl("", path, lang);
}

/** Where a page is written below dist/public. */
function outputPath(path, lang) {
  return lang === "en" ? path : `/${lang}${path === "/" ? "" : path}`;
}

function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function publicAssetUrl(value) {
  if (!value) return undefined;
  if (isAbsoluteHttpUrl(value)) return value;
  if (String(value).startsWith("/")) return `${siteUrl}${value}`;
  return undefined;
}

function toIso(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "h5", "ul", "ol", "li", "a", "strong", "b", "em", "i", "u", "br", "hr",
  "blockquote", "table", "thead", "tbody", "tr", "th", "td", "img", "figure", "figcaption", "span", "div", "sup", "sub",
]);

function safeUrl(value) {
  const url = decodeEntities(value).trim();
  return /^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(url) ? url : "";
}

/**
 * Allow-list sanitiser for CMS/AI HTML. h1 is downgraded to h2 (the page has its own h1).
 * `mapHref` lets language pages point internal links at the same-language URL.
 */
function sanitizeHtml(html, mapHref = (href) => href) {
  const cleaned = String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|form|noscript)\b[\s\S]*?<\/\1>/gi, "");
  return cleaned.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_match, slash, rawName, attrs) => {
    let name = rawName.toLowerCase();
    if (name === "h1") name = "h2";
    if (!ALLOWED_TAGS.has(name)) return "";
    if (slash) return `</${name}>`;
    const attr = (key) => attrs.match(new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
    if (name === "a") {
      const href = safeUrl(attr("href")?.[1] ?? attr("href")?.[2] ?? "");
      return href ? `<a href="${escapeHtml(mapHref(href))}">` : "<a>";
    }
    if (name === "img") {
      const src = safeUrl(attr("src")?.[1] ?? attr("src")?.[2] ?? "");
      if (!src) return "";
      const alt = decodeEntities(attr("alt")?.[1] ?? attr("alt")?.[2] ?? "");
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
    }
    return `<${name}>`;
  });
}

const li = (items) => `<ul>${items.join("")}</ul>`;
const link = (href, label) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
const RELATED_TOKEN = "<!--RELATED_ANSWERS-->";
/**
 * "Related questions" block. `items` are the English answers; on a language page each one links to its
 * translated answer (translated question, /<lang>/answers/<slug>/) when that translation exists, else to English.
 */
function relatedBlock(items, lang = "en") {
  const row = (a) => {
    const translated = lang === "en" ? null : translatedAnswers[lang]?.get(a.slug);
    return `<li>${link(rel(`/answers/${a.slug}`, translated ? lang : "en"), stripHtml((translated || a).question))}</li>`;
  };
  return items.length ? `<h2>${escapeHtml(RELATED_QUESTIONS[lang])}</h2>${li(items.map(row))}` : "";
}

// ---------------------------------------------------------------- API content
async function fetchJson(path) {
  const response = await fetch(`${apiBase}${path}`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function loadList(path, label) {
  try {
    const items = await fetchJson(path);
    if (!Array.isArray(items)) throw new Error("unexpected response");
    return items;
  } catch (err) {
    console.warn(`Skipping ${label} prerender: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

async function loadObject(path, label) {
  try {
    const value = await fetchJson(path);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("unexpected response");
    return value;
  } catch (err) {
    console.warn(`Skipping ${label} prerender: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

const [guides, news, answers, vehicles, ...rest] = await Promise.all([
  loadList("/guides?lang=en", "guides"),
  loadList("/news?lang=en", "news"),
  loadList("/answers", "answers"),
  loadList("/vehicles?lang=en", "vehicles"),
  ...languages.map((code) => loadObject(`/content?lang=${code}`, `CMS texts (${code})`)),
  ...translatedLanguages.map((code) => loadList(`/answers?lang=${code}`, `answers (${code})`)),
]);
const cmsContents = rest.slice(0, languages.length);
const cms = Object.fromEntries(languages.map((code, index) => [code, cmsContents[index]]));
// The API falls back to English per answer; only items served in the requested language have a real translation.
const translatedAnswers = Object.fromEntries(
  translatedLanguages.map((code, index) => [
    code,
    new Map(rest.slice(languages.length)[index].filter((item) => item?.slug && item?.question && item.language === code).map((item) => [item.slug, item])),
  ]),
);

/** CMS text of one language, only when it really differs from the English text (the API falls back to English). */
function cmsText(lang, key) {
  const value = cms[lang]?.[key];
  if (typeof value !== "string" || !stripHtml(value)) return "";
  if (lang !== "en" && stripHtml(value) === stripHtml(cms.en?.[key])) return "";
  return value;
}

// ---------------------------------------------------------------- static pages
const breadcrumb = (items, lang = "en") => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.path !== undefined ? { item: cleanUrl(item.path, lang) } : {}),
  })),
});

/** Breadcrumb labels: English keeps its original wording, other languages use the translated labels. */
const crumbs = (lang) => ({
  home: PAGE_LABELS[lang].home,
  cars: lang === "en" ? "Cars" : PAGE_LABELS[lang].cars,
  yachts: lang === "en" ? "Yachts" : PAGE_LABELS[lang].yachts,
});

const landingBySlug = new Map(LANDINGS.map((item) => [item.slug, item]));
const titleOfLanding = (slug, lang) => landingTitle(slug, lang) ?? landingBySlug.get(slug)?.title;

function buildServicePages(lang) {
  const text = UI[lang];
  const L = PAGE_LABELS[lang];
  const pages = [];
  for (const base of LANDINGS) {
    const landing = localizeLanding(base, lang);
    if (!landing) continue; // no translation of this page in `lang`: never publish an English copy
    const faq = landing.faq || [{ q: text.q1, a: text.a1 }, { q: text.q2, a: text.a2 }];
    const related = base.related.map((slug) => landingBySlug.get(slug)).filter(Boolean);
    const cluster = base.area === "Courchevel"
      ? COURCHEVEL_CLUSTER_SLUGS.filter((slug) => slug !== base.slug).map((slug) => landingBySlug.get(slug)).filter(Boolean)
      : [];
    const path = `/services/${base.slug}`;
    const catalogPath = base.kind === "yacht" ? "/yachts" : "/cars";
    pages.push({
      path,
      lang,
      title: withBrand(landing.title),
      description: landing.description,
      heading: landing.title,
      serviceSlug: base.slug,
      area: base.area,
      body: `<article>
<p>${escapeHtml(landing.eyebrow)}</p>
<h1>${escapeHtml(landing.title)}</h1>
<p>${escapeHtml(landing.intro)}</p>
<p>${escapeHtml(landing.details)}</p>
<h2>${escapeHtml(text.process)}</h2>
<ol><li>${escapeHtml(text.step1)}</li><li>${escapeHtml(text.step2)}</li><li>${escapeHtml(text.step3)}</li></ol>
<h2>${escapeHtml(text.faq)}</h2>
${faq.map((item) => `<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join("\n")}
<h2>${escapeHtml(text.related)}</h2>
${li(related.map((item) => `<li>${link(rel(`/services/${item.slug}`, lang), titleOfLanding(item.slug, lang))}</li>`))}
${cluster.length ? `<h2>${escapeHtml(text.cluster)}</h2><p>${escapeHtml(text.clusterIntro)}</p>${li(cluster.map((item) => `<li>${link(rel(`/services/${item.slug}`, lang), titleOfLanding(item.slug, lang))}</li>`))}` : ""}
<p>${link(rel(catalogPath, lang), text.catalog)} · ${link(`${rel("/", lang)}#request`, text.request)}</p>
${RELATED_TOKEN}
</article>`,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "Service", name: landing.title, description: landing.description, serviceType: base.serviceType || (base.kind === "yacht" ? "Luxury yacht charter" : "Luxury car rental"), areaServed: base.area ? { "@type": "City", name: base.area } : "French Riviera", provider: { "@id": `${siteUrl}/#organization` }, url: cleanUrl(path, lang) },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
        breadcrumb([{ name: L.home, path: "/" }, { name: base.kind === "yacht" ? crumbs(lang).yachts : crumbs(lang).cars, path: catalogPath }, { name: landing.title }], lang),
      ],
    });
  }
  return pages;
}

function buildLocationPages(lang) {
  const text = TEXT[lang];
  const L = PAGE_LABELS[lang];
  return Object.entries(LOCATIONS).map(([key, location]) => {
    const city = locationName(key, lang);
    const title = text.title(city);
    const description = text.description(city);
    const faq = text.faq(city);
    const services = LOCATION_SERVICES[key] || [];
    const path = `/locations/${key}`;
    return {
      path,
      lang,
      title: withBrand(title),
      description,
      heading: title,
      cityName: location.name,
      serviceSlugs: services.map((service) => service.slug),
      body: `<article>
<p>${escapeHtml(text.service)}</p>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(text.intro(city, location.detail))}</p>
<p>${link(rel("/cars", lang), text.cars)} · ${link(rel("/yachts", lang), text.yachts)}</p>
${services.length ? `<h2>${escapeHtml(L.servicesIn(city))}</h2>${li(services.map((service) => `<li>${link(rel(`/services/${service.slug}`, lang), landingTitle(service.slug, lang) ?? service.label)}</li>`))}` : ""}
<h2>${escapeHtml(text.commercialTitle(city))}</h2>
<p>${escapeHtml(text.commercialCopy(city))}</p>
${faq.map((item) => `<h2>${escapeHtml(item.question)}</h2><p>${escapeHtml(item.answer)}</p>`).join("\n")}
<h2>${escapeHtml(text.contact)}</h2>
<p>${escapeHtml(text.concierge)}</p>
${RELATED_TOKEN}
</article>`,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "Service", name: title, description, areaServed: { "@type": "City", name: location.name }, provider: { "@id": `${siteUrl}/#organization` }, serviceType: ["Luxury car rental", "Yacht charter", "Private concierge"], url: cleanUrl(path, lang) },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
        breadcrumb([{ name: L.home, path: "/" }, { name: city }], lang),
      ],
    };
  });
}

const ABOUT_TEXT = [
  "TRANSYACHTGROUP was founded on a singular belief: that true luxury is not merely possessed — it is experienced. We are a private concierge house specializing in the curation of the world's finest superyachts and hypercars for those who accept nothing less than perfection.",
  "Our journey began in the heart of the Mediterranean, where a passion for maritime excellence and automotive artistry converged into a vision — to create a seamless bridge between the world's most extraordinary vessels and vehicles and the discerning individuals who deserve them.",
  "Today, we serve a private circle of clients across Europe, the Middle East, and Asia, delivering bespoke charter and rental experiences that transcend expectations. Every engagement is personal. Every detail, considered.",
];

const basePages = [
  { path: "/cars", title: "Luxury & Supercar Rental on the French Riviera | Trans Yacht Group", description: "Discover luxury cars and supercars for rent in Cannes, Monaco, Nice and Saint-Tropez with private delivery and concierge support.", heading: "Luxury Car Rental on the French Riviera", kind: "cars" },
  { path: "/yachts", title: "Luxury Yacht Charter on the French Riviera | Trans Yacht Group", description: "Explore private yacht charters from Cannes, Monaco, Nice and Saint-Tropez with a dedicated Trans Yacht Group concierge.", heading: "Luxury Yacht Charter on the French Riviera", kind: "yachts" },
  { path: "/about", title: "About Trans Yacht Group | Luxury Mobility Concierge", description: "Meet the Cannes-based private mobility concierge specialising in luxury car rental and yacht charter across the French Riviera.", heading: "About Trans Yacht Group", paragraphs: ABOUT_TEXT },
  { path: "/guides", title: "French Riviera Luxury Travel Guides | Trans Yacht Group", description: "Expert guides to luxury car rental, yacht charter and private travel in Cannes, Monaco, Nice and Saint-Tropez.", heading: "French Riviera Luxury Travel Guides", kind: "guides" },
  { path: "/news", title: "News from Trans Yacht Group | Luxury Mobility Updates", description: "Latest updates on luxury cars, VIP transfers and premium mobility across Monaco, the French Riviera and Courchevel.", heading: "News from Trans Yacht Group", kind: "news" },
  { path: "/answers", title: "Luxury Travel Answers | Trans Yacht Group", description: "Direct answers about luxury car rental, VIP transfers, yacht charter, Monaco, the French Riviera and Courchevel.", heading: "Luxury Travel Answers", kind: "answers" },
  { path: "/privacy", title: "Privacy Policy | Trans Yacht Group", description: "Read the Trans Yacht Group privacy policy and learn how personal information is handled.", heading: "Privacy Policy" },
  { path: "/legal", title: "Legal Notice | Trans Yacht Group", description: "Legal information and company details for Trans Yacht Group.", heading: "Legal Notice" },
];

// ---------------------------------------------------------------- content pages (guides, news, answers, vehicles)
function articleView(item, lang) {
  if (lang === "en") return item;
  const translated = item.translations?.[lang] || {};
  return {
    ...item,
    title: translated.title,
    excerpt: translated.excerpt,
    content: translated.content,
    metaTitle: translated.metaTitle,
    metaDescription: translated.metaDescription,
  };
}

function articlePage(kind, rawItem, lang, mapHref) {
  const item = articleView(rawItem, lang);
  const isNews = kind === "news";
  const L = PAGE_LABELS[lang];
  const path = `/${kind}/${item.slug}`;
  const image = publicAssetUrl(item.coverImage);
  const description = compactDescription(item.metaDescription, item.excerpt, item.content);
  const heading = stripHtml(item.title);
  const published = toIso(item.publishedAt);
  const modified = toIso(item.updatedAt) || published;
  return {
    path,
    lang,
    title: withBrand(item.metaTitle || item.title),
    description,
    heading,
    image,
    type: "article",
    published,
    modified,
    body: `<article>
<p>${link(rel(`/${kind}`, lang), isNews ? L.allNews : L.allGuides)}</p>
<h1>${escapeHtml(heading)}</h1>
${item.excerpt ? `<p>${escapeHtml(stripHtml(item.excerpt))}</p>` : ""}
${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(heading)}" loading="lazy">` : ""}
${sanitizeHtml(item.content, mapHref)}
</article>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": isNews ? "NewsArticle" : "Article",
        headline: heading,
        description,
        image: image || `${siteUrl}/opengraph.jpg`,
        ...(published ? { datePublished: published } : {}),
        ...(modified ? { dateModified: modified } : {}),
        author: { "@type": "Organization", name: brand, url: siteUrl },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: cleanUrl(path, lang),
        inLanguage: lang,
      },
      breadcrumb([{ name: L.home, path: "/" }, { name: isNews ? L.news : L.guides, path: `/${kind}` }, { name: heading }], lang),
    ],
  };
}

/** Answer page in one language. \`pool\` is the list of answers that exist in that language (for related links). */
function answerPage(item, lang = "en", mapHref = (href) => href, pool = validAnswers) {
  const L = PAGE_LABELS[lang];
  const path = `/answers/${item.slug}`;
  const question = stripHtml(item.question);
  const directAnswer = stripHtml(item.directAnswer);
  const faq = (Array.isArray(item.faq) ? item.faq : []).filter((entry) => entry?.question && entry?.answer);
  const description = compactDescription(item.metaDescription, item.directAnswer);
  const modified = toIso(item.updatedAt) || toIso(item.publishedAt);
  const inLanguage = lang === "en" ? {} : { inLanguage: lang };
  const servicePath = item.relatedServicePath ? String(item.relatedServicePath).replace(/\/?$/, "/") : "";
  const serviceLabel = landingTitle(servicePath.split("/")[2] || "", lang) ?? L.relatedService;
  return {
    path,
    lang,
    title: withBrand(item.metaTitle || question),
    description,
    heading: question,
    modified,
    body: `<article>
<p>${link(rel("/answers", lang), L.allAnswers)}</p>
<h1>${escapeHtml(question)}</h1>
<p><strong>${escapeHtml(directAnswer)}</strong></p>
${sanitizeHtml(item.explanation, mapHref)}
${faq.length ? `<h2>${escapeHtml(L.faq)}</h2>${faq.map((entry) => `<h3>${escapeHtml(stripHtml(entry.question))}</h3><p>${escapeHtml(stripHtml(entry.answer))}</p>`).join("\n")}` : ""}
${relatedBlock(moreAnswers(pool, item), lang)}
${servicePath ? `<p>${link(lang === "en" ? servicePath : localizeInternalHref(servicePath, lang), serviceLabel)}</p>` : ""}
</article>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "QAPage", ...inLanguage, mainEntity: { "@type": "Question", name: question, ...inLanguage, acceptedAnswer: { "@type": "Answer", text: directAnswer, ...inLanguage } } },
      ...(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", ...inLanguage, mainEntity: faq.map((entry) => ({ "@type": "Question", name: stripHtml(entry.question), acceptedAnswer: { "@type": "Answer", text: stripHtml(entry.answer) } })) }] : []),
      breadcrumb([{ name: lang === "en" ? "Home" : L.home, path: "/" }, { name: L.answers, path: "/answers" }, { name: question, path }], lang),
    ],
  };
}

/** Vehicle as the API would return it for `lang` (name, description and full description translated). */
function vehicleView(vehicle, lang) {
  if (lang === "en") return vehicle;
  const translated = vehicle.translations?.[lang] || {};
  return {
    ...vehicle,
    name: translated.name || vehicle.name,
    description: translated.description || vehicle.description,
    specs: translated.fullDescription && vehicle.specs ? { ...vehicle.specs, fullDescription: translated.fullDescription } : vehicle.specs,
  };
}

function vehiclePageEntry(rawVehicle, lang, mapHref) {
  const vehicle = vehicleView(rawVehicle, lang);
  const L = PAGE_LABELS[lang];
  const isCar = vehicle.category !== "yacht";
  // The tidy-up rules, the factual yacht summary and the English link labels are English-only:
  // language pages use the translated name and never show the generated summary.
  const english = lang === "en";
  const name = english ? seoVehicleName(vehicle) : stripHtml(vehicle.name);
  const shortName = english ? vehicleShortName(vehicle) : name;
  const specs = vehicle.specs && typeof vehicle.specs === "object" ? vehicle.specs : {};
  const fullDescription = typeof specs.fullDescription === "string" ? specs.fullDescription : "";
  const summary = fullDescription || !english ? [] : yachtSummary(vehicle);
  // Explore links: same-language service pages (all exist) and related vehicles that exist in this language.
  const services = vehicleServiceLinks(rawVehicle).map((item) => {
    const slug = item.href.split("/")[2];
    return { href: rel(`/services/${slug}`, lang), label: landingTitle(slug, lang) ?? item.label };
  });
  const related = relatedVehicles(vehicleSets[lang], rawVehicle).map((item) => ({
    href: rel(vehiclePath(item), lang),
    label: english ? seoVehicleName(item) : stripHtml(vehicleView(item, lang).name),
  }));
  const description = stripHtml(fullDescription || summary.join(" ") || vehicle.description).slice(0, 300) || `${name} available from ${brand} on the French Riviera.`;
  const metaDescription = description.length > 155 ? `${description.slice(0, 152).trim()}…` : description;
  const path = vehiclePath(rawVehicle); // slug always comes from the English name
  const images = [vehicle.image, ...(Array.isArray(vehicle.images) ? vehicle.images : [])].map(publicAssetUrl).filter(Boolean);
  const image = images[0];
  const price = Number(String(specs.pricePerDay ?? "").replace(/[^\d.]/g, ""));
  const specRows = Object.entries(L.specs)
    .filter(([key]) => specs[key] && typeof specs[key] !== "object")
    .map(([key, label]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(stripHtml(specs[key]))}</li>`);
  const collection = isCar ? "cars" : "yachts";
  return {
    path,
    lang,
    title: withBrand(`${shortName} ${isCar ? VEHICLE_TITLE_SUFFIX[lang].car : VEHICLE_TITLE_SUFFIX[lang].yacht}`),
    description: metaDescription,
    heading: name,
    image,
    type: "product",
    body: `<article>
<p>${link(rel(`/${collection}`, lang), isCar ? L.allCars : L.allYachts)}</p>
<h1>${escapeHtml(name)}</h1>
${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">` : ""}
<p>${escapeHtml(stripHtml(vehicle.description))}</p>
${fullDescription ? sanitizeHtml(fullDescription, mapHref) : summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
${specRows.length ? `<h2>${escapeHtml(L.specifications)}</h2><ul>${specRows.join("")}</ul>` : ""}
${services.length || related.length ? `<h2>${escapeHtml(L.explore)}</h2>${li([...services, ...related].map((item) => `<li>${link(item.href, item.label)}</li>`))}` : ""}
<p>${link(`${rel("/", lang)}#request`, L.requestOffer)}</p>
</article>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": isCar ? ["Product", "Vehicle"] : "Product",
        "@id": `${cleanUrl(path, lang)}#product`,
        name,
        description,
        image: images.length ? images : [`${siteUrl}/opengraph.jpg`],
        category: isCar ? "Luxury car rental" : "Luxury yacht charter",
        url: cleanUrl(path, lang),
        ...(specs.builder ? { brand: { "@type": "Brand", name: stripHtml(specs.builder) } } : {}),
        ...(price > 0 ? { offers: { "@type": "Offer", url: cleanUrl(path, lang), priceCurrency: "EUR", price, availability: "https://schema.org/InStock", seller: { "@id": `${siteUrl}/#organization` } } } : {}),
      },
      breadcrumb([{ name: L.home, path: "/" }, { name: isCar ? crumbs(lang).cars : crumbs(lang).yachts, path: `/${collection}` }, { name, path }], lang),
    ],
  };
}

const validGuides = guides.filter((item) => item?.slug && item?.title);
const validNews = news.filter((item) => item?.slug && item?.title);
const validAnswers = answers.filter((item) => item?.slug && item?.question);
const validVehicles = vehicles.filter((item) => item?.id && item?.name);

// Which translated detail pages exist per language: the single source for link rewriting and hubs.
const articleSets = {
  guides: Object.fromEntries(languages.map((code) => [code, validGuides.filter((item) => articleLangs(item).includes(code))])),
  news: Object.fromEntries(languages.map((code) => [code, validNews.filter((item) => articleLangs(item).includes(code))])),
};
const vehicleSets = Object.fromEntries(languages.map((code) => [code, validVehicles.filter((item) => vehicleLangs(item).includes(code))]));
// Answers: English plus, per language, exactly the answers the API serves translated (complete translation only).
const answerSets = Object.fromEntries(languages.map((code) => [code, code === "en" ? validAnswers : [...translatedAnswers[code].values()]]));

/** Internal links inside translated copy go to the same-language page when it was generated. */
function hrefMapper(lang) {
  if (lang === "en") return (href) => href;
  const existing = new Set([
    ...articleSets.guides[lang].map((item) => `/guides/${item.slug}`),
    ...articleSets.news[lang].map((item) => `/news/${item.slug}`),
    ...vehicleSets[lang].map((item) => vehiclePath(item)),
    ...answerSets[lang].map((item) => `/answers/${item.slug}`),
  ]);
  return (href) => localizeInternalHref(href, lang, (normalized) => existing.has(normalized));
}

const guidePages = languages.flatMap((code) => articleSets.guides[code].map((item) => articlePage("guides", item, code, hrefMapper(code))));
const newsPages = languages.flatMap((code) => articleSets.news[code].map((item) => articlePage("news", item, code, hrefMapper(code))));
const answerPages = languages.flatMap((code) => answerSets[code].map((item) => answerPage(item, code, hrefMapper(code), answerSets[code])));
const vehiclePages = languages.flatMap((code) => vehicleSets[code].map((item) => vehiclePageEntry(item, code, hrefMapper(code))));

const servicePagesByLang = Object.fromEntries(languages.map((code) => [code, buildServicePages(code)]));
const locationPagesByLang = Object.fromEntries(languages.map((code) => [code, buildLocationPages(code)]));
for (const code of languages) {
  for (const page of servicePagesByLang[code]) {
    page.body = page.body.replace(RELATED_TOKEN, relatedBlock(answersForService(validAnswers, page.serviceSlug, page.area), code));
  }
  for (const page of locationPagesByLang[code]) {
    page.body = page.body.replace(RELATED_TOKEN, relatedBlock(answersForLocation(validAnswers, page.cityName, page.serviceSlugs), code));
  }
}

const pagesOf = (list, code) => list.filter((entry) => entry.lang === code);

// Listing pages and the homepage show real text + crawlable links to the detail pages.
function listingBody(page) {
  const lang = page.lang;
  const L = PAGE_LABELS[lang];
  const intro = `<p>${escapeHtml(page.description)}</p>`;
  const wrap = (items) => `<article><h1>${escapeHtml(page.heading)}</h1>${intro}${items}</article>`;
  if (page.kind === "cars" || page.kind === "yachts") {
    const wanted = page.kind === "cars" ? "car" : "yacht";
    const items = vehicleSets[lang].filter((v) => (v.category === "yacht" ? "yacht" : "car") === wanted);
    const services = servicePagesByLang[lang].filter((p) => landingBySlug.get(p.path.replace("/services/", ""))?.kind === wanted);
    const row = (raw) => {
      const v = vehicleView(raw, lang);
      return `<li>${link(rel(vehiclePath(raw), lang), stripHtml(v.name))} — ${escapeHtml(stripHtml(v.description).slice(0, 140))}</li>`;
    };
    return wrap(`${items.length ? `<h2>${page.kind === "cars" ? L.fleet : L.fleetYachts}</h2>${li(items.map(row))}` : ""}
${services.length ? `<h2>${escapeHtml(L.relatedServices)}</h2>${li(services.map((p) => `<li>${link(rel(p.path, lang), p.heading)}</li>`))}` : ""}`);
  }
  if (page.kind === "guides" || page.kind === "news" || page.kind === "answers") {
    const entries = page.kind === "answers"
      ? answerPages.filter((entry) => entry.lang === lang).map((entry) => ({ entry, raw: lang === "en" ? validAnswers.find((answer) => `/answers/${answer.slug}` === entry.path) : undefined }))
      : (page.kind === "guides" ? guidePages : newsPages)
        .filter((entry) => entry.lang === lang)
        .map((entry) => ({ entry, raw: (page.kind === "guides" ? articleSets.guides : articleSets.news)[lang].find((item) => `/${page.kind}/${item.slug}` === entry.path) }));
    const rows = entries.map(({ entry, raw }) => {
      const excerpt = lang === "en" ? raw?.excerpt : raw?.translations?.[lang]?.excerpt;
      return `<li>${link(rel(entry.path, lang), entry.heading)}${excerpt ? ` — ${escapeHtml(stripHtml(excerpt).slice(0, 180))}` : ""}</li>`;
    });
    return wrap(rows.length ? li(rows) : "");
  }
  if (page.paragraphs) return `<article><h1>${escapeHtml(page.heading)}</h1>${page.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}<p>${link(rel("/cars", lang), L.cars)} · ${link(rel("/yachts", lang), L.yachts)}</p></article>`;
  return `<article><h1>${escapeHtml(page.heading)}</h1>${intro}</article>`;
}

/** Language versions of the hub pages; a page is only produced when its translated content exists. */
function buildLanguageBasePages(lang) {
  const out = [];
  const copy = ROUTE_COPY[lang];
  const make = (key, extra) => ({ path: `/${key}`, lang, title: withBrand(copy[key].title), description: copy[key].description, heading: copy[key].title, ...extra });
  out.push(make("cars", { kind: "cars" }), make("yachts", { kind: "yachts" }));

  const aboutText = cmsText(lang, "about_text");
  const aboutTitle = stripHtml(cmsText(lang, "about_title"));
  if (aboutText) {
    const paragraphs = /<[a-z][\s\S]*>/i.test(aboutText)
      ? sanitizeHtml(aboutText)
      : aboutText.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join("");
    const L = PAGE_LABELS[lang];
    out.push({
      ...make("about", {}),
      body: `<article><h1>${escapeHtml(aboutTitle || copy.about.title)}</h1>${paragraphs}<p>${link(rel("/cars", lang), L.cars)} · ${link(rel("/yachts", lang), L.yachts)}</p></article>`,
    });
  }
  for (const [key, titleKey, contentKey] of [["privacy", "privacy_policy_title", "privacy_policy_content"], ["legal", "legal_notice_title", "legal_notice_content"]]) {
    const content = cmsText(lang, contentKey);
    if (!content) continue;
    out.push({
      ...make(key, {}),
      body: `<article><h1>${escapeHtml(stripHtml(cmsText(lang, titleKey)) || copy[key].title)}</h1>${sanitizeHtml(content)}</article>`,
    });
  }

  // Hubs for guides/news/answers need at least one translated item, otherwise they would be empty shells.
  if (answerSets[lang].length) out.push({ path: "/answers", lang, title: withBrand(ANSWERS_COPY[lang].title), description: ANSWERS_COPY[lang].intro, heading: ANSWERS_COPY[lang].title, kind: "answers" });
  if (articleSets.guides[lang].length) out.push({ path: "/guides", lang, title: withBrand(GUIDES_COPY[lang].title), description: GUIDES_COPY[lang].intro, heading: GUIDES_COPY[lang].title, kind: "guides" });
  if (articleSets.news[lang].length) out.push({ path: "/news", lang, title: withBrand(NEWS_COPY[lang].title), description: NEWS_COPY[lang].intro, heading: NEWS_COPY[lang].title, kind: "news" });
  return out;
}

const englishPages = basePages.map((page) => ({ ...page, lang: "en" }));
const hubPages = [
  ...englishPages,
  ...translatedLanguages.flatMap(buildLanguageBasePages),
].map((page) => (page.body ? page : { ...page, body: listingBody(page) }));

// Hub pages that exist per language; links to a hub that was not generated are left out.
const hubPaths = Object.fromEntries(languages.map((code) => [code, new Set(hubPages.filter((page) => page.lang === code).map((page) => page.path))]));

const homePages = languages.map((lang) => {
  const L = PAGE_LABELS[lang];
  const locationPages = locationPagesByLang[lang];
  const servicePages = servicePagesByLang[lang];
  const guideList = pagesOf(guidePages, lang);
  const newsList = pagesOf(newsPages, lang);
  const answerList = pagesOf(answerPages, lang);
  const heading = lang === "en" ? "Luxury Car Rental and Yacht Charter on the French Riviera" : ROUTE_COPY[lang].home.title;
  const intro = lang === "en"
    ? "Trans Yacht Group provides private luxury car rental, VIP transfers and yacht charter in Cannes, Monaco, Nice, Antibes, Saint-Tropez and Courchevel, with a dedicated concierge for every request."
    : ROUTE_COPY[lang].home.description;
  return {
    path: "/",
    lang,
    title: lang === "en" ? null : withBrand(ROUTE_COPY[lang].home.title),
    description: lang === "en" ? null : ROUTE_COPY[lang].home.description,
    heading,
    isHome: true,
    body: `<article>
<h1>${escapeHtml(heading)}</h1>
<p>${escapeHtml(intro)}</p>
<p>${link(rel("/cars", lang), L.cars)} · ${link(rel("/yachts", lang), L.yachts)}${hubPaths[lang].has("/about") ? ` · ${link(rel("/about", lang), L.about)}` : ""}</p>
<h2>${escapeHtml(L.destinations)}</h2>
${li(locationPages.map((p) => `<li>${link(rel(p.path, lang), p.heading)}</li>`))}
<h2>${escapeHtml(L.services)}</h2>
${li(servicePages.map((p) => `<li>${link(rel(p.path, lang), p.heading)}</li>`))}
${guideList.length ? `<h2>${escapeHtml(L.guides)}</h2>${li(guideList.slice(0, 12).map((p) => `<li>${link(rel(p.path, lang), p.heading)}</li>`))}` : ""}
${newsList.length ? `<h2>${escapeHtml(L.news)}</h2>${li(newsList.slice(0, 12).map((p) => `<li>${link(rel(p.path, lang), p.heading)}</li>`))}` : ""}
${answerList.length ? `<h2>${escapeHtml(L.answers)}</h2>${li(answerList.slice(0, 12).map((p) => `<li>${link(rel(p.path, lang), p.heading)}</li>`))}` : ""}
</article>`,
  };
});
const homePage = homePages.find((page) => page.lang === "en");
const languageHomePages = homePages.filter((page) => page.lang !== "en");

const pages = [
  ...hubPages,
  ...languages.flatMap((code) => locationPagesByLang[code]),
  ...languages.flatMap((code) => servicePagesByLang[code]),
];
const contentPages = [...guidePages, ...newsPages, ...answerPages, ...vehiclePages];

// hreflang is derived from what was actually generated: path -> languages that have a page.
const availability = new Map();
for (const page of [...homePages, ...pages, ...contentPages]) {
  if (!availability.has(page.path)) availability.set(page.path, new Set());
  availability.get(page.path).add(page.lang);
}
const langsFor = (path) => languages.filter((code) => availability.get(path)?.has(code));

// ---------------------------------------------------------------- rendering
const hiddenStyle = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0";

/** Replaces the template's en + x-default alternates with the real hreflang set of the page. */
function withAlternates(html, path) {
  const links = alternateLinks(siteUrl, path, langsFor(path))
    .map(({ hreflang, href }) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
    .join("\n    ");
  return html
    .replace(/<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>\s*/s, "")
    .replace(/<link\s+rel="alternate"\s+hreflang="en"\s+href="[^"]*"\s*\/?>/s, () => links);
}

function withLanguage(html, lang) {
  if (lang === "en") return html;
  return html
    .replace(/<html\s+lang="en"/, `<html lang="${lang}"${lang === "ar" ? ' dir="rtl"' : ""}`)
    .replace(/(<meta\s+property="og:locale"\s+content=")[^"]*("\s*\/?>)/s, `$1${lang}$2`);
}

function renderPage(page) {
  const lang = page.lang || "en";
  const canonical = cleanUrl(page.path, lang);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  let html = source
    .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/s, `$1${description}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/s, `$1${canonical}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/s, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/s, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/s, `$1${canonical}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/s, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/s, `$1${description}$2`);

  if (page.image) {
    const image = escapeHtml(page.image);
    html = html
      .replace(/(<meta\s+property="og:image"\s+content=")[^"]*("\s*\/?>)/s, `$1${image}$2`)
      .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*("\s*\/?>)/s, `$1${image}$2`);
  }
  if (page.type) {
    html = html.replace(/(<meta\s+property="og:type"\s+content=")[^"]*("\s*\/?>)/s, `$1${page.type === "article" ? "article" : "website"}$2`);
  }

  html = withLanguage(withAlternates(html, page.path), lang);

  // Loader shows the brand; the page's single <h1> lives in the prerendered body below.
  html = html
    .replace(/<h1 style="margin: 0; font: inherit">.*?<\/h1>/s, `<div style="margin: 0; font: inherit">TRANSYACHT GROUP</div>`)
    .replace(/(<div\s+id="root"[^>]*>)/, `$1<div id="seo-content" style="${hiddenStyle}">${page.body}</div>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><main><p>${description}</p></main></noscript>`);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: lang,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    ...(page.image ? { image: page.image } : {}),
    ...(page.modified ? { dateModified: page.modified } : {}),
  };
  const jsonLd = JSON.stringify([webPage, ...(page.jsonLd || [])]).replaceAll("<", "\\u003c");
  const script = `<script type="application/ld+json" data-seo="true">${jsonLd}</script>`;
  const existing = /<script type="application\/ld\+json" data-seo="true">[\s\S]*?<\/script>/;
  // Homepages keep the Organization block from the template and get their WebPage after it.
  return page.isHome
    ? html.replace(existing, (block) => `${block}\n    ${script}`)
    : html.replace(existing, () => script);
}

function renderHome() {
  let html = source.replace(
    /<div\s+id="root"([^>]*)>/,
    (match) => `${match}<div id="seo-content" style="${hiddenStyle}">${homePage.body}</div>`,
  );
  // The homepage keeps its tuned head from index.html; its single <h1> now lives in the body.
  html = html.replace(/<h1 style="margin: 0; font: inherit">.*?<\/h1>/s, `<div style="margin: 0; font: inherit">TRANSYACHT GROUP</div>`);
  return withAlternates(html, "/");
}

function renderNotFound() {
  const title = `Page not found | ${brand}`;
  return source
    .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/s, `$1The page you requested could not be found.$2`)
    .replace(/(<meta\s+name="robots"\s+content=")[^"]*("\s*\/?>)/s, `$1noindex,follow$2`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/s, "")
    .replace(/<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>\s*/gs, "")
    .replace(/<h1 style="margin: 0; font: inherit">.*?<\/h1>/s, `<div style="margin: 0; font: inherit">TRANSYACHT GROUP</div>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><main><h1>Page not found</h1><p><a href="/">Back to Trans Yacht Group</a></p></main></noscript>`);
}

// ---------------------------------------------------------------- sitemap
function sitemapEntry(page) {
  const lang = page.lang || "en";
  const loc = cleanUrl(page.path, lang);
  const priority = page.path === "/" ? "1.0"
    : page.path === "/cars" || page.path === "/yachts" ? "0.9"
      : page.path.startsWith("/services/") || page.path.startsWith("/locations/") || page.path === "/guides" || page.path === "/news" || page.path === "/answers" ? "0.8"
        : "0.4";
  const changefreq = page.path === "/" ? "weekly" : page.path === "/cars" || page.path === "/yachts" ? "daily"
    : page.path === "/guides" || page.path === "/news" || page.path === "/answers" || page.path.startsWith("/services/") ? "weekly"
      : page.path.startsWith("/locations/") ? "monthly"
        : "yearly";
  const available = langsFor(page.path);
  // xhtml:link alternates mirror the real hreflang set (each URL lists all versions, itself included).
  const alternates = available.length > 1
    ? alternateLinks(siteUrl, page.path, available).map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`).join("\n")
    : "";
  return `  <url>
    <loc>${loc}</loc>
${page.lastmod ? `    <lastmod>${page.lastmod}</lastmod>\n` : ""}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alternates ? `\n${alternates}` : ""}
  </url>`;
}

function renderPagesSitemap(items) {
  const uniquePages = Array.from(new Map(items.map((page) => [cleanUrl(page.path, page.lang || "en"), page])).values());
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${uniquePages.map(sitemapEntry).join("\n")}
</urlset>
`;
}

// ---------------------------------------------------------------- write
async function writePage(path, html) {
  const directory = join(outputDir, path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), html, "utf8");
}

await Promise.all([
  ...[...pages, ...contentPages].map((page) => writePage(outputPath(page.path, page.lang || "en"), renderPage(page))),
  ...languageHomePages.map((page) => writePage(outputPath("/", page.lang), renderPage(page))),
]);
// Old /vehicle/<id>/ links still circulate and Google indexes them as duplicates of the real page.
// Serve the real page's HTML there: its canonical points at the real URL, so the duplicate consolidates.
await Promise.all(
  vehiclePages
    .filter((page) => (page.lang || "en") === "en")
    .map((page) => {
      const id = page.path.match(/-(\d+)$/)?.[1];
      return id ? writePage(`/vehicle/${id}/`, renderPage(page)) : null;
    })
    .filter(Boolean),
);
await writeFile(join(outputDir, "index.html"), renderHome(), "utf8");
await writeFile(join(outputDir, "404.html"), renderNotFound(), "utf8");

// Only the hub pages and static pages go in pages-sitemap.xml; the API serves vehicle/guide/news/answer sitemaps.
await writeFile(join(outputDir, "pages-sitemap.xml"), renderPagesSitemap([...homePages, ...pages]), "utf8");

const perLanguage = translatedLanguages
  .map((code) => `${code}: ${[...homePages, ...pages, ...contentPages].filter((page) => page.lang === code).length}`)
  .join(", ");
console.log(
  `Prerendered ${pages.filter((page) => page.lang === "en").length + 1} static pages + ${articleSets.guides.en.length} guides, ${articleSets.news.en.length} news, ${answerSets.en.length} answers, ${vehicleSets.en.length} vehicles (API: ${apiBase}); language pages — ${perLanguage}`,
);
