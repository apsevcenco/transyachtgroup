/**
 * patch-degaauto-specs.mjs
 *
 * One-off data fix for the 61 degaauto cars (production IDs 117-177).
 * The scraper (scrape-degaauto.mjs) could only populate the spec fields that
 * exist in degaauto's own source API (engine, horsepower, transmission,
 * acceleration, topSpeed, seats, bodyType) — it has no torque, drivetrain,
 * or fuelType fields at all, so every one of the 61 cars was missing exactly
 * those three. This script fills them in from manually-researched real-world
 * specs (torque in Nm, drivetrain layout, fuel type), keyed by vehicle ID.
 *
 * Also fixes vehicle 153 (McLaren Artura Spider)'s `name` field, which was
 * saved as HTML (`<p><span style="font-family: 'Porter FT';">...`) after
 * being opened once in the admin's rich-text editor, instead of plain text.
 *
 * Notes on the API (see fix-degaauto-specs.mjs for the same caveats):
 *  - No PATCH route — PUT replaces the whole record via insertVehicleSchema.
 *  - GET /vehicles/:id excludes visible=false rows (404), so records are
 *    fetched once via GET /vehicles?all=true and filtered by ID instead.
 *
 * Usage:
 *   ADMIN_PASSWORD=secret API_BASE=https://transyacht-api.onrender.com node scripts/scraper/patch-degaauto-specs.mjs
 *   node scripts/scraper/patch-degaauto-specs.mjs --dry-run   (print what would change, no requests)
 */

import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const API_PASS = process.env.ADMIN_PASSWORD;
const DRY_RUN = process.argv.includes("--dry-run");

const FIRST_ID = 117;
const LAST_ID = 177;

