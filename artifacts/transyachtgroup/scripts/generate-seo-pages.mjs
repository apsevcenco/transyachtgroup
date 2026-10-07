import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectDir, "dist", "public");
const source = await readFile(join(outputDir, "index.html"), "utf8");
const siteUrl = "https://www.transyachtgroup.com";
const apiBase = process.env.VITE_API_URL || process.env.API_URL || "";
const languages = ["en", "fr", "ru", "ro", "ar"];
const servicePages = [
  ["luxury-car-rental-cannes", "Luxury Car Rental in Cannes", "Luxury car rental in Cannes with discreet delivery to hotels, villas, Port Canto and the Croisette, supported by a dedicated concierge."],
  ["luxury-car-rental-monaco", "Luxury Car Rental in Monaco", "Luxury and supercar rental in Monaco with private delivery in Monte-Carlo, Fontvieille and Port Hercule."],
  ["luxury-car-rental-nice", "Luxury Car Rental in Nice", "Luxury car rental in Nice with delivery to Nice Côte d’Azur Airport, hotels and private addresses across the French Riviera."],
  ["luxury-car-rental-saint-tropez", "Luxury Car Rental in Saint-Tropez", "Luxury car and supercar rental in Saint-Tropez with private delivery to villas, hotels, the port and Pampelonne."],
  ["luxury-car-rental-antibes", "Luxury Car Rental in Antibes", "Luxury car rental in Antibes and Cap d’Antibes with discreet delivery to hotels, villas, marinas and private residences."],
  ["luxury-car-rental-courchevel", "Luxury Car Rental in Courchevel", "Luxury car rental in Courchevel with premium SUVs, executive vehicles and discreet delivery for chalet and hotel stays."],
  ["courchevel-private-transfers", "Private Transfers to Courchevel", "Private luxury transfers to Courchevel from Geneva, Lyon, Chambery and Turin airports with executive vehicles and personal journey coordination."],
  ["geneva-airport-to-courchevel-transfer", "Geneva Airport to Courchevel Transfer", "Private transfer from Geneva Airport to Courchevel with executive vehicles, luggage planning and discreet concierge coordination."],
  ["lyon-airport-to-courchevel-transfer", "Lyon Airport to Courchevel Transfer", "Private transfer from Lyon Airport to Courchevel with executive vehicles, route planning and personal concierge support."],
  ["private-jet-to-car-transfer-courchevel", "Private Jet to Car Transfer in Courchevel", "Private jet to car transfer in Courchevel with executive vehicles, flight-aware pickup planning and discreet chalet coordination."],
  ["yacht-charter-cannes", "Luxury Yacht Charter in Cannes", "Private luxury yacht charter in Cannes with tailored itineraries, a curated fleet and dedicated concierge support."],
  ["yacht-charter-monaco", "Luxury Yacht Charter in Monaco", "Luxury yacht charter in Monaco with a curated selection, tailored itineraries and discreet concierge coordination."],
  ["yacht-charter-nice", "Luxury Yacht Charter in Nice", "Luxury yacht charter in Nice with tailored itineraries, curated yacht options and discreet concierge coordination."],
  ["yacht-charter-saint-tropez", "Luxury Yacht Charter in Saint-Tropez", "Luxury yacht charter in Saint-Tropez with private itineraries, beach club access planning and dedicated concierge support."],
  ["lamborghini-rental-french-riviera", "Lamborghini Rental on the French Riviera", "Rent a Lamborghini on the French Riviera with private delivery in Cannes, Monaco, Nice and Saint-Tropez."],
  ["mercedes-rental-french-riviera", "Mercedes-Benz Rental on the French Riviera", "Mercedes-Benz luxury car rental on the French Riviera, with private delivery from Nice to Cannes, Monaco and Saint-Tropez."],
  ["ferrari-rental-french-riviera", "Ferrari Rental on the French Riviera", "Ferrari rental on the French Riviera with private delivery in Cannes, Monaco, Nice and Saint-Tropez."],
  ["rolls-royce-rental-french-riviera", "Rolls-Royce Rental on the French Riviera", "Rolls-Royce rental on the French Riviera with discreet delivery for stays, events and private travel in Cannes and Monaco."],
  ["mercedes-rental-courchevel", "Mercedes-Benz Rental in Courchevel", "Mercedes-Benz rental in Courchevel for private transfers, chalet stays and winter mobility with concierge coordination."],
  ["rolls-royce-rental-courchevel", "Rolls-Royce Rental in Courchevel", "Rolls-Royce rental in Courchevel for discreet chalet arrivals, hotel stays and private winter mobility."],
  ["bentley-rental-courchevel", "Bentley Rental in Courchevel", "Bentley rental in Courchevel or comparable luxury SUV options for chalet stays, transfers and private winter travel."],
  ["lamborghini-rental-courchevel", "Lamborghini Rental in Courchevel", "Lamborghini rental in Courchevel with private delivery coordination, live availability checks and concierge support."],
  ["ferrari-rental-courchevel", "Ferrari Rental in Courchevel", "Ferrari rental in Courchevel with availability checked individually and delivery coordinated for premium winter stays."],
].map(([slug, heading, description]) => ({
  path: `/services/${slug}`,
  title: `${heading} | Trans Yacht Group`,
  description,
  heading,
}));

