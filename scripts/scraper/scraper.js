import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LISTING_URL      = 'https://www.myboattrip.fr/bateaux/';
const OUTPUT_DIR       = path.join(__dirname, 'output');
const PHOTOS_DIR       = path.join(OUTPUT_DIR, 'photos');
const OUTPUT_RAW_FILE  = path.join(OUTPUT_DIR, 'boats.json');
const OUTPUT_READY_FILE = path.join(OUTPUT_DIR, 'boats-ready.json');

const TEST_MODE    = process.argv.includes('--test');
const YACHT_TARGET = TEST_MODE ? 2 : 15;
const SCAN_LIMIT   = TEST_MODE ? 20 : 100;
const DELAY_MS     = 600;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; boat-scraper/1.0; +research)',
  'Accept-Language': 'fr,en;q=0.9',
};

// ─── logging ──────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[${new Date().toISOString()}] WARN  ${msg}`); }

// ─── fetch ────────────────────────────────────────────────────────────────────

async function get(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

function fullSizeUrl(src) {
  return src.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
}

function extractPhotoUrls($) {
  const seen = new Set();
  const urls = [];

  $('img').each((_, el) => {
    const candidates = [
      $(el).attr('src'),
      $(el).attr('data-src'),
      $(el).attr('data-large-image'),
      $(el).attr('data-full-url'),
      $(el).attr('data-orig-file'),
    ];
    const srcset = $(el).attr('srcset') || '';
    srcset.split(',').forEach(entry => candidates.push(entry.trim().split(/\s+/)[0]));

    for (const raw of candidates) {
      if (!raw || !raw.includes('wp-content/uploads')) continue;
      const full = fullSizeUrl(raw);
      if (!seen.has(full)) { seen.add(full); urls.push(full); }
    }
  });

  $('a[href*="wp-content/uploads"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const full = fullSizeUrl(href);
    if (!seen.has(full)) { seen.add(full); urls.push(full); }
  });

  return urls;
}

function extractSpecs($) {
  const specs = {};

  $('strong').each((_, el) => {
    const key = $(el).text().replace(/[:\s]+$/, '').trim();
    if (!key || key.length > 60) return;

    const siblings = $(el).parent().contents().toArray();
    const pos = siblings.indexOf(el);
    if (pos === -1) return;

    const parts = [];
    for (let i = pos + 1; i < siblings.length; i++) {
      const node = siblings[i];
      if (node.type === 'tag' && node.name === 'strong') break;
      if (node.type === 'tag' && ['p','div','ul','ol','table','h1','h2','h3','h4'].includes(node.name)) break;
      if (node.type === 'text') parts.push(node.data);
      if (node.type === 'tag' && !['br','hr'].includes(node.name)) parts.push($(node).text());
    }

    const value = parts.join('').replace(/^[\s:–\-]+/, '').replace(/\s+/g, ' ').trim();
    if (value && value.length < 200) specs[key] = value;
  });

  return specs;
}

const SPEC_LINE_RE = /^[^:]{1,50}:\s*.+/;

function extractDescription($) {
  const selectors = [
    '.woocommerce-product-details__short-description',
    '.woocommerce-tabs .panel p',
    '.entry-content p',
    '.product-description',
  ];
  for (const sel of selectors) {
    const texts = [];
    $(sel).each((_, el) => {
      if ($(el).children('strong').length) return;
      const text = $(el).text().trim();
      if (text.length >= 40 && !SPEC_LINE_RE.test(text)) texts.push(text);
    });
    if (texts.length) return texts.join('\n\n');
  }

  const paras = [];
  $('p').each((_, el) => {
    if ($(el).children('strong').length) return;
    const text = $(el).text().trim();
    if (text.length >= 40 && !SPEC_LINE_RE.test(text)) paras.push(text);
  });
  return paras.join('\n\n');
}

// ─── scraping ─────────────────────────────────────────────────────────────────

async function getBoatUrls() {
  log(`Fetching listing: ${LISTING_URL}`);
  const html = await get(LISTING_URL);
  const $ = cheerio.load(html);

  const urls = new Set();
  $('li a[href*="/produit/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) urls.add(href.split('?')[0]);
  });

  log(`Found ${urls.size} unique boat URLs`);
  return [...urls];
}

async function scrapeBoat(url, index, total) {
  log(`[${index}/${total}] Scraping: ${url}`);
  const html = await get(url);
  const $ = cheerio.load(html);

  const name        = $('h1').first().text().trim();
  const specs       = extractSpecs($);
  const description = extractDescription($);
  const photos      = extractPhotoUrls($);

  const priceDay  = specs['Prix par jour']    || specs['Prix / jour']    || null;
  const priceWeek = specs['Prix par semaine'] || specs['Prix / semaine'] || null;

  log(`  → "${name}" | specs: ${Object.keys(specs).length} | photos: ${photos.length} | day: ${priceDay || '—'}`);

  return { url, name, description, specs, priceDay, priceWeek, photos };
}

