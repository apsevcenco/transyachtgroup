/**
 * Import fleet units for identical vehicles (Renault Trafic x5, Mercedes
 * V-Class x2) — same model, different unit numbers.
 *
 * Usage:
 *   ADMIN_PASSWORD=secret API_BASE=https://host node import-fleet-units.mjs
 *
 * Renault Trafic units get empty specs/description/image (no existing
 * Renault Trafic found in the catalog). Mercedes V-Class units copy
 * description, specs, image, images, and translations from vehicle id=111
 * ("Mercedes-Benz V-Class 300 d Long"), the existing V-Class record.
 * All 7 are created as category="car", visible=false for review.
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_PASS = process.env.ADMIN_PASSWORD;
const SOURCE_VCLASS_ID = 111;

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[${new Date().toISOString()}] WARN  ${msg}`); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function login() {
  log(`POST ${API_BASE}/api/admin/login`);
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: API_PASS }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${JSON.stringify(body)}`);
  log(`Logged in — token: ${body.token.slice(0, 8)}… (expires ${body.expiresAt})`);
  return body.token;
}

async function fetchVehicle(token, id) {
  const res = await fetch(`${API_BASE}/api/vehicles/${id}?lang=en`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Fetch vehicle ${id} failed ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function postVehicle(token, payload) {
  const res = await fetch(`${API_BASE}/api/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function emptyVehiclePayload(name) {
  return {
    name,
    category: 'car',
    description: '',
    image: '',
    images: [],
    featured: false,
    visible: false,
    specs: {},
    translations: {},
  };
}

function clonedVehiclePayload(name, source) {
  return {
    name,
    category: 'car',
    description: source.description,
    image: source.image,
    images: source.images || [],
    featured: false,
    visible: false,
    specs: source.specs || {},
    translations: source.translations || {},
  };
}

async function main() {
  if (!API_PASS) {
    console.error('ADMIN_PASSWORD env var is required.');
    console.error('  ADMIN_PASSWORD=yourpassword API_BASE=https://host node import-fleet-units.mjs');
    process.exit(1);
  }

  const token = await login();

  log(`Fetching source Mercedes V-Class (id=${SOURCE_VCLASS_ID}) for spec/description/image/translation copy...`);
  const source = await fetchVehicle(token, SOURCE_VCLASS_ID);
  log(`Source loaded: ${(source.images || []).length} images, ${Object.keys(source.specs || {}).length} spec fields, translations for [${Object.keys(source.translations || {}).join(', ')}]`);

  const payloads = [
    ...['#131', '#132', '#134', '#135', '#136'].map((n) => emptyVehiclePayload(`Renault Trafic ${n}`)),
    clonedVehiclePayload('Mercedes V-Class LV', source),
    clonedVehiclePayload('Mercedes V-Class D', source),
  ];

  const results = { created: [], failed: [] };

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    log(`[${i + 1}/${payloads.length}] ${payload.name}`);
    try {
      const created = await postVehicle(token, payload);
      log(`  ✓ id=${created.id} — visible=false, review at ${API_BASE.replace('/api', '')}/admin`);
      results.created.push({ id: created.id, name: created.name });
    } catch (err) {
      warn(`  ✗ ${err.message}`);
      results.failed.push({ name: payload.name, error: err.message });
    }
    await sleep(300);
  }

  console.log('\n─────────────────────────────────────');
  log(`Import complete — ${results.created.length} succeeded, ${results.failed.length} failed`);
  console.log('\nCreated:');
  results.created.forEach((c) => console.log(`  id=${c.id}  ${c.name}`));
  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach((f) => console.log(`  ✗ ${f.name}: ${f.error}`));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
