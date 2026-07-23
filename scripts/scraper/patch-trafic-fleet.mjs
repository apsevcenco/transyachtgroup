/**
 * Copy specs/description/images/translations from the existing Renault
 * Traffic (id=114) onto the 5 blank Renault Trafic fleet units (178-182)
 * created earlier, via PUT /api/vehicles/:id (no PATCH route exists — PUT
 * replaces the full record, so each target's own name/category/visible/
 * featured are fetched first and sent back unchanged).
 *
 * Usage:
 *   ADMIN_PASSWORD=secret API_BASE=https://host node patch-trafic-fleet.mjs
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_PASS = process.env.ADMIN_PASSWORD;
const SOURCE_ID = 114;
const TARGET_IDS = [178, 179, 180, 181, 182];

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
  log(`Logged in — token: ${body.token.slice(0, 8)}…`);
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

async function fetchAllVehicles(token) {
  const res = await fetch(`${API_BASE}/api/vehicles?all=true&lang=en`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Fetch vehicle list failed ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function putVehicle(token, id, payload) {
  const res = await fetch(`${API_BASE}/api/vehicles/${id}`, {
    method: 'PUT',
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

async function main() {
  if (!API_PASS) {
    console.error('ADMIN_PASSWORD env var is required.');
    process.exit(1);
  }

  const token = await login();

  log(`Fetching source Renault Traffic (id=${SOURCE_ID})...`);
  const source = await fetchVehicle(token, SOURCE_ID);
  log(`Source loaded: ${(source.images || []).length} images, ${Object.keys(source.specs || {}).length} spec fields, translations for [${Object.keys(source.translations || {}).join(', ')}]`);

  // GET /vehicles/:id filters out visible=false records regardless of auth
  // (it's the public-facing single-vehicle endpoint) — the hidden fleet-unit
  // targets 404 there, so fetch them via the list endpoint (?all=true) instead.
  const allVehicles = await fetchAllVehicles(token);

  const results = { patched: [], failed: [] };

  for (const id of TARGET_IDS) {
    log(`Patching id=${id}...`);
    try {
      const target = allVehicles.find((v) => v.id === id);
      if (!target) throw new Error(`Vehicle ${id} not found in list`);
      const payload = {
        name: target.name,
        category: target.category,
        featured: target.featured ?? false,
        visible: target.visible ?? false,
        description: source.description,
        image: source.image,
        images: source.images || [],
        specs: source.specs || {},
        translations: source.translations || {},
      };
      const updated = await putVehicle(token, id, payload);
      log(`  ✓ id=${updated.id} name=${JSON.stringify(updated.name)} — images=${(updated.images || []).length} specs=${Object.keys(updated.specs || {}).length}`);
      results.patched.push({ id: updated.id, name: updated.name });
    } catch (err) {
      warn(`  ✗ id=${id}: ${err.message}`);
      results.failed.push({ id, error: err.message });
    }
    await sleep(300);
  }

  console.log('\n─────────────────────────────────────');
  log(`Patch complete — ${results.patched.length} succeeded, ${results.failed.length} failed`);
  console.log('\nPatched:');
  results.patched.forEach((p) => console.log(`  id=${p.id}  ${p.name}`));
  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach((f) => console.log(`  ✗ id=${f.id}: ${f.error}`));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