// ── researched specs, keyed by vehicle ID ──────────────────────────────────
// torque: Nm peak torque. drivetrain: RWD/AWD/FWD or manufacturer-specific
// (4MATIC/4MATIC+). fuelType: Petrol/Diesel/Hybrid/Electric only.
const PATCH_DATA = {
  117: { torque: "1600 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Bugatti Chiron
  118: { torque: "770 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Bentley Bentayga V8
  119: { torque: "900 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Rolls-Royce Cullinan Black Badge
  120: { torque: "740 Nm", drivetrain: "RWD", fuelType: "Hybrid" }, // Ferrari 296 GTB
  121: { torque: "850 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Rolls-Royce Cullinan Serie II
  122: { torque: "740 Nm", drivetrain: "RWD", fuelType: "Hybrid" }, // Ferrari 296 GTS Spider
  123: { torque: "850 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Rolls-Royce Cullinan Serie II
  124: { torque: "760 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Ferrari 488 Spider
  125: { torque: "820 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Rolls-Royce Dawn
  126: { torque: "770 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Ferrari F8 Spider
  127: { torque: "800 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Audi RS6 Avant
  128: { torque: "900 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Rolls-Royce Ghost Black Badge
  129: { torque: "760 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Ferrari Portofino
  130: { torque: "850 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Rolls-Royce Ghost Long
  131: { torque: "716 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Ferrari Purosangue
  132: { torque: "685 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Aston Martin Vantage V8 Spider
  133: { torque: "900 Nm", drivetrain: "AWD", fuelType: "Electric" }, // Rolls-Royce Spectre Electric
  134: { torque: "900 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Bentley Continental GT Speed W12
  135: { torque: "760 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Ferrari Roma Spider
  136: { torque: "900 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Bentley Continental GTC Speed Edition 12
  137: { torque: "800 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // Ferrari SF90 Spider
  138: { torque: "1000 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // Bentley Continental GTC Speed V8 Hybrid
  139: { torque: "600 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Lamborghini Huracán EVO Spyder
  140: { torque: "1000 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // Bentley Continental GTC Speed V8 Hybrid
  141: { torque: "600 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Lamborghini Huracán EVO Spyder
  142: { torque: "900 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Bentley Continental GTC Speed W12
  143: { torque: "725 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // Lamborghini Revuelto
  144: { torque: "850 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Lamborghini Urus Graphite Edition
  145: { torque: "950 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // Lamborghini Urus SE
  146: { torque: "950 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // Lamborghini Urus SE
  147: { torque: "550 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Land Rover Defender 130 X
  148: { torque: "700 Nm", drivetrain: "AWD", fuelType: "Diesel" }, // Range Rover Autobiography D350
  149: { torque: "400 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // BMW 430i Cabrio
  150: { torque: "340 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Range Rover Evoque Cabrio
  151: { torque: "750 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Range Rover Autobiography LWB P530
  152: { torque: "800 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // McLaren 750S Spider
  153: { torque: "720 Nm", drivetrain: "RWD", fuelType: "Hybrid" }, // McLaren Artura Spider
  154: { torque: "500 Nm", drivetrain: "4MATIC", fuelType: "Hybrid" }, // Mercedes-Benz E 450 Cabriolet
  155: { torque: "750 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // BMW X5M Competition
  156: { torque: "850 Nm", drivetrain: "4MATIC", fuelType: "Petrol" }, // Mercedes-AMG G 63
  157: { torque: "850 Nm", drivetrain: "4MATIC", fuelType: "Petrol" }, // Mercedes-AMG G 63 Matte Grey
  158: { torque: "730 Nm", drivetrain: "4MATIC", fuelType: "Hybrid" }, // Mercedes-Maybach GLS 600
  159: { torque: "850 Nm", drivetrain: "4MATIC+", fuelType: "Hybrid" }, // Mercedes-AMG GLS 63
  160: { torque: "700 Nm", drivetrain: "AWD", fuelType: "Diesel" }, // BMW X7 40d
  161: { torque: "700 Nm", drivetrain: "4MATIC", fuelType: "Hybrid" }, // Mercedes-Maybach S 580
  162: { torque: "450 Nm", drivetrain: "4MATIC", fuelType: "Hybrid" }, // Mercedes-Benz S 400 4MATIC Long
  163: { torque: "560 Nm", drivetrain: "4MATIC", fuelType: "Hybrid" }, // Mercedes-Benz S 500 4MATIC Long
  164: { torque: "700 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Mercedes-Benz S 560 Cabriolet
  165: { torque: "800 Nm", drivetrain: "4MATIC+", fuelType: "Petrol" }, // Mercedes-AMG SL 63
  166: { torque: "750 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // BMW X7 M60i
  167: { torque: "500 Nm", drivetrain: "4MATIC", fuelType: "Diesel" }, // Mercedes-Benz V 300 d 4MATIC AMG Extralong
  168: { torque: "380 Nm", drivetrain: "FWD", fuelType: "Petrol" }, // MINI John Cooper Works Cabrio
  169: { torque: "201 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Morgan Plus 4
  170: { torque: "380 Nm", drivetrain: "FWD", fuelType: "Petrol" }, // MINI John Cooper Works Cabrio (Blue)
  171: { torque: "800 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // BMW XM M (653 hp, standard)
  172: { torque: "800 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Porsche 911 992 Carrera Turbo S Cabrio
  173: { torque: "530 Nm", drivetrain: "RWD", fuelType: "Petrol" }, // Porsche 911 Carrera S Cabrio
  174: { torque: "651 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Porsche 992 Carrera 4 GTS Cabrio
  175: { torque: "500 Nm", drivetrain: "4MATIC", fuelType: "Diesel" }, // Mercedes-Benz V 300 d 4x4 Extralong VIP AVERS
  176: { torque: "1000 Nm", drivetrain: "AWD", fuelType: "Hybrid" }, // BMW XM M Red Label (748 hp, higher-output "Label")
  177: { torque: "530 Nm", drivetrain: "AWD", fuelType: "Petrol" }, // Porsche Carrera 4 S Cabrio
};

// Plain-text name fix for records that got saved as HTML after an admin edit.
const NAME_FIXES = {
  153: "McLaren Artura Spider",
};

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

async function main() {
  if (!DRY_RUN && !API_PASS) {
    console.error("ADMIN_PASSWORD env var is required. Set it before running.");
    console.error("  ADMIN_PASSWORD=yourpassword API_BASE=https://... node scripts/scraper/patch-degaauto-specs.mjs");
    process.exit(1);
  }

  const token = DRY_RUN ? null : await login();

  const allVehicles = await getAllVehicles();
  const targets = allVehicles.filter((v) => v.id >= FIRST_ID && v.id <= LAST_ID);
  log(`Fetched ${allVehicles.length} total vehicles — ${targets.length} in range [${FIRST_ID}-${LAST_ID}]`);

  const results = { patched: [], skipped: [], failed: [] };

  for (const vehicle of targets) {
    const id = vehicle.id;
    try {
      const patch = PATCH_DATA[id];
      if (!patch) {
        log(`[${id}] ${vehicle.name} — no patch data defined, skipping`);
        results.skipped.push({ id, name: vehicle.name });
        continue;
      }

      const changes = [];
      const newSpecs = { ...vehicle.specs };
      for (const field of ["torque", "drivetrain", "fuelType"]) {
        if (newSpecs[field] !== patch[field]) {
          changes.push(`specs.${field}: ${JSON.stringify(newSpecs[field] ?? null)} → ${JSON.stringify(patch[field])}`);
          newSpecs[field] = patch[field];
        }
      }

      let newName = vehicle.name;
      if (NAME_FIXES[id] && vehicle.name !== NAME_FIXES[id]) {
        changes.push(`name: ${JSON.stringify(vehicle.name)} → ${JSON.stringify(NAME_FIXES[id])}`);
        newName = NAME_FIXES[id];
      }

      if (changes.length === 0) {
        log(`[${id}] ${vehicle.name} — already up to date, skipping`);
        results.skipped.push({ id, name: vehicle.name });
        continue;
      }

      log(`[${id}] ${vehicle.name}\n    ${changes.join("\n    ")}`);

      if (DRY_RUN) {
        results.patched.push({ id, name: vehicle.name, changes });
        continue;
      }

      const { id: _id, createdAt: _createdAt, ...rest } = vehicle;
      await putVehicle(token, id, { ...rest, name: newName, specs: newSpecs });
      log(`  ✓ updated`);
      results.patched.push({ id, name: vehicle.name, changes });

      await sleep(200);
    } catch (err) {
      warn(`[${id}] ✗ ${err.message}`);
      results.failed.push({ id, error: err.message });
    }
  }

  console.log("\n─────────────────────────────────────");
  log(
    `${DRY_RUN ? "DRY RUN " : ""}Done — ${results.patched.length} patched, ${results.skipped.length} already-clean, ${results.failed.length} failed`,
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
