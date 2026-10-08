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
 * Data comes from (a) the page-copy modules in src/data and (b) the public API
 * (guides, news, answers, vehicles). API failures are non-fatal: that group is skipped.
 */
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectDir, "dist", "public");
const source = await readFile(join(outputDir, "index.html"), "utf8");
const siteUrl = "https://www.transyachtgroup.com";
const brand = "Trans Yacht Group";
const languages = ["en", "fr", "ru", "ro", "ar"];

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
const { LOCATIONS, LOCATION_SERVICES, TEXT } = await importTsModule("src/data/locations.ts");
const { vehiclePath } = await importTsModule("src/lib/vehicleSeo.ts");
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

function cleanUrl(path) {
  return `${siteUrl}${path === "/" ? "/" : `${path.replace(/\/$/, "")}/`}`;
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

/** Allow-list sanitiser for CMS/AI HTML. h1 is downgraded to h2 (the page has its own h1). */
function sanitizeHtml(html) {
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
      return href ? `<a href="${escapeHtml(href)}">` : "<a>";
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
function relatedBlock(items) {
  return items.length
    ? `<h2>Related questions</h2>${li(items.map((a) => `<li>${link(`/answers/${a.slug}/`, stripHtml(a.question))}</li>`))}`
    : "";
}

// ---------------------------------------------------------------- static pages
const breadcrumb = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.path !== undefined ? { item: cleanUrl(item.path) } : {}),
  })),
});

const landingBySlug = new Map(LANDINGS.map((item) => [item.slug, item]));

const servicePages = LANDINGS.map((landing) => {
  const text = UI.en;
  const faq = landing.faq || [{ q: text.q1, a: text.a1 }, { q: text.q2, a: text.a2 }];
  const related = landing.related.map((slug) => landingBySlug.get(slug)).filter(Boolean);
  const cluster = landing.area === "Courchevel"
    ? COURCHEVEL_CLUSTER_SLUGS.filter((slug) => slug !== landing.slug).map((slug) => landingBySlug.get(slug)).filter(Boolean)
    : [];
  const path = `/services/${landing.slug}`;
  const catalogPath = landing.kind === "yacht" ? "/yachts" : "/cars";
  return {
    path,
    title: withBrand(landing.title),
    description: landing.description,
    heading: landing.title,
    serviceSlug: landing.slug,
    area: landing.area,
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
${li(related.map((item) => `<li>${link(`/services/${item.slug}/`, item.title)}</li>`))}
${cluster.length ? `<h2>${escapeHtml(text.cluster)}</h2><p>${escapeHtml(text.clusterIntro)}</p>${li(cluster.map((item) => `<li>${link(`/services/${item.slug}/`, item.title)}</li>`))}` : ""}
<p>${link(`${catalogPath}/`, text.catalog)} · ${link("/#request", text.request)}</p>
${RELATED_TOKEN}
</article>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Service", name: landing.title, description: landing.description, serviceType: landing.serviceType || (landing.kind === "yacht" ? "Luxury yacht charter" : "Luxury car rental"), areaServed: landing.area ? { "@type": "City", name: landing.area } : "French Riviera", provider: { "@id": `${siteUrl}/#organization` }, url: cleanUrl(path) },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
      breadcrumb([{ name: "Home", path: "/" }, { name: landing.kind === "yacht" ? "Yachts" : "Cars", path: catalogPath }, { name: landing.title }]),
    ],
  };
});

