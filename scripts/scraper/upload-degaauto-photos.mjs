/**
 * upload-degaauto-photos.mjs
 *
 * Takes scripts/scraper/output/degaauto-all-ready.json (produced by
 * scrape-degaauto.mjs, still pointing at degaauto's own CDN), and:
 *   1. Downloads every photo locally to output/photos/degaauto/{slug}/
 *   2. Uploads each photo to the Supabase "vehicle_images" storage bucket
 *   3. Rewrites image/images[] to the new Supabase public URLs
 *   4. Writes the result to output/degaauto-all-ready-final.json
 *
 * Supabase credentials are read from env vars (never hardcoded):
 *   VITE_SUPABASE_URL       (falls back to the project's known public URL)
 *   VITE_SUPABASE_ANON_KEY  (required — not committed anywhere in the repo)
 *
 * Usage:
 *   VITE_SUPABASE_ANON_KEY=xxx node scripts/scraper/upload-degaauto-photos.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");
const PHOTOS_DIR = join(OUTPUT_DIR, "photos", "degaauto");
const INPUT_FILE = join(OUTPUT_DIR, "degaauto-all-ready.json");
const OUTPUT_FILE = join(OUTPUT_DIR, "degaauto-all-ready-final.json");

const BUCKET = "vehicle_images";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yuazrortedwpauiophfn.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error("VITE_SUPABASE_ANON_KEY env var is required. Set it before running:");
  console.error("  VITE_SUPABASE_ANON_KEY=yourkey node scripts/scraper/upload-degaauto-photos.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
};

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}
function warn(msg) {
  console.warn(`[${new Date().toISOString()}] WARN  ${msg}`);
}

function extFromUrl(url) {
  const clean = url.split("?")[0];
  const ext = extname(clean).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
}

function contentTypeFor(ext) {
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }[ext] || "image/jpeg"
  );
}

async function downloadPhoto(url, destPath) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf;
}

async function uploadToSupabase(storagePath, buf, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function processVehicle(vehicle, index, total) {
  const slug = vehicle._slug;
  log(`[${index + 1}/${total}] ${vehicle.name} (${slug}) — ${vehicle.images.length} photo(s)`);

  const carDir = join(PHOTOS_DIR, slug);
  mkdirSync(carDir, { recursive: true });

  const newImages = [];
  for (let i = 0; i < vehicle.images.length; i++) {
    const url = vehicle.images[i];
    const ext = extFromUrl(url);
    const filename = `${String(i).padStart(2, "0")}${ext}`;
    const localPath = join(carDir, filename);
    const storagePath = `degaauto/${slug}/${filename}`;

    try {
      const buf = await downloadPhoto(url, localPath);
      const publicUrl = await uploadToSupabase(storagePath, buf, contentTypeFor(ext));
      newImages.push(publicUrl);
      log(`    ✓ ${filename} → ${publicUrl}`);
    } catch (err) {
      warn(`    ✗ ${filename} (${url}): ${err.message}`);
    }
  }

  if (newImages.length === 0) {
    warn(`  No photos succeeded for ${vehicle.name} — keeping original CDN URLs`);
    return vehicle;
  }

  return {
    ...vehicle,
    image: newImages[0],
    images: newImages,
  };
}

async function main() {
  let vehicles;
  try {
    vehicles = JSON.parse(await readFile(INPUT_FILE, "utf8"));
  } catch {
    console.error(`Cannot read ${INPUT_FILE} — run scrape-degaauto.mjs first.`);
    process.exit(1);
  }

  log(`Loaded ${vehicles.length} vehicles from ${INPUT_FILE}`);
  mkdirSync(PHOTOS_DIR, { recursive: true });

  const results = [];
  for (let i = 0; i < vehicles.length; i++) {
    results.push(await processVehicle(vehicles[i], i, vehicles.length));
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf8");

  const totalPhotos = vehicles.reduce((sum, v) => sum + v.images.length, 0);
  const migratedPhotos = results.reduce(
    (sum, v) => sum + v.images.filter((u) => u.includes("supabase")).length,
    0,
  );

  console.log("\n─────────────────────────────────────");
  log(`Done — ${migratedPhotos}/${totalPhotos} photos migrated to Supabase`);
  log(`Local photos: ${PHOTOS_DIR}`);
  log(`Final JSON:   ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
