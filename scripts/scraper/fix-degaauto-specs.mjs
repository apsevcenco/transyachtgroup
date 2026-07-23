/**
 * fix-degaauto-specs.mjs
 *
 * One-off data fix for the 61 degaauto cars imported earlier (production
 * IDs 117-177). Those records were written with numeric spec values
 * (horsepower, seats, pricePerDay, etc.) while every other vehicle in the
 * table stores specs as strings — the mismatch crashed the vehicle detail
 * page (.replace()/.match() on a number). This script fetches each
 * vehicle, stringifies the offending spec fields, and writes it back.
 *
 * Notes on the API (artifacts/api-server/src/routes/vehicles.ts):
 *  - There's no PATCH route, only GET/POST/PUT/DELETE on /vehicles/:id.
 *    PUT replaces the whole record via insertVehicleSchema, so this script
 *    fetches the current record first and PUTs it back with only specs changed.
 *  - GET /vehicles/:id filters out visible=false rows entirely (404), and
 *    these 61 records are still hidden pending review. So vehicles are
 *    fetched once via GET /vehicles?all=true instead, then filtered by ID.
 *
 * Usage:
 *   ADMIN_PASSWORD=secret API_BASE=https://transyacht-api.onrender.com node scripts/scraper/fix-degaauto-specs.mjs
 *   node scripts/scraper/fix-degaauto-specs.mjs --dry-run   (print what would change, no requests)
 */

import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const API_PASS = process.env.ADMIN_PASSWORD;
const DRY_RUN = process.argv.includes("--dry-run");

const FIRST_ID = 117;
const LAST_ID = 177;
const NUMERIC_SPEC_FIELDS = [
  "horsepower",
  "seats",
  "pricePerDay",
  "pricePerWeek",
  "acceleration",
  "topSpeed",
  "year",
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}
function warn(msg) {
  console.warn(`[${new Date().toISOString()}] WARN  ${msg}`);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login() {
  log(`POST ${API_BASE}/api/admin/login`);
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: API_PASS }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${JSON.stringify(body)}`);
  log(`Logged in — token: ${body.token.slice(0, 8)}… (expires ${body.expiresAt})`);
  return body.token;
}

async function getAllVehicles() {
  const res = await fetch(`${API_BASE}/api/vehicles?all=true`);
  const body = await res.json();
  if (!res.ok) throw new Error(`GET /vehicles?all=true → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function putVehicle(token, id, payload) {
  const res = await fetch(`${API_BASE}/api/vehicles/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`PUT ${id} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function fixSpecs(specs) {
  const fixed = { ...specs };
  const changed = [];
  for (const field of NUMERIC_SPEC_FIELDS) {
    if (fixed[field] != null && typeof fixed[field] === "number") {
      changed.push(`${field}: ${fixed[field]} (number) → "${fixed[field]}" (string)`);
      fixed[field] = String(fixed[field]);
    }
  }
  return { fixed, changed };
}

async function main() {
  if (!DRY_RUN && !API_PASS) {
    console.error("ADMIN_PASSWORD env var is required. Set it before running.");
    console.error("  ADMIN_PASSWORD=yourpassword API_BASE=https://... node scripts/scraper/fix-degaauto-specs.mjs");
    process.exit(1);
  }

  const token = DRY_RUN ? null : await login();

  const allVehicles = await getAllVehicles();
  const targets = allVehicles.filter((v) => v.id >= FIRST_ID && v.id <= LAST_ID);
  log(`Fetched ${allVehicles.length} total vehicles — ${targets.length} in range [${FIRST_ID}-${LAST_ID}]`);

  const results = { fixed: [], skipped: [], failed: [] };

  for (const vehicle of targets) {
    const id = vehicle.id;
    try {
      const { fixed, changed } = fixSpecs(vehicle.specs || {});

      if (changed.length === 0) {
        log(`[${id}] ${vehicle.name} — no numeric spec fields found, skipping`);
        results.skipped.push({ id, name: vehicle.name });
        continue;
      }

      log(`[${id}] ${vehicle.name} — ${changed.join(", ")}`);

      if (DRY_RUN) {
        results.fixed.push({ id, name: vehicle.name, changed });
        continue;
      }

      const { id: _id, createdAt: _createdAt, ...rest } = vehicle;
      await putVehicle(token, id, { ...rest, specs: fixed });
      log(`  ✓ updated`);
      results.fixed.push({ id, name: vehicle.name, changed });

      await sleep(200);
    } catch (err) {
      warn(`[${id}] ✗ ${err.message}`);
      results.failed.push({ id, error: err.message });
    }
  }

  console.log("\n─────────────────────────────────────");
  log(
    `${DRY_RUN ? "DRY RUN " : ""}Done — ${results.fixed.length} fixed, ${results.skipped.length} already-clean, ${results.failed.length} failed`,
  );
  if (results.failed.length > 0) {
    console.log("\nFailed:");
    results.failed.forEach((f) => console.log(`  ✗ [${f.id}] ${f.error}`));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
