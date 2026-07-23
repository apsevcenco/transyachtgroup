/**
 * scrape-single.mjs
 * Fetches the Mercedes SL 63 AMG listing from degaauto.com,
 * extracts all available data, and writes scripts/scraper/output/sl63-ready.json
 * in InsertVehicle format (visible: false — review before importing).
 *
 * Usage: node scripts/scraper/scrape-single.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");
const OUTPUT_FILE = join(OUTPUT_DIR, "sl63-ready.json");

const LISTING_URL = "https://www.degaauto.com/product/mercedes-sl-63-amg-rental/";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractText(html, openTag, closeTag) {
  const start = html.indexOf(openTag);
  if (start === -1) return null;
  const end = html.indexOf(closeTag, start + openTag.length);
  if (end === -1) return null;
  return html.slice(start + openTag.length, end);
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractAllMatches(html, pattern) {
  const results = [];
  let match;
  const re = new RegExp(pattern, "gi");
  while ((match = re.exec(html)) !== null) {
    results.push(match[1]);
  }
  return [...new Set(results)]; // deduplicate
}

// ── Fetch & parse ─────────────────────────────────────────────────────────────

async function scrape() {
  console.log(`Fetching: ${LISTING_URL}`);

  let html;
  try {
    const res = await fetch(LISTING_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
    console.log(`Fetched ${Math.round(html.length / 1024)} KB`);
  } catch (err) {
    console.error("Fetch failed:", err.message);
    process.exit(1);
  }

  // ── Vehicle name ──────────────────────────────────────────────────────────
  let name = "Mercedes SL 63 AMG"; // fallback
  const titleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)<\/h1>/is)
    || html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (titleMatch) {
    const extracted = stripTags(titleMatch[1]).trim();
    if (extracted.length > 3) name = extracted;
  }
  console.log(`Name: ${name}`);

  // ── Description ───────────────────────────────────────────────────────────
  let description = "";
  // WooCommerce short description
  const shortDescMatch = html.match(
    /<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (shortDescMatch) {
    description = stripTags(shortDescMatch[1]);
  }
  // WooCommerce long description tab
  if (!description) {
    const longDescMatch = html.match(
      /<div[^>]*id="tab-description"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
    );
    if (longDescMatch) description = stripTags(longDescMatch[1]);
  }
  // Generic product description fallback
  if (!description) {
    const descMatch = html.match(
      /<div[^>]*class="[^"]*product[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    );
    if (descMatch) description = stripTags(descMatch[1]);
  }

  if (!description) {
    // Hardcoded from page content (verified via WebFetch)
    description =
      "The Mercedes SL 63 AMG blends luxury grand touring comfort with AMG performance " +
      "and a striking roadster presence. Perfect for Monaco & the French Riviera when you " +
      "want open-air coastal drives with a premium image. Available in Paris and Milan for " +
      "high-end city arrivals and luxury lifestyle travel, and in Courchevel for exclusive " +
      "winter-season travel.\n\n" +
      "Luxury roadster experience with AMG performance character. Open-air grand touring " +
      "feel with refined, premium cabin. High-impact presence for hotels, restaurants, and " +
      "VIP events. Ideal for special occasions, luxury weekends, and elite itineraries.";
  }
  console.log(`Description: ${description.length} chars`);

  // ── Price ─────────────────────────────────────────────────────────────────
  let pricePerDay = "750";
  const priceMatch =
    html.match(/class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>.*?(\d[\d\s,]+)<\/bdi>/i) ||
    html.match(/(\d{3,})\s*[€$]/) ||
    html.match(/[€$]\s*(\d{3,})/);
  if (priceMatch) pricePerDay = priceMatch[1].replace(/[\s,]/g, "");
  console.log(`Price/day: €${pricePerDay}`);

  // ── Images ────────────────────────────────────────────────────────────────
  // Collect wp-content image URLs (deduplicated, exclude thumbnails by avoiding -150x, -300x etc.)
  const allImgUrls = extractAllMatches(
    html,
    /(?:src|data-src|data-large_image|href)="(https?:\/\/[^"]+\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/i,
  );

  // Prefer full-size: exclude WP auto-generated thumbnail sizes
  const fullSize = allImgUrls.filter(
    (u) => !/\-\d{2,4}x\d{2,4}\.(jpg|jpeg|png|webp)$/i.test(u),
  );

  // Fallback to hardcoded list verified via WebFetch (in case DOM parsing misses them)
  const knownImages = [
    "https://www.degaauto.com/wp-content/uploads/2024/02/WhatsApp-Image-2026-03-03-at-17.08.14-1-e1772559745558.jpeg",
    "https://www.degaauto.com/wp-content/uploads/2024/02/eoqiwepglszqmzsnrigg.jpg",
    "https://www.degaauto.com/wp-content/uploads/2024/02/suczyupvasq0unuupgbw.jpg",
    "https://www.degaauto.com/wp-content/uploads/2024/02/WhatsApp-Image-2026-03-03-at-17.08.12-3.jpeg",
    "https://www.degaauto.com/wp-content/uploads/2024/02/WhatsApp-Image-2026-03-03-at-17.08.12-2.jpeg",
    "https://www.degaauto.com/wp-content/uploads/2024/02/WhatsApp-Image-2026-03-03-at-17.08.15.jpeg",
    "https://www.degaauto.com/wp-content/uploads/2024/02/WhatsApp-Image-2026-03-03-at-17.08.14.jpeg",
  ];

  // Merge parsed + known, deduplicate
  const photos = [...new Set([...fullSize, ...knownImages])];
  const [heroImage, ...galleryImages] = photos;

  console.log(`Photos found: ${photos.length} (${fullSize.length} from HTML + ${knownImages.length} known)`);

  // ── Specs ─────────────────────────────────────────────────────────────────
  // The listing page has no spec table — supplement with well-known public specs
  // for the 2022+ Mercedes-AMG SL 63 (R232 generation, 4MATIC+)
  const specs = {
    pricePerDay,
    engine: "4.0L V8 Biturbo AMG",
    horsepower: "585",
    torque: "800",          // Nm
    acceleration: "3.6",    // 0–100 km/h
    topSpeed: "295",        // km/h (electronically limited)
    transmission: "AMG SPEEDSHIFT MCT 9G",
    drivetrain: "4MATIC+",
    seats: "4",
    fuelType: "Petrol",
    year: "2024",
    tagline: "Open-air grand touring with AMG performance — Monaco to Milan in style",
  };

  // ── Build InsertVehicle ───────────────────────────────────────────────────
  const vehicle = {
    name,
    category: "car",
    description,
    image: heroImage,
    images: galleryImages,
    featured: false,
    visible: false,        // review before making visible
    specs,
    translations: {},
  };

  // ── Write output ──────────────────────────────────────────────────────────
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    _meta: {
      source: LISTING_URL,
      scrapedAt: new Date().toISOString(),
      note: "Review all fields before importing. Set visible: true when ready.",
    },
    vehicle,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`\nSaved → ${OUTPUT_FILE}`);
  console.log("\nSummary:");
  console.log(`  Name:        ${vehicle.name}`);
  console.log(`  Category:    ${vehicle.category}`);
  console.log(`  Visible:     ${vehicle.visible}`);
  console.log(`  Hero photo:  ${vehicle.image}`);
  console.log(`  Gallery:     ${vehicle.images.length} photos`);
  console.log(`  Specs:       ${Object.keys(vehicle.specs).join(", ")}`);
}

scrape().catch((err) => {
  console.error("Scraper error:", err);
  process.exit(1);
});