// ─── photo download ───────────────────────────────────────────────────────────

async function downloadPhoto(photoUrl, boatSlug) {
  const ext      = path.extname(new URL(photoUrl).pathname) || '.jpg';
  const basename = path.basename(new URL(photoUrl).pathname, ext);
  const filename = `${boatSlug}__${basename}${ext}`;
  const dest     = path.join(PHOTOS_DIR, filename);

  if (existsSync(dest)) return filename;

  const res = await fetch(photoUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${photoUrl}`);
  await pipeline(res.body, createWriteStream(dest));
  return filename;
}

async function downloadBoatPhotos(boat) {
  const slug = new URL(boat.url).pathname.replace(/\//g, '-').replace(/^-|-$/g, '');
  const results = [];

  for (const photoUrl of boat.photos) {
    try {
      const filename = await downloadPhoto(photoUrl, slug);
      results.push({ url: photoUrl, local: `photos/${filename}` });
      log(`    ✓ ${filename}`);
    } catch (err) {
      warn(`    Failed: ${photoUrl} — ${err.message}`);
      results.push({ url: photoUrl, local: null, error: err.message });
    }
  }

  return results;
}

// ─── yacht qualification filter ───────────────────────────────────────────────

const SKIP_NAME_KEYWORDS = [
  'SEABOB', 'JET SKI', 'JETSKI', 'KAYAK', 'PADDLE', 'FOIL',
  'SCOOTER', 'TOBO', 'IAQUA', 'TENDER', 'DINGHY', 'BOUÉE',
  'TROTTINETTE', 'MOTO', 'WATER TOY',
];

function parseLengthMeters(str) {
  if (!str) return null;
  // "27 m", "27.5m", "27,5 m"
  const match = str.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*m/i);
  return match ? parseFloat(match[1]) : null;
}

function isRealYacht(boat) {
  const nameUpper = boat.name.toUpperCase();
  if (SKIP_NAME_KEYWORDS.some(kw => nameUpper.includes(kw))) return false;

  const s = boat.specs || {};
  const lengthStr = s['Longueur'] || s['Longueur totale'] || '';
  const length = parseLengthMeters(lengthStr);
  if (!length || length <= 10) return false;

  const cabinsRaw = s['Cabine'] || s['Cabines'] || '';
  const cabins = parseInt(String(cabinsRaw).match(/\d+/)?.[0] || '0', 10);
  if (cabins < 1) return false;

  // Must have at least some photos
  if (!boat.photos || boat.photos.length === 0) return false;

  return true;
}

// ─── transform to InsertVehicle ───────────────────────────────────────────────

function parsePrice(str) {
  if (!str) return null;
  // "6 333 € + TVA + Carburant" — French thousands separator is space
  const match = str.match(/([\d\s]+)\s*€/);
  if (!match) return null;
  const num = parseInt(match[1].replace(/\s/g, ''), 10);
  return isNaN(num) ? null : String(num);
}

function parseKnots(str) {
  if (!str) return null;
  const match = str.match(/(\d+(?:[.,]\d+)?)/);
  return match ? match[1].replace(',', '.') : null;
}

function parseSingleNumber(str) {
  if (!str) return null;
  const match = String(str).match(/\d+/);
  return match ? match[0] : null;
}

function parsePricingType(priceStr) {
  const lower = (priceStr || '').toLowerCase();
  if (lower.includes('tout compris') || lower.includes('all included') || lower.includes('inclus')) {
    return 'All included';
  }
  // "+TVA" or "+Carburant" means costs are on top → "plus APA"
  if (lower.includes('tva') || lower.includes('carburant') || lower.includes('apa')) {
    return 'plus APA';
  }
  return '';
}

function transformToInsertVehicle(boat) {
  const s = boat.specs || {};

  // ── prices ──
  const priceStr     = s['Prix par jour'] || s['Prix / jour'] || boat.priceDay || '';
  const priceWeekStr = s['Prix par semaine'] || s['Prix / semaine'] || boat.priceWeek || '';
  const pricePerDay  = parsePrice(priceStr);
  const pricePerWeek = parsePrice(priceWeekStr)
    || (pricePerDay ? String(Math.round(parseInt(pricePerDay, 10) * 6)) : null);
  const pricingType  = parsePricingType(priceStr);

  // ── dimensions ──
  const length = parseLengthMeters(s['Longueur'] || s['Longueur totale'] || '');
  const beam   = parseLengthMeters(s['Largeur'] || s['Largeur maxi'] || '');
  const draft  = parseLengthMeters(s["Tirant d'eau"] || s['Tirant d\'eau'] || s['Tirant'] || '');

  // ── people ──
  const cabins  = parseSingleNumber(s['Cabine'] || s['Cabines'] || '');
  const guests  = parseSingleNumber(s['Passagers en navigation'] || s['Passagers'] || s['Personnes'] || '');
  const crew    = parseSingleNumber(s['Équipage'] || s['Equipage'] || '');
  const berths  = parseSingleNumber(s['Couchage'] || '');

  // ── performance ──
  const cruisingSpeed = parseKnots(s['Vitesse de croisière'] || s['Vitesse croisière'] || '');
  const maxSpeed      = parseKnots(s['Vitesse maximale'] || s['Vitesse max'] || '');
  const fuelCapacity  = parseSingleNumber(s['Capacité carburant'] || s['Carburant'] || '');
  const waterCapacity = parseSingleNumber(s['Capacité eau'] || s['Eau'] || '');

  // ── identity ──
  const builder   = s['Constructeur'] || s['Chantier'] || '';
  const yearBuilt = (s['Année'] || s['Année de construction'] || s['Millésime'] || '').match(/\d{4}/)?.[0] || '';

  // ── name cleanup — strip trailing ** markers ──
  const name = boat.name.replace(/\*+$/, '').trim();

  // ── short description from available data ──
  const descParts = [];
  if (builder) descParts.push(builder);
  if (length)  descParts.push(`${length}m`);
  if (guests)  descParts.push(`${guests} guests`);
  if (cabins)  descParts.push(`${cabins} cabin${parseInt(cabins, 10) !== 1 ? 's' : ''}`);
  const description = descParts.join(' · ') || name;

  // ── specs object (only include non-empty values) ──
  const specs = {};
  if (pricePerDay)   specs.pricePerDay   = pricePerDay;
  if (pricePerWeek)  specs.pricePerWeek  = pricePerWeek;
  if (pricingType)   specs.pricingType   = pricingType;
  if (length != null) specs.length       = String(length);
  if (beam != null)   specs.beam         = String(beam);
  if (draft != null)  specs.draft        = String(draft);
  if (cabins)         specs.cabins       = cabins;
  if (guests)         specs.guests       = guests;
  if (berths)         specs.berths       = berths;     // extra info, no schema key but stored in jsonb
  if (crew)           specs.crew         = crew;
  if (cruisingSpeed)  specs.cruisingSpeed = cruisingSpeed;
  if (maxSpeed)       specs.maxSpeed      = maxSpeed;
  if (fuelCapacity)   specs.fuelCapacity  = fuelCapacity;
  if (waterCapacity)  specs.waterCapacity = waterCapacity;
  if (yearBuilt)      specs.yearBuilt     = yearBuilt;
  if (builder)        specs.builder       = builder;
  if (boat.description) specs.fullDescription = boat.description;
  specs.unitSystem = 'metric';

  // ── images (use original WordPress full-size URLs directly) ──
  const images = boat.photos || [];

  return {
    name,
    category: 'yacht',
    description,
    image: images[0] || '',
    images,
    featured: false,
    visible: false,      // start hidden — review in admin before publishing
    specs,
    translations: {},
    _sourceUrl: boat.url,  // stripped in import.js before POST
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });

  let allUrls = await getBoatUrls();
  const urls  = allUrls.slice(0, SCAN_LIMIT);

  log(TEST_MODE
    ? `TEST MODE — scanning up to ${SCAN_LIMIT} boats to find ${YACHT_TARGET} qualifying yachts`
    : `Scanning up to ${SCAN_LIMIT} boats to find ${YACHT_TARGET} qualifying yachts`
  );

  const rawBoats   = [];
  const readyBoats = [];

  for (let i = 0; i < urls.length; i++) {
    if (readyBoats.length >= YACHT_TARGET) {
      log(`Target reached (${YACHT_TARGET} yachts) — stopping early.`);
      break;
    }

    try {
      const boat = await scrapeBoat(urls[i], i + 1, urls.length);
      await sleep(DELAY_MS);

      if (!isRealYacht(boat)) {
        log(`  ↳ Skipped (not a qualifying yacht)`);
        rawBoats.push({ ...boat, _qualified: false });
        continue;
      }

      // Qualifying yacht — download photos
      const localPhotos = await downloadBoatPhotos(boat);
      rawBoats.push({ ...boat, localPhotos, _qualified: true });

      const ready = transformToInsertVehicle(boat);
      readyBoats.push(ready);

      log(`  ✓ Yacht ${readyBoats.length}/${YACHT_TARGET}: ${ready.name} — specs: [${Object.keys(ready.specs).join(', ')}]`);

      // Save progress after each qualifying boat
      await fs.writeFile(OUTPUT_RAW_FILE,   JSON.stringify(rawBoats,   null, 2));
      await fs.writeFile(OUTPUT_READY_FILE, JSON.stringify(readyBoats, null, 2));

      await sleep(DELAY_MS);
    } catch (err) {
      warn(`Error on ${urls[i]}: ${err.message}`);
    }
  }

  log(`\nDone — ${readyBoats.length} qualifying yachts from ${rawBoats.length} boats scanned`);
  log(`Raw data:    ${OUTPUT_RAW_FILE}`);
  log(`Import-ready: ${OUTPUT_READY_FILE}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