const locationPages = Object.entries(LOCATIONS).map(([key, location]) => {
  const text = TEXT.en;
  const title = text.title(location.name);
  const description = text.description(location.name);
  const faq = text.faq(location.name);
  const services = LOCATION_SERVICES[key] || [];
  const path = `/locations/${key}`;
  return {
    path,
    title: withBrand(title),
    description,
    heading: title,
    cityName: location.name,
    serviceSlugs: services.map((service) => service.slug),
    body: `<article>
<p>${escapeHtml(text.service)}</p>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(text.intro(location.name, location.detail))}</p>
<p>${link("/cars/", text.cars)} · ${link("/yachts/", text.yachts)}</p>
${services.length ? `<h2>${escapeHtml(`${location.name} services`)}</h2>${li(services.map((service) => `<li>${link(`/services/${service.slug}/`, service.label)}</li>`))}` : ""}
<h2>${escapeHtml(text.commercialTitle(location.name))}</h2>
<p>${escapeHtml(text.commercialCopy(location.name))}</p>
${faq.map((item) => `<h2>${escapeHtml(item.question)}</h2><p>${escapeHtml(item.answer)}</p>`).join("\n")}
<h2>${escapeHtml(text.contact)}</h2>
<p>${escapeHtml(text.concierge)}</p>
${RELATED_TOKEN}
</article>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Service", name: title, description, areaServed: { "@type": "City", name: location.name }, provider: { "@id": `${siteUrl}/#organization` }, serviceType: ["Luxury car rental", "Yacht charter", "Private concierge"], url: cleanUrl(path) },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
      breadcrumb([{ name: "Home", path: "/" }, { name: location.name }]),
    ],
  };
});

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

const [guides, news, answers, vehicles] = await Promise.all([
  loadList("/guides?lang=en", "guides"),
  loadList("/news?lang=en", "news"),
  loadList("/answers", "answers"),
  loadList("/vehicles?lang=en", "vehicles"),
]);

function articlePage(kind, item) {
  const isNews = kind === "news";
  const path = `/${kind}/${item.slug}`;
  const image = publicAssetUrl(item.coverImage);
  const description = compactDescription(item.metaDescription, item.excerpt, item.content);
  const heading = stripHtml(item.title);
  const published = toIso(item.publishedAt);
  const modified = toIso(item.updatedAt) || published;
  return {
    path,
    title: withBrand(item.metaTitle || item.title),
    description,
    heading,
    image,
    type: "article",
    published,
    modified,
    body: `<article>
<p>${link(`/${kind}/`, isNews ? "All news" : "All guides")}</p>
<h1>${escapeHtml(heading)}</h1>
${item.excerpt ? `<p>${escapeHtml(stripHtml(item.excerpt))}</p>` : ""}
${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(heading)}" loading="lazy">` : ""}
${sanitizeHtml(item.content)}
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
        mainEntityOfPage: cleanUrl(path),
        inLanguage: "en",
      },
      breadcrumb([{ name: "Home", path: "/" }, { name: isNews ? "News" : "Guides", path: `/${kind}` }, { name: heading }]),
    ],
  };
}

