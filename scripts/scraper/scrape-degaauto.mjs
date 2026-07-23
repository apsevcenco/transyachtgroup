/**
 * scrape-degaauto.mjs
 * Fetches all cars from the degaauto.com (Dega Monaco) public API and writes
 * scripts/scraper/output/degaauto-all-ready.json in InsertVehicle format
 * (visible: false — review before importing).
 *
 * The site is a base44.com-hosted SPA with no server-rendered car data; the
 * real data lives behind a public, unauthenticated entities API discovered
 * via network inspection:
 *   GET https://degaauto.com/api/apps/{appId}/entities/Car?sort=sort_order&limit=100
 *
 * Usage: node scripts/scraper/scrape-degaauto.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");
const OUTPUT_FILE = join(OUTPUT_DIR, "degaauto-all-ready.json");

const APP_ID = "6a3277b7bacd6c60903cf036";
const API_URL = `https://degaauto.com/api/apps/${APP_ID}/entities/Car?sort=sort_order&limit=100`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  Accept: "application/json",
};

function stripHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function transformToInsertVehicle(car) {
  const images =
    car.gallery_urls && car.gallery_urls.length ? car.gallery_urls : [car.image_url].filter(Boolean);
  const image = images[0] || car.image_url || "";

  const specs = {};
  if (car.category?.length) specs.bodyType = car.category.join(", ");
  if (car.engine) specs.engine = car.engine;
  if (car.horsepower != null) specs.horsepower = car.horsepower;
  if (car.transmission) specs.transmission = car.transmission;
  if (car.zero_to_sixty) specs.acceleration = car.zero_to_sixty;
  if (car.top_speed) specs.topSpeed = car.top_speed;
  if (car.seats != null) specs.seats = car.seats;
  if (car.fuel_type) specs.fuelType = car.fuel_type;
  if (car.year) specs.year = car.year;
  if (car.daily_rate_from != null) specs.pricePerDay = car.daily_rate_from;
  const fullDescription = stripHtml(car.long_description);
  if (fullDescription) specs.fullDescription = fullDescription;

  return {
    name: car.model,
    category: "car",
    description: stripHtml(car.short_description) || car.model,
    image,
    images,
    featured: false,
    visible: false,
    specs,
    translations: {},
    _sourceUrl: `https://degaauto.com/fleet/${car.slug}`,
    _slug: car.slug,
  };
}

async function scrape() {
  console.log(`Fetching: ${API_URL}`);

  let cars;
  try {
    const res = await fetch(API_URL, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cars = await res.json();
    console.log(`Fetched ${cars.length} cars`);
  } catch (err) {
    console.error("Fetch failed:", err.message);
    process.exit(1);
  }

  const vehicles = cars.map(transformToInsertVehicle);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(vehicles, null, 2), "utf8");

  console.log(`\nSaved → ${OUTPUT_FILE}`);

  // ── summary table ──────────────────────────────────────────────────────────
  console.log("\nSummary:");
  console.log(`  Total cars:  ${vehicles.length}`);
  const noPrice = vehicles.filter((v) => v.specs.pricePerDay == null);
  console.log(`  No price:    ${noPrice.length} (${noPrice.map((v) => v.name).join(", ") || "—"})`);
  console.log("");
  const nameW = Math.max(...vehicles.map((v) => v.name.length)) + 2;
  console.log(
    `  ${"Name".padEnd(nameW)}${"Body type".padEnd(28)}${"Price/day".padEnd(12)}Photos`,
  );
  console.log(`  ${"-".repeat(nameW + 28 + 12 + 6)}`);
  for (const v of vehicles) {
    const price = v.specs.pricePerDay != null ? `€${v.specs.pricePerDay}` : "—";
    console.log(
      `  ${v.name.padEnd(nameW)}${(v.specs.bodyType || "—").padEnd(28)}${price.padEnd(12)}${v.images.length}`,
    );
  }
}

scrape().catch((err) => {
  console.error("Scraper error:", err);
  process.exit(1);
});
