/**
 * Link the 61 degaauto-imported vehicles (ids 117-177) to the existing
 * "DeGa Auto" agent (id=1): sets ownership="agent" and agentId=1.
 *
 * Usage:
 *   ADMIN_PASSWORD=secret API_BASE=https://host node link-degaauto-agent.mjs
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_PASS = process.env.ADMIN_PASSWORD;
const AGENT_ID = 1;
const TARGET_IDS = Array.from({ length: 177 - 117 + 1 }, (_, i) => 117 + i);

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

  log('Fetching full vehicle list...');
  const allVehicles = await fetchAllVehicles(token);

  const results = { updated: [], failed: [], missing: [] };

  for (const id of TARGET_IDS) {
    const target = allVehicles.find((v) => v.id === id);
    if (!target) {
      warn(`id=${id}: not found in vehicle list, skipping`);
      results.missing.push(id);
      continue;
    }
    try {
      const payload = {
        name: target.name,
        category: target.category,
        description: target.description,
        image: target.image,
        images: target.images || [],
        featured: target.featured ?? false,
        visible: target.visible ?? false,
        specs: target.specs || {},
        translations: target.translations || {},
        ownership: 'agent',
        agentId: AGENT_ID,
      };
      const updated = await putVehicle(token, id, payload);
      log(`  ✓ id=${updated.id} name=${JSON.stringify(updated.name)} ownership=${updated.ownership} agentId=${updated.agentId}`);
      results.updated.push({ id: updated.id, name: updated.name });
    } catch (err) {
      warn(`  ✗ id=${id}: ${err.message}`);
      results.failed.push({ id, error: err.message });
    }
    await sleep(250);
  }

  console.log('\n─────────────────────────────────────');
  log(`Update complete — ${results.updated.length} succeeded, ${results.failed.length} failed, ${results.missing.length} missing`);
  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach((f) => console.log(`  ✗ id=${f.id}: ${f.error}`));
  }
  if (results.missing.length > 0) {
    console.log('\nMissing (not found in vehicle list):', results.missing.join(', '));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
