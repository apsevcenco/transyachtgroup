import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectDir, "dist", "public");
const source = await readFile(join(outputDir, "index.html"), "utf8");
const siteUrl = "https://www.transyachtgroup.com";
const languages = ["en", "fr", "ru", "ro", "ar"];
const servicePages = [
  ["luxury-car-rental-cannes", "Luxury Car Rental in Cannes", "Luxury car rental in Cannes with discreet delivery to hotels, villas, Port Canto and the Croisette, supported by a dedicated concierge."],
  ["luxury-car-rental-monaco", "Luxury Car Rental in Monaco", "Luxury and supercar rental in Monaco with private delivery in Monte-Carlo, Fontvieille and Port Hercule."],
  ["luxury-car-rental-nice", "Luxury Car Rental in Nice", "Luxury car rental in Nice with delivery to Nice Côte d’Azur Airport, hotels and private addresses across the French Riviera."],
  ["luxury-car-rental-saint-tropez", "Luxury Car Rental in Saint-Tropez", "Luxury car and supercar rental in Saint-Tropez with private delivery to villas, hotels, the port and Pampelonne."],
  ["yacht-charter-cannes", "Luxury Yacht Charter in Cannes", "Private luxury yacht charter in Cannes with tailored itineraries, a curated fleet and dedicated concierge support."],
  ["yacht-charter-monaco", "Luxury Yacht Charter in Monaco", "Luxury yacht charter in Monaco with a curated selection, tailored itineraries and discreet concierge coordination."],
  ["lamborghini-rental-french-riviera", "Lamborghini Rental on the French Riviera", "Rent a Lamborghini on the French Riviera with private delivery in Cannes, Monaco, Nice and Saint-Tropez."],
  ["mercedes-rental-french-riviera", "Mercedes-Benz Rental on the French Riviera", "Mercedes-Benz luxury car rental on the French Riviera, with private delivery from Nice to Cannes, Monaco and Saint-Tropez."],
  ["ferrari-rental-french-riviera", "Ferrari Rental on the French Riviera", "Ferrari rental on the French Riviera with private delivery in Cannes, Monaco, Nice and Saint-Tropez."],
  ["rolls-royce-rental-french-riviera", "Rolls-Royce Rental on the French Riviera", "Rolls-Royce rental on the French Riviera with discreet delivery for stays, events and private travel in Cannes and Monaco."],
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
  ...["cannes", "monaco", "nice", "antibes", "saint-tropez"].map((city) => {
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderPage(page) {
  const canonical = `${siteUrl}${page.path}/?lang=en`;
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
    const targetLang = lang === "x-default" ? "en" : lang;
    const href = `${siteUrl}${page.path}/?lang=${targetLang}`;
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
    inLanguage: "en",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
  });
  return html.replace(
    /<script type="application\/ld\+json" data-seo="true">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" data-seo="true">${jsonLd}</script>`,
  );
}

await Promise.all(
  pages.map(async (page) => {
    const directory = join(outputDir, page.path.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), renderPage(page), "utf8");
  }),
);

console.log(`Generated ${pages.length} route-specific SEO pages`);