function answerPage(item) {
  const path = `/answers/${item.slug}`;
  const question = stripHtml(item.question);
  const directAnswer = stripHtml(item.directAnswer);
  const faq = (Array.isArray(item.faq) ? item.faq : []).filter((entry) => entry?.question && entry?.answer);
  const description = compactDescription(item.metaDescription, item.directAnswer);
  const modified = toIso(item.updatedAt) || toIso(item.publishedAt);
  return {
    path,
    title: withBrand(item.metaTitle || question),
    description,
    heading: question,
    modified,
    body: `<article>
<p>${link("/answers/", "All answers")}</p>
<h1>${escapeHtml(question)}</h1>
<p><strong>${escapeHtml(directAnswer)}</strong></p>
${sanitizeHtml(item.explanation)}
${faq.length ? `<h2>FAQ</h2>${faq.map((entry) => `<h3>${escapeHtml(stripHtml(entry.question))}</h3><p>${escapeHtml(stripHtml(entry.answer))}</p>`).join("\n")}` : ""}
${relatedBlock(moreAnswers(validAnswers, item))}
${item.relatedServicePath ? `<p>${link(String(item.relatedServicePath).replace(/\/?$/, "/"), "Related service")}</p>` : ""}
</article>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "QAPage", mainEntity: { "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: directAnswer } } },
      ...(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((entry) => ({ "@type": "Question", name: stripHtml(entry.question), acceptedAnswer: { "@type": "Answer", text: stripHtml(entry.answer) } })) }] : []),
      breadcrumb([{ name: "Home", path: "/" }, { name: "Answers", path: "/answers" }, { name: question, path }]),
    ],
  };
}

const SPEC_LABELS = {
  builder: "Builder", year: "Year", engine: "Engine", power: "Power", topSpeed: "Top speed", acceleration: "0-100 km/h",
  seats: "Seats", doors: "Doors", transmission: "Transmission", drive: "Drive", length: "Length", beam: "Beam", draft: "Draft",
  cabins: "Cabins", guests: "Guests", crew: "Crew", cruisingSpeed: "Cruising speed", maxSpeed: "Max speed",
};

function vehiclePageEntry(vehicle) {
  const isCar = vehicle.category !== "yacht";
  const name = seoVehicleName(vehicle);
  const specs = vehicle.specs && typeof vehicle.specs === "object" ? vehicle.specs : {};
  const fullDescription = typeof specs.fullDescription === "string" ? specs.fullDescription : "";
  const summary = fullDescription ? [] : yachtSummary(vehicle);
  const services = vehicleServiceLinks(vehicle);
  const related = relatedVehicles(vehicles, vehicle);
  const description = stripHtml(fullDescription || summary.join(" ") || vehicle.description).slice(0, 300) || `${name} available from ${brand} on the French Riviera.`;
  const metaDescription = description.length > 155 ? `${description.slice(0, 152).trim()}…` : description;
  const path = vehiclePath(vehicle);
  const images = [vehicle.image, ...(Array.isArray(vehicle.images) ? vehicle.images : [])].map(publicAssetUrl).filter(Boolean);
  const image = images[0];
  const price = Number(String(specs.pricePerDay ?? "").replace(/[^\d.]/g, ""));
  const specRows = Object.entries(SPEC_LABELS)
    .filter(([key]) => specs[key] && typeof specs[key] !== "object")
    .map(([key, label]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(stripHtml(specs[key]))}</li>`);
  const collection = isCar ? "cars" : "yachts";
  return {
    path,
    title: withBrand(`${vehicleShortName(vehicle)} ${isCar ? "Luxury Car Rental" : "Yacht Charter"}`),
    description: metaDescription,
    heading: name,
    image,
    type: "product",
    body: `<article>
<p>${link(`/${collection}/`, isCar ? "All cars" : "All yachts")}</p>
<h1>${escapeHtml(name)}</h1>
${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">` : ""}
<p>${escapeHtml(stripHtml(vehicle.description))}</p>
${fullDescription ? sanitizeHtml(fullDescription) : summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
${specRows.length ? `<h2>Specifications</h2><ul>${specRows.join("")}</ul>` : ""}
${services.length || related.length ? `<h2>Explore</h2>${li([...services.map((item) => `<li>${link(item.href, item.label)}</li>`), ...related.map((item) => `<li>${link(`${vehiclePath(item)}/`, seoVehicleName(item))}</li>`)])}` : ""}
<p>${link("/#request", "Request a private offer")}</p>
</article>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": isCar ? ["Product", "Vehicle"] : "Product",
        "@id": `${cleanUrl(path)}#product`,
        name,
        description,
        image: images.length ? images : [`${siteUrl}/opengraph.jpg`],
        category: isCar ? "Luxury car rental" : "Luxury yacht charter",
        url: cleanUrl(path),
        ...(specs.builder ? { brand: { "@type": "Brand", name: stripHtml(specs.builder) } } : {}),
        ...(price > 0 ? { offers: { "@type": "Offer", url: cleanUrl(path), priceCurrency: "EUR", price, availability: "https://schema.org/InStock", seller: { "@id": `${siteUrl}/#organization` } } } : {}),
      },
      breadcrumb([{ name: "Home", path: "/" }, { name: isCar ? "Cars" : "Yachts", path: `/${collection}` }, { name, path }]),
    ],
  };
}

