// ── Nexora CRM — Deals & Kanban Pipeline Test Suite ───────────
import http from 'http';

const BASE_URL = 'http://localhost:3001';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: res.headers['set-cookie'] || [],
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(cookieHeaders, name = 'nexora_token') {
  if (!cookieHeaders) return null;
  const list = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
  for (const c of list) {
    if (c.startsWith(`${name}=`)) {
      return c.split(';')[0];
    }
  }
  return null;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 Testing Deals Module, Kanban Pipeline, DnD & Authorization');
  console.log('================================================================\n');

  // Authenticate as Owner (Alexandra Reid)
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@nexora.io',
    password: 'nexora123',
  });
  const ownerCookie = extractCookie(loginRes.cookies);
  assert(Boolean(ownerCookie), 'Owner session cookie obtained');

  // Authenticate as Sales Rep (Priya Sharma)
  const repLoginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'priya@nexora.io',
    password: 'nexora123',
  });
  const repCookie = extractCookie(repLoginRes.cookies);
  assert(Boolean(repCookie), 'Sales Rep session cookie obtained');

  // ── 1. Pipeline Metrics & Kanban Columns ────────────────────
  console.log('\n--- 1. Pipeline Metrics & Kanban Valuation Calculations ---');
  const pipeRes = await makeRequest('GET', '/api/deals/pipeline', null, { Cookie: ownerCookie });
  assert(pipeRes.status === 200, `GET /api/deals/pipeline returns 200 (Got ${pipeRes.status})`);
  assert(Boolean(pipeRes.body.metrics), 'Pipeline metrics object present');
  assert(pipeRes.body.metrics?.totalPipelineValue > 0, `Total Pipeline Value: $${pipeRes.body.metrics?.totalPipelineValue?.toLocaleString()}`);
  assert(pipeRes.body.metrics?.weightedPipelineValue > 0, `Weighted Pipeline Value: $${pipeRes.body.metrics?.weightedPipelineValue?.toLocaleString()}`);
  assert(pipeRes.body.metrics?.wonRevenue > 0, `Won Revenue: $${pipeRes.body.metrics?.wonRevenue?.toLocaleString()}`);
  assert(pipeRes.body.metrics?.winRate !== undefined, `Win Rate: ${pipeRes.body.metrics?.winRate}%`);

  // Verify Kanban Stages Columns Structure
  const stages = ['qualification', 'proposal', 'negotiation', 'closing', 'won', 'lost'];
  for (const st of stages) {
    const col = pipeRes.body.columns?.[st];
    assert(Boolean(col), `Kanban column exists for stage: ${st}`);
    assert(col?.count >= 0, `Column ${st} has valid deal count: ${col?.count}`);
    assert(col?.totalAmount >= 0, `Column ${st} has calculated total amount: $${col?.totalAmount?.toLocaleString()}`);
  }

  // ── 2. Deals Listing & Filtering ────────────────────────────
  console.log('\n--- 2. Deals Query, Search & Filters ---');
  const listRes = await makeRequest('GET', '/api/deals?page=1&limit=20', null, { Cookie: ownerCookie });
  assert(listRes.status === 200, 'GET /api/deals returns 200');
  assert(Array.isArray(listRes.body.items), 'Deals items array returned');
  assert(listRes.body.pagination?.total >= 8, `Total seeded deals: ${listRes.body.pagination?.total}`);

  // Search filter
  const searchRes = await makeRequest('GET', '/api/deals?search=Stripe', null, { Cookie: ownerCookie });
  assert(searchRes.status === 200, 'Search /api/deals?search=Stripe returns 200');
  assert(searchRes.body.items.some(d => d.name.includes('Stripe')), 'Search matches Stripe expansion deal');

  // Stage filter
  const stageFilterRes = await makeRequest('GET', '/api/deals?stage=negotiation', null, { Cookie: ownerCookie });
  assert(stageFilterRes.status === 200, 'Filter /api/deals?stage=negotiation returns 200');
  assert(stageFilterRes.body.items.every(d => d.stage === 'negotiation'), 'All filtered deals in negotiation stage');

  // ── 3. Create Deal with Validation ──────────────────────────
  console.log('\n--- 3. Create Deal & Default Stage Calculations ---');
  const newDealPayload = {
    name: 'CyberShield — Zero Trust Platform Deal',
    amount: 185000,
    companyName: 'CyberShield Systems Inc.',
    contactName: 'James Holden',
    stage: 'qualification',
    priority: 'Critical',
    notes: 'Inbound prospect interested in Q4 deployment.',
  };
  const createRes = await makeRequest('POST', '/api/deals', newDealPayload, { Cookie: ownerCookie });
  assert(createRes.status === 201, `Create deal returns 201 Created (Got ${createRes.status})`);
  const createdDealId = createRes.body.deal?.id;
  assert(Boolean(createdDealId), `Deal created with ID: ${createdDealId}`);
  assert(createRes.body.deal?.probability === 20, 'Default probability for qualification stage set to 20%');
  assert(createRes.body.deal?.weightedAmount === 37000, 'Weighted amount calculated (185000 * 0.20 = 37000)');

  // ── 4. Drag & Drop Stage Transitions & History Audit ────────
  console.log('\n--- 4. Persistent Drag-and-Drop Stage Transitions & History Audit ---');
  
  // Transition 1: Move from qualification to proposal
  const dndRes1 = await makeRequest(
    'PATCH',
    `/api/deals/${createdDealId}/stage`,
    { stage: 'proposal', note: 'Dragged to Proposal column after scoping demo' },
    { Cookie: ownerCookie }
  );
  assert(dndRes1.status === 200, `DnD to Proposal returns 200 OK (Got ${dndRes1.status})`);
  assert(dndRes1.body.deal?.stage === 'proposal', 'Deal stage updated to proposal');
  assert(dndRes1.body.deal?.probability === 40, 'Probability auto-adjusted to 40%');
  assert(dndRes1.body.deal?.stageHistory?.length === 1, 'Stage history contains 1 transition event');
  assert(dndRes1.body.deal?.stageHistory[0]?.fromStage === 'qualification', 'History fromStage is qualification');
  assert(dndRes1.body.deal?.stageHistory[0]?.toStage === 'proposal', 'History toStage is proposal');

  // Transition 2: Move from proposal to negotiation
  const dndRes2 = await makeRequest(
    'PATCH',
    `/api/deals/${createdDealId}/stage`,
    { stage: 'negotiation', note: 'Commercial pricing review' },
    { Cookie: ownerCookie }
  );
  assert(dndRes2.status === 200, 'DnD to Negotiation returns 200');
  assert(dndRes2.body.deal?.stage === 'negotiation', 'Deal stage updated to negotiation');
  assert(dndRes2.body.deal?.probability === 70, 'Probability auto-adjusted to 70%');
  assert(dndRes2.body.deal?.stageHistory?.length === 2, 'Stage history now has 2 audit entries');

  // Transition 3: Move from negotiation to won
  const dndRes3 = await makeRequest(
    'PATCH',
    `/api/deals/${createdDealId}/stage`,
    { stage: 'won', note: 'Contract executed by CEO' },
    { Cookie: ownerCookie }
  );
  assert(dndRes3.status === 200, 'DnD to Won returns 200');
  assert(dndRes3.body.deal?.stage === 'won', 'Deal stage updated to won');
  assert(dndRes3.body.deal?.probability === 100, 'Probability set to 100%');
  assert(Boolean(dndRes3.body.deal?.actualCloseDate), 'actualCloseDate populated upon winning deal');

  // Invalid stage transition rejection
  const invalidDndRes = await makeRequest(
    'PATCH',
    `/api/deals/${createdDealId}/stage`,
    { stage: 'non_existent_stage' },
    { Cookie: ownerCookie }
  );
  assert(invalidDndRes.status === 400, `Invalid stage transition rejected with 400 (Got ${invalidDndRes.status})`);

  // ── 5. Ownership & Authorization Controls ────────────────────
  console.log('\n--- 5. Deal Ownership & RBAC Authorization Controls ---');

  // Sales Rep queries deals: must only see own assigned deals (view:own)
  const repDealsRes = await makeRequest('GET', '/api/deals', null, { Cookie: repCookie });
  assert(repDealsRes.status === 200, 'Sales Rep GET /api/deals returns 200');
  assert(repDealsRes.body.items.every(d => d.ownerId === 'user-003'), 'Sales Rep query filtered strictly to owned deals');

  // Sales Rep attempts to move deal owned by someone else (deal-001 owned by Alexandra Reid)
  const unauthorizedMoveRes = await makeRequest(
    'PATCH',
    `/api/deals/deal-001/stage`,
    { stage: 'closing' },
    { Cookie: repCookie }
  );
  assert(
    unauthorizedMoveRes.status === 403,
    `Sales Rep forbidden from moving unowned deal with 403 (Got ${unauthorizedMoveRes.status})`
  );

  // Sales Rep moves own deal (deal-003 owned by Priya Sharma) -> Allowed!
  const repOwnMoveRes = await makeRequest(
    'PATCH',
    `/api/deals/deal-003/stage`,
    { stage: 'negotiation', note: 'Moving own deal to negotiation' },
    { Cookie: repCookie }
  );
  assert(
    repOwnMoveRes.status === 200,
    `Sales Rep permitted to move own deal with 200 OK (Got ${repOwnMoveRes.status})`
  );
  assert(repOwnMoveRes.body.deal?.stage === 'negotiation', 'Own deal moved to negotiation');

  // Workspace Owner can move any deal in the organization
  const ownerMoveRes = await makeRequest(
    'PATCH',
    `/api/deals/deal-003/stage`,
    { stage: 'closing', note: 'Owner executive acceleration' },
    { Cookie: ownerCookie }
  );
  assert(ownerMoveRes.status === 200, 'Owner permitted to move any deal (200 OK)');

  // ── 6. Non-Regression Verification ───────────────────────────
  console.log('\n--- 6. Preserved Phase 1, 2 & 3 Functionality Non-Regression ---');
  const leadsRes = await makeRequest('GET', '/api/leads?limit=5', null, { Cookie: ownerCookie });
  assert(leadsRes.status === 200, 'Leads API non-regression verified (Got 200)');

  const contactsRes = await makeRequest('GET', '/api/contacts?limit=5', null, { Cookie: ownerCookie });
  assert(contactsRes.status === 200, 'Contacts API non-regression verified (Got 200)');

  const companiesRes = await makeRequest('GET', '/api/companies?limit=5', null, { Cookie: ownerCookie });
  assert(companiesRes.status === 200, 'Companies API non-regression verified (Got 200)');

  const dashRes = await makeRequest('GET', '/api/dashboard/stats', null, { Cookie: ownerCookie });
  assert(dashRes.status === 200, 'Dashboard stats non-regression verified (Got 200)');

  console.log('\n================================================================');
  console.log(`📊 Deals Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
