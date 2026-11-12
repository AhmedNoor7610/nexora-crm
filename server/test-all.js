// ============================================================
// Nexora CRM — Master Automated Test Suite Runner
// Executes all 6 test suites sequentially and verifies 100% pass rate
// ============================================================

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Audit & Security Hardening', file: 'test-audit-security.js' },
  { name: 'Authentication & Multi-Tenant RBAC', file: 'test-auth.js' },
  { name: 'CRM Modules (Leads, Contacts, Companies)', file: 'test-crm-modules.js' },
  { name: 'Deals Pipeline & Kanban Valuation', file: 'test-deals.js' },
  { name: 'Activities, Tasks, Timeline & Socket.IO Notifications', file: 'test-activities-notifications.js' },
  { name: 'Team Management, Analytics, Reports & CSV Exports', file: 'test-team-reports.js' },
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    console.log(`\n============================================================`);
    console.log(`▶ Running Suite: ${suite.name} (${suite.file})`);
    console.log(`============================================================`);

    const child = spawn(process.execPath, [path.join(__dirname, suite.file)], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({ name: suite.name, file: suite.file, code });
    });
  });
}

async function runAll() {
  console.log('\n🚀 Starting Nexora CRM Master Test Runner...');
  const startTime = Date.now();
  const results = [];

  for (const suite of suites) {
    const res = await runSuite(suite);
    results.push(res);
    if (res.code !== 0) {
      console.error(`\n❌ Suite FAILED: ${suite.name}`);
      process.exit(1);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n============================================================');
  console.log(`🎉 ALL ${results.length} TEST SUITES PASSED CLEANLY! (${durationSec}s)`);
  console.log('============================================================');
  results.forEach((r, idx) => {
    console.log(`  ✅ [${idx + 1}/${results.length}] ${r.name}: PASSED`);
  });
  console.log('\n');
}

runAll().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});