const validGuides = guides.filter((item) => item?.slug && item?.title);
const validNews = news.filter((item) => item?.slug && item?.title);
const validAnswers = answers.filter((item) => item?.slug && item?.question);
const guidePages = validGuides.map((item) => articlePage("guides", item));
const newsPages = validNews.map((item) => articlePage("news", item));
const answerPages = validAnswers.map(answerPage);
for (const page of servicePages) {
  page.body = page.body.replace(RELATED_TOKEN, relatedBlock(answersForService(validAnswers, page.serviceSlug, page.area)));
}
for (const page of locationPages) {
  page.body = page.body.replace(RELATED_TOKEN, relatedBlock(answersForLocation(validAnswers, page.cityName, page.serviceSlugs)));
}
const vehiclePages = vehicles.filter((item) => item?.id && item?.name).map(vehiclePageEntry);

// Listing pages and the homepage show real text + crawlable links to the detail pages.
function listingBody(page) {
  const intro = `<p>${escapeHtml(page.description)}</p>`;
  const wrap = (items) => `<article><h1>${escapeHtml(page.heading)}</h1>${intro}${items}</article>`;
  if (page.kind === "cars" || page.kind === "yachts") {
    const wanted = page.kind === "cars" ? "car" : "yacht";
    const items = vehicles.filter((v) => v?.id && v?.name && (v.category === "yacht" ? "yacht" : "car") === wanted);
    const services = servicePages.filter((p) => landingBySlug.get(p.path.replace("/services/", ""))?.kind === (wanted === "car" ? "car" : "yacht"));
    return wrap(`${items.length ? `<h2>${page.kind === "cars" ? "Our fleet" : "Our yachts"}</h2>${li(items.map((v) => `<li>${link(`${vehiclePath(v)}/`, stripHtml(v.name))} — ${escapeHtml(stripHtml(v.description).slice(0, 140))}</li>`))}` : ""}
${services.length ? `<h2>Related services</h2>${li(services.map((p) => `<li>${link(`${p.path}/`, p.heading)}</li>`))}` : ""}`);
  }
  const lists = { guides: guidePages, news: newsPages, answers: answerPages };
  if (lists[page.kind]) {
    const raw = { guides: validGuides, news: validNews, answers: validAnswers }[page.kind];
    const rows = lists[page.kind].map((entry, index) => `<li>${link(`${entry.path}/`, entry.heading)}${raw[index]?.excerpt ? ` — ${escapeHtml(stripHtml(raw[index].excerpt).slice(0, 180))}` : ""}</li>`);
    return wrap(rows.length ? li(rows) : "");
  }
  if (page.paragraphs) return `<article><h1>${escapeHtml(page.heading)}</h1>${page.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}<p>${link("/cars/", "Luxury cars")} · ${link("/yachts/", "Yacht charter")}</p></article>`;
  return `<article><h1>${escapeHtml(page.heading)}</h1>${intro}</article>`;
}

const homePage = {
  path: "/",
  title: null,
  description: null,
  heading: "Luxury Car Rental and Yacht Charter on the French Riviera",
  isHome: true,
  body: `<article>
<h1>Luxury Car Rental and Yacht Charter on the French Riviera</h1>
<p>Trans Yacht Group provides private luxury car rental, VIP transfers and yacht charter in Cannes, Monaco, Nice, Antibes, Saint-Tropez and Courchevel, with a dedicated concierge for every request.</p>
<p>${link("/cars/", "Luxury cars")} · ${link("/yachts/", "Yacht charter")} · ${link("/about/", "About Trans Yacht Group")}</p>
<h2>Destinations</h2>
${li(locationPages.map((p) => `<li>${link(`${p.path}/`, p.heading)}</li>`))}
<h2>Services</h2>
${li(servicePages.map((p) => `<li>${link(`${p.path}/`, p.heading)}</li>`))}
${guidePages.length ? `<h2>Guides</h2>${li(guidePages.slice(0, 12).map((p) => `<li>${link(`${p.path}/`, p.heading)}</li>`))}` : ""}
${newsPages.length ? `<h2>News</h2>${li(newsPages.slice(0, 12).map((p) => `<li>${link(`${p.path}/`, p.heading)}</li>`))}` : ""}
${answerPages.length ? `<h2>Answers</h2>${li(answerPages.slice(0, 12).map((p) => `<li>${link(`${p.path}/`, p.heading)}</li>`))}` : ""}
</article>`,
};

