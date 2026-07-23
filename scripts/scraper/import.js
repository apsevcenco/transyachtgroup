/**
 * Import boats-ready.json into the API.
 *
 * Usage:
 *   ADMIN_PASSWORD=secret API_BASE=http://localhost:3000 node import.js
 *   node import.js --dry-run   (print payloads, no requests)
 *
 * The script logs into the API, then POSTs each boat as category "yacht"
 * with visible=false so you can review and publish them in the admin panel.
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_PASS = process.env.ADMIN_PASSWORD;
const DRY_RUN  = process.argv.includes('--dry-run');

function log(msg)  { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg) { console.warn(`[${new Date().toISOString()}] WARN  ${msg}`); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── auth ─────────────────────────────────────────────────────────────────────

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

// ─── import ───────────────────────────────────────────────────────────────────

function stripMeta(boat) {
  // Remove scraper-only fields before POSTing to the API
  const { _sourceUrl, _qualified, _slug, localPhotos, ...payload } = boat;
  return payload;
}

async function postVehicle(token, payload) {
  const res = await fetch(`${API_BASE}/api/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  return body;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Optional positional arg: node import.js sl63-import.json  (defaults to degaauto-all-ready-final.json)
  const inputFile = process.argv.find(a => !a.startsWith('-') && a.endsWith('.json')) || 'degaauto-all-ready-final.json';
  const readyFile = path.join(__dirname, 'output', inputFile);

  let boats;
  try {
    boats = JSON.parse(await fs.readFile(readyFile, 'utf8'));
  } catch {
    console.error(`Cannot read ${readyFile} — check the file exists.`);
    process.exit(1);
  }

  log(`Loaded ${boats.length} vehicle(s) from ${inputFile}`);

  if (DRY_RUN) {
    log('DRY RUN — no requests will be sent\n');
    boats.forEach((b, i) => {
      const p = stripMeta(b);
      console.log(`[${i + 1}] ${p.name}`);
      console.log(`     category: ${p.category} | visible: ${p.visible} | featured: ${p.featured}`);
      console.log(`     images:   ${p.images.length}`);
      console.log(`     specs:    ${Object.keys(p.specs).join(', ')}`);
      console.log(`     source:   ${b._sourceUrl || '—'}`);
    });
    return;
  }

  if (!API_PASS) {
    console.error('ADMIN_PASSWORD env var is required. Set it before running import.');
    console.error('  ADMIN_PASSWORD=yourpassword node import.js');
    process.exit(1);
  }

  const token = await login();

  const results = { imported: [], failed: [] };

  for (let i = 0; i < boats.length; i++) {
    const boat    = boats[i];
    const payload = stripMeta(boat);

    log(`[${i + 1}/${boats.length}] ${payload.name}`);

    try {
      const created = await postVehicle(token, payload);
      log(`  ✓ id=${created.id} — visible=false, review at ${API_BASE.replace('/api', '')}/admin`);
      results.imported.push({ id: created.id, name: created.name, sourceUrl: boat._sourceUrl });
    } catch (err) {
      warn(`  ✗ ${err.message}`);
      results.failed.push({ name: payload.name, sourceUrl: boat._sourceUrl, error: err.message });
    }

    await sleep(300);
  }

  // ── summary ──
  console.log('\n─────────────────────────────────────');
  log(`Import complete — ${results.imported.length} succeeded, ${results.failed.length} failed`);

  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach(f => console.log(`  ✗ ${f.name}: ${f.error}`));
  }

  // Save results alongside the data
  const resultsFile = path.join(__dirname, 'output', 'import-results.json');
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  log(`Results saved to ${resultsFile}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