const pages = [
  {
    path: "/cars",
    title: "Luxury & Supercar Rental on the French Riviera | Trans Yacht Group",
    description: "Discover luxury cars and supercars for rent in Cannes, Monaco, Nice and Saint-Tropez with private delivery and concierge support.",
    heading: "Luxury Car Rental on the French Riviera",
  },
  {
    path: "/yachts",
    title: "Luxury Yacht Charter on the French Riviera | Trans Yacht Group",
    description: "Explore private yacht charters from Cannes, Monaco, Nice and Saint-Tropez with a dedicated Trans Yacht Group concierge.",
    heading: "Luxury Yacht Charter on the French Riviera",
  },
  {
    path: "/about",
    title: "About Trans Yacht Group | Luxury Mobility Concierge",
    description: "Meet the Cannes-based private mobility concierge specialising in luxury car rental and yacht charter across the French Riviera.",
    heading: "About Trans Yacht Group",
  },
  {
    path: "/guides",
    title: "French Riviera Luxury Travel Guides | Trans Yacht Group",
    description: "Expert guides to luxury car rental, yacht charter and private travel in Cannes, Monaco, Nice and Saint-Tropez.",
    heading: "French Riviera Luxury Travel Guides",
  },
  {
    path: "/news",
    title: "News from Trans Yacht Group | Luxury Mobility Updates",
    description: "Latest updates on luxury cars, VIP transfers and premium mobility across Monaco, the French Riviera and Courchevel.",
    heading: "News from Trans Yacht Group",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Trans Yacht Group",
    description: "Read the Trans Yacht Group privacy policy and learn how personal information is handled.",
    heading: "Privacy Policy",
  },
  {
    path: "/legal",
    title: "Legal Notice | Trans Yacht Group",
    description: "Legal information and company details for Trans Yacht Group.",
    heading: "Legal Notice",
  },
  ...["cannes", "monaco", "nice", "antibes", "saint-tropez", "courchevel"].map((city) => {
    const label = city.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("-");
    return {
      path: `/locations/${city}`,
      title: `Luxury Car Rental & Yacht Charter in ${label} | Trans Yacht Group`,
      description: `Private luxury car rental and yacht charter in ${label}, with a curated fleet, delivery and dedicated concierge service.`,
      heading: `Luxury Car Rental and Yacht Charter in ${label}`,
    };
  }),
  ...servicePages,
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactDescription(...values) {
  const text = values.map(stripHtml).find(Boolean) || "Luxury mobility insights from Trans Yacht Group.";
  return text.length > 155 ? `${text.slice(0, 152).trim()}…` : text;
}

function cleanUrl(path) {
  return `${siteUrl}${path === "/" ? "/" : `${path.replace(/\/$/, "")}/`}`;
}

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
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/s, `$1${description}$2`)
    .replace(/<h1 style="margin: 0; font: inherit">.*?<\/h1>/s, `<h1 style="margin: 0; font: inherit">${escapeHtml(page.heading)}</h1>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><main><h1>${escapeHtml(page.heading)}</h1><p>${description}</p></main></noscript>`);

  for (const lang of [...languages, "x-default"]) {
    const href = cleanUrl(page.path);
    const pattern = new RegExp(`(<link\\s+rel="alternate"\\s+hreflang="${lang}"\\s+href=")[^"]*("\\s*\\/?>)`, "s");
    html = html.replace(pattern, `$1${href}$2`);
  }

  const jsonLd = JSON.stringify({
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
  });
  return html.replace(
    /<script type="application\/ld\+json" data-seo="true">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" data-seo="true">${jsonLd}</script>`,
  );
}

function sitemapEntry(page) {
  const loc = cleanUrl(page.path);
  const priority = page.path === "/" ? "1.0"
    : page.path === "/cars" || page.path === "/yachts" ? "0.9"
      : page.path.startsWith("/services/") || page.path.startsWith("/locations/") || page.path === "/guides" || page.path === "/news" ? "0.8"
        : "0.4";
  const changefreq = page.path === "/cars" || page.path === "/yachts" ? "daily"
    : page.path === "/guides" || page.path === "/news" || page.path.startsWith("/services/") ? "weekly"
      : page.path.startsWith("/locations/") ? "monthly"
        : "yearly";
  const alternates = languages
    .map((lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc}"/>`)
    .join("\n");
  return `  <url>
    <loc>${loc}</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function renderPagesSitemap(items) {
  const uniquePages = Array.from(
    new Map(items.map((page) => [cleanUrl(page.path), page])).values(),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${uniquePages.map(sitemapEntry).join("\n")}
</urlset>
`;
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

async function fetchJson(path) {
  if (!apiBase || apiBase.startsWith("/")) return [];
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function loadContentPages(kind) {
  try {
    const items = await fetchJson(`/${kind}?lang=en`);
    return items
      .filter((item) => item?.slug && item?.title)
      .map((item) => ({
        path: `/${kind}/${item.slug}`,
        title: `${item.metaTitle || item.title} | Trans Yacht Group`,
        description: compactDescription(item.metaDescription, item.excerpt, item.content),
        heading: item.title,
        image: publicAssetUrl(item.coverImage),
      }));
  } catch (err) {
    console.warn(`Skipping ${kind} SEO detail pages: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

const dynamicContentPages = [
  ...(await loadContentPages("guides")),
  ...(await loadContentPages("news")),
];

await Promise.all(
  [...pages, ...dynamicContentPages].map(async (page) => {
    const directory = join(outputDir, page.path.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), renderPage(page), "utf8");
  }),
);

await writeFile(join(outputDir, "pages-sitemap.xml"), renderPagesSitemap([...pages, ...dynamicContentPages]), "utf8");

console.log(`Generated ${pages.length + dynamicContentPages.length} route-specific SEO pages`);