const pages = [
  ...basePages.map((page) => ({ ...page, body: listingBody(page) })),
  ...locationPages,
  ...servicePages,
];
const contentPages = [...guidePages, ...newsPages, ...answerPages, ...vehiclePages];

// ---------------------------------------------------------------- rendering
const hiddenStyle = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0";

function renderPage(page) {
  const lang = page.lang || "en";
  const canonical = cleanUrl(page.path);
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

  for (const hreflang of [...languages, "x-default"]) {
    const pattern = new RegExp(`(<link\\s+rel="alternate"\\s+hreflang="${hreflang}"\\s+href=")[^"]*("\\s*\\/?>)`, "s");
    html = html.replace(pattern, `$1${canonical}$2`);
  }

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
  return html.replace(
    /<script type="application\/ld\+json" data-seo="true">[\s\S]*?<\/script>/,
    () => `<script type="application/ld+json" data-seo="true">${jsonLd}</script>`,
  );
}

function renderHome() {
  let html = source.replace(
    /<div\s+id="root"([^>]*)>/,
    (match) => `${match}<div id="seo-content" style="${hiddenStyle}">${homePage.body}</div>`,
  );
  // The homepage keeps its tuned head from index.html; its single <h1> now lives in the body.
  html = html.replace(/<h1 style="margin: 0; font: inherit">.*?<\/h1>/s, `<div style="margin: 0; font: inherit">TRANSYACHT GROUP</div>`);
  return html;
}

function renderNotFound() {
  const title = `Page not found | ${brand}`;
  return source
    .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/s, `$1The page you requested could not be found.$2`)
    .replace(/(<meta\s+name="robots"\s+content=")[^"]*("\s*\/?>)/s, `$1noindex,follow$2`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/s, "")
    .replace(/<h1 style="margin: 0; font: inherit">.*?<\/h1>/s, `<div style="margin: 0; font: inherit">TRANSYACHT GROUP</div>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><main><h1>Page not found</h1><p><a href="/">Back to Trans Yacht Group</a></p></main></noscript>`);
}

// ---------------------------------------------------------------- sitemap
function sitemapEntry(page) {
  const loc = cleanUrl(page.path);
  const priority = page.path === "/" ? "1.0"
    : page.path === "/cars" || page.path === "/yachts" ? "0.9"
      : page.path.startsWith("/services/") || page.path.startsWith("/locations/") || page.path === "/guides" || page.path === "/news" || page.path === "/answers" ? "0.8"
        : "0.4";
  const changefreq = page.path === "/" ? "weekly" : page.path === "/cars" || page.path === "/yachts" ? "daily"
    : page.path === "/guides" || page.path === "/news" || page.path === "/answers" || page.path.startsWith("/services/") ? "weekly"
      : page.path.startsWith("/locations/") ? "monthly"
        : "yearly";
  return `  <url>
    <loc>${loc}</loc>
${page.lastmod ? `    <lastmod>${page.lastmod}</lastmod>\n` : ""}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function renderPagesSitemap(items) {
  const uniquePages = Array.from(new Map(items.map((page) => [cleanUrl(page.path), page])).values());
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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

await Promise.all([...pages, ...contentPages].map((page) => writePage(page.path, renderPage(page))));
await writeFile(join(outputDir, "index.html"), renderHome(), "utf8");
await writeFile(join(outputDir, "404.html"), renderNotFound(), "utf8");

// Only the hub pages and static pages go in pages-sitemap.xml; the API serves vehicle/guide/news/answer sitemaps.
await writeFile(join(outputDir, "pages-sitemap.xml"), renderPagesSitemap([{ path: "/" }, ...pages]), "utf8");

console.log(
  `Prerendered ${pages.length + 1} static pages + ${guidePages.length} guides, ${newsPages.length} news, ${answerPages.length} answers, ${vehiclePages.length} vehicles (API: ${apiBase})`,
);
