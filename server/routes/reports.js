// ── Nexora CRM — Reports & CSV Export Routes ─────────────────
import { Router } from 'express';
import { authMiddleware, requireOrgScope } from '../middleware/auth.js';
import { listUsersByOrg } from '../db/store.js';
import { crmStore } from '../db/crmStore.js';

const router = Router();
router.use(authMiddleware, requireOrgScope);

// ── Helper: group won deals by month ─────────────────────────
function groupDealsByMonth(deals) {
  const monthMap = {};
  for (const d of deals) {
    const dateStr = d.actualCloseDate || d.updatedAt || d.createdAt;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, count: 0 };
    monthMap[key].revenue += d.amount || 0;
    monthMap[key].count += 1;
  }
  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
}

// ── Helper: RFC 4180 CSV serializer ──────────────────────────
function toCSV(rows, columns) {
  const escapeCell = val => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const header = columns.map(c => escapeCell(c.label)).join(',');
  const dataRows = rows.map(row => columns.map(c => escapeCell(row[c.key])).join(','));
  return [header, ...dataRows].join('\r\n');
}

function sendCSV(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// ── GET /api/reports/revenue ──────────────────────────────────
router.get('/revenue', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const { period = '12' } = req.query;
    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const wonDeals = (allDeals.items || []).filter(d => d.stage === 'won');
    const months = groupDealsByMonth(wonDeals);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - parseInt(period, 10));
    const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
    const filtered = months.filter(m => m.month >= cutoffKey);

    const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0);
    const totalDeals = filtered.reduce((s, m) => s + m.count, 0);

    res.json({
      success: true,
      revenue: filtered,
      totalRevenue,
      totalDeals,
      period: parseInt(period, 10),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/pipeline-summary ────────────────────────
router.get('/pipeline-summary', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const dealItems = allDeals.items || [];

    const stageOrder = ['qualification', 'proposal', 'negotiation', 'closing', 'won', 'lost'];
    const summary = stageOrder.map(stage => {
      const stageDeals = dealItems.filter(d => d.stage === stage);
      return {
        stage,
        label: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + (d.amount || 0), 0),
        avgProbability: stageDeals.length > 0
          ? Math.round(stageDeals.reduce((s, d) => s + (d.probability || 0), 0) / stageDeals.length)
          : 0,
      };
    });

    const activeDeals = dealItems.filter(d => !['won', 'lost'].includes(d.stage));
    const totalPipelineValue = activeDeals.reduce((s, d) => s + (d.amount || 0), 0);

    res.json({
      success: true,
      stages: summary,
      totalPipelineValue,
      totalDeals: dealItems.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/team-performance ────────────────────────
router.get('/team-performance', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const allUsers = listUsersByOrg(orgId);
    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const dealItems = allDeals.items || [];
    const allActivities = await crmStore.getActivities({ orgId, limit: 1000 });
    const actItems = allActivities.items || [];

    const performance = allUsers.map(u => {
      const myDeals = dealItems.filter(d => d.ownerId === u.id);
      const wonDeals = myDeals.filter(d => d.stage === 'won');
      const lostDeals = myDeals.filter(d => d.stage === 'lost');
      const myActs = actItems.filter(a => a.assignedTo === u.id);
      const doneActs = myActs.filter(a => a.status === 'completed');
      const pipelineValue = myDeals
        .filter(d => !['won', 'lost'].includes(d.stage))
        .reduce((s, d) => s + (d.amount || 0), 0);
      const wonValue = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);
      const winRate = myDeals.length > 0 ? Math.round((wonDeals.length / myDeals.length) * 100) : 0;

      return {
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        role: u.role,
        roleTitle: u.roleTitle,
        department: u.department || '',
        isActive: u.isActive,
        dealsTotal: myDeals.length,
        dealsWon: wonDeals.length,
        dealsLost: lostDeals.length,
        revenueWon: wonValue,
        pipelineValue,
        activitiesTotal: myActs.length,
        activitiesDone: doneActs.length,
        winRate,
      };
    }).sort((a, b) => b.revenueWon - a.revenueWon);

    res.json({ success: true, performance });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/activity-summary ────────────────────────
router.get('/activity-summary', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const { from, to } = req.query;
    const allActivities = await crmStore.getActivities({ orgId, limit: 1000 });
    let acts = allActivities.items || [];

    if (from) acts = acts.filter(a => a.createdAt >= from);
    if (to)   acts = acts.filter(a => a.createdAt <= to);

    const byType = {};
    const byStatus = {};
    for (const a of acts) {
      byType[a.type]     = (byType[a.type] || 0) + 1;
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }

    res.json({
      success: true,
      total: acts.length,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/sales-targets ────────────────────────────
// Target vs Actual Revenue Analytics & Attainment Tracking
router.get('/sales-targets', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const { targetMonthly = 150000, targetQuarterly = 450000 } = req.query;

    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const wonDeals = (allDeals.items || []).filter(d => d.stage === 'won');

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    // Monthly actual
    const currentMonthDeals = wonDeals.filter(d => {
      const date = new Date(d.actualCloseDate || d.updatedAt || d.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === currentMonthKey;
    });

    const monthActual = currentMonthDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const mTarget = Number(targetMonthly);
    const monthAttainment = mTarget > 0 ? Math.round((monthActual / mTarget) * 100) : 0;
    const monthVariance = monthActual - mTarget;

    // Quarterly actual
    const quarterDeals = wonDeals.filter(d => {
      const date = new Date(d.actualCloseDate || d.updatedAt || d.createdAt);
      const q = Math.floor(date.getMonth() / 3) + 1;
      return date.getFullYear() === now.getFullYear() && q === currentQuarter;
    });

    const quarterActual = quarterDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const qTarget = Number(targetQuarterly);
    const quarterAttainment = qTarget > 0 ? Math.round((quarterActual / qTarget) * 100) : 0;
    const quarterVariance = quarterActual - qTarget;

    // Rep target breakdown
    const allUsers = listUsersByOrg(orgId).filter(u => u.role === 'rep' || u.role === 'manager');
    const perRepTarget = allUsers.length > 0 ? Math.round(mTarget / allUsers.length) : mTarget;

    const repAttainment = allUsers.map(u => {
      const repWon = currentMonthDeals
        .filter(d => d.ownerId === u.id)
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const attainment = perRepTarget > 0 ? Math.round((repWon / perRepTarget) * 100) : 0;
      return {
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        target: perRepTarget,
        actual: repWon,
        variance: repWon - perRepTarget,
        attainment,
      };
    }).sort((a, b) => b.actual - a.actual);

    res.json({
      success: true,
      currentMonth: {
        key: currentMonthKey,
        target: mTarget,
        actual: monthActual,
        attainment: monthAttainment,
        variance: monthVariance,
        dealsCount: currentMonthDeals.length,
      },
      currentQuarter: {
        quarter: currentQuarter,
        year: now.getFullYear(),
        target: qTarget,
        actual: quarterActual,
        attainment: quarterAttainment,
        variance: quarterVariance,
        dealsCount: quarterDeals.length,
      },
      reps: repAttainment,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/yoy-comparison ───────────────────────────
// Year-over-Year & Trailing Multi-Period Trajectory
router.get('/yoy-comparison', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const wonDeals = (allDeals.items || []).filter(d => d.stage === 'won');

    const now = new Date();
    const currentYear = now.getFullYear();
    const priorYear = currentYear - 1;

    const currentYearDeals = wonDeals.filter(d => {
      const date = new Date(d.actualCloseDate || d.updatedAt || d.createdAt);
      return date.getFullYear() === currentYear;
    });

    const priorYearDeals = wonDeals.filter(d => {
      const date = new Date(d.actualCloseDate || d.updatedAt || d.createdAt);
      return date.getFullYear() === priorYear;
    });

    const currentRevenue = currentYearDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const priorRevenue = priorYearDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const yoyGrowthRate = priorRevenue > 0
      ? Math.round(((currentRevenue - priorRevenue) / priorRevenue) * 100)
      : currentRevenue > 0 ? 100 : 0;

    // Monthly breakdown for current year
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const monthStr = String(m + 1).padStart(2, '0');
      const cRev = currentYearDeals
        .filter(d => {
          const date = new Date(d.actualCloseDate || d.updatedAt || d.createdAt);
          return date.getMonth() === m;
        })
        .reduce((sum, d) => sum + (d.amount || 0), 0);

      const pRev = priorYearDeals
        .filter(d => {
          const date = new Date(d.actualCloseDate || d.updatedAt || d.createdAt);
          return date.getMonth() === m;
        })
        .reduce((sum, d) => sum + (d.amount || 0), 0);

      monthlyData.push({
        monthIndex: m + 1,
        monthName: new Date(2026, m, 1).toLocaleString('default', { month: 'short' }),
        currentYearRevenue: cRev,
        priorYearRevenue: pRev,
        growth: pRev > 0 ? Math.round(((cRev - pRev) / pRev) * 100) : cRev > 0 ? 100 : 0,
      });
    }

    res.json({
      success: true,
      currentYear,
      priorYear,
      currentRevenue,
      priorRevenue,
      yoyGrowthRate,
      monthlyComparison: monthlyData,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/lead-sources ─────────────────────────────
// Lead Source Attribution, Volume, Conversion & Pipeline Value
router.get('/lead-sources', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const leadsRes = await crmStore.getLeads({ orgId, limit: 5000 });
    const allLeads = leadsRes.items || [];

    const dealsRes = await crmStore.getDeals({ orgId, limit: 5000 });
    const allDeals = dealsRes.items || [];

    const sourceMap = {};
    for (const lead of allLeads) {
      const src = lead.source || 'Direct Outreach';
      if (!sourceMap[src]) {
        sourceMap[src] = {
          source: src,
          totalLeads: 0,
          convertedLeads: 0,
          totalLeadValue: 0,
          wonDeals: 0,
          wonRevenue: 0,
        };
      }
      sourceMap[src].totalLeads += 1;
      sourceMap[src].totalLeadValue += (lead.value || 0);
      if (lead.status === 'Converted' || lead.isConverted) {
        sourceMap[src].convertedLeads += 1;
      }
    }

    // Match deals by company or lead link
    for (const deal of allDeals) {
      const matchingLead = allLeads.find(l => l.company && l.company.toLowerCase() === (deal.companyName || '').toLowerCase());
      const src = matchingLead?.source || 'Direct Outreach';
      if (!sourceMap[src]) {
        sourceMap[src] = {
          source: src,
          totalLeads: 0,
          convertedLeads: 0,
          totalLeadValue: 0,
          wonDeals: 0,
          wonRevenue: 0,
        };
      }
      if (deal.stage === 'won') {
        sourceMap[src].wonDeals += 1;
        sourceMap[src].wonRevenue += (deal.amount || 0);
      }
    }

    const sources = Object.values(sourceMap).map(s => ({
      ...s,
      conversionRate: s.totalLeads > 0 ? Math.round((s.convertedLeads / s.totalLeads) * 100) : 0,
    })).sort((a, b) => b.wonRevenue - a.wonRevenue || b.totalLeads - a.totalLeads);

    res.json({
      success: true,
      totalLeads: allLeads.length,
      sources,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/lost-deals ───────────────────────────────
// Lost Opportunity Root-Cause Analysis & Value Leakage
router.get('/lost-deals', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const dealsRes = await crmStore.getDeals({ orgId, limit: 5000 });
    const lostDeals = (dealsRes.items || []).filter(d => d.stage === 'lost');

    const reasonMap = {
      'Pricing': { reason: 'Pricing / Budget', count: 0, value: 0 },
      'Competitor': { reason: 'Competitor Chosen', count: 0, value: 0 },
      'Feature Gap': { reason: 'Product / Feature Gap', count: 0, value: 0 },
      'Timing': { reason: 'Project Postponed / Timing', count: 0, value: 0 },
      'Budget Cancelled': { reason: 'Budget Revoked', count: 0, value: 0 },
      'Other': { reason: 'Other / Unspecified', count: 0, value: 0 },
    };

    for (const d of lostDeals) {
      const rawReason = d.lostReason || '';
      let matchedKey = 'Other';
      if (/price|cost|budget|expensive/i.test(rawReason)) matchedKey = 'Pricing';
      else if (/competitor|rival|alternative/i.test(rawReason)) matchedKey = 'Competitor';
      else if (/feature|missing|functionality/i.test(rawReason)) matchedKey = 'Feature Gap';
      else if (/timing|later|quarter|next year/i.test(rawReason)) matchedKey = 'Timing';
      else if (/cancel|freeze/i.test(rawReason)) matchedKey = 'Budget Cancelled';

      reasonMap[matchedKey].count += 1;
      reasonMap[matchedKey].value += (d.amount || 0);
    }

    const totalLostValue = lostDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const avgLostDealSize = lostDeals.length > 0 ? Math.round(totalLostValue / lostDeals.length) : 0;

    res.json({
      success: true,
      totalLostDeals: lostDeals.length,
      totalLostValue,
      avgLostDealSize,
      reasons: Object.values(reasonMap).filter(r => r.count > 0 || lostDeals.length === 0),
      deals: lostDeals.slice(0, 20).map(d => ({
        id: d.id,
        title: d.title,
        companyName: d.companyName,
        amount: d.amount,
        ownerName: d.ownerName,
        lostReason: d.lostReason || 'Unspecified',
        updatedAt: d.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/rep-activities ───────────────────────────
// Rep Velocity, Communications & Task Output Breakdown
router.get('/rep-activities', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const users = listUsersByOrg(orgId);
    const actRes = await crmStore.getActivities({ orgId, limit: 5000 });
    const activities = actRes.items || [];

    const repMetrics = users.map(u => {
      const myActs = activities.filter(a => a.assignedTo === u.id);
      const calls = myActs.filter(a => a.type === 'call').length;
      const meetings = myActs.filter(a => a.type === 'meeting').length;
      const emails = myActs.filter(a => a.type === 'email').length;
      const demos = myActs.filter(a => a.type === 'demo').length;
      const tasksCompleted = myActs.filter(a => a.status === 'completed').length;
      const tasksPending = myActs.filter(a => a.status === 'pending').length;

      return {
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        role: u.roleTitle || u.role,
        department: u.department,
        totalActivities: myActs.length,
        calls,
        meetings,
        emails,
        demos,
        tasksCompleted,
        tasksPending,
        completionRate: myActs.length > 0 ? Math.round((tasksCompleted / myActs.length) * 100) : 0,
      };
    }).sort((a, b) => b.totalActivities - a.totalActivities);

    res.json({
      success: true,
      totalActivities: activities.length,
      repMetrics,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/export/pdf ───────────────────────────────
// Executive Print-Ready HTML/PDF Formatted Report
router.get('/export/pdf', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const allDeals = await crmStore.getDeals({ orgId, limit: 1000 });
    const wonDeals = (allDeals.items || []).filter(d => d.stage === 'won');
    const totalWon = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const activeDeals = (allDeals.items || []).filter(d => !['won', 'lost'].includes(d.stage));
    const totalPipeline = activeDeals.reduce((s, d) => s + (d.amount || 0), 0);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Nexora CRM — Executive Performance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; margin: 0; background: #fff; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0284c7; border-radius: 999px; font-weight: 600; font-size: 12px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #f8fafc; }
    .kpi-title { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .kpi-val { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; color: #94a3b8; font-size: 12px; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">⚡ Nexora CRM — Executive Sales Report</h1>
      <div class="subtitle">Generated on ${new Date().toLocaleDateString()} | Organization ID: ${orgId}</div>
    </div>
    <span class="badge">Official Executive Audit</span>
  </div>

  <div class="kpis">
    <div class="kpi-card">
      <div class="kpi-title">Closed Revenue</div>
      <div class="kpi-val">$${totalWon.toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Active Pipeline</div>
      <div class="kpi-val">$${totalPipeline.toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Won Deals</div>
      <div class="kpi-val">${wonDeals.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Active Opportunities</div>
      <div class="kpi-val">${activeDeals.length}</div>
    </div>
  </div>

  <h3 style="margin-top:30px;font-size:16px;">Top Closed Deals</h3>
  <table>
    <thead>
      <tr>
        <th>Deal Title</th>
        <th>Company</th>
        <th>Amount</th>
        <th>Owner</th>
        <th>Close Date</th>
      </tr>
    </thead>
    <tbody>
      ${wonDeals.slice(0, 10).map(d => `
        <tr>
          <td><strong>${d.title}</strong></td>
          <td>${d.companyName || '—'}</td>
          <td><strong>$${(d.amount || 0).toLocaleString()}</strong></td>
          <td>${d.ownerName || '—'}</td>
          <td>${d.actualCloseDate ? new Date(d.actualCloseDate).toLocaleDateString() : '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Nexora CRM Enterprise Engine • Confidential • Printed & Verified
  </div>
  <script>
    if (window.location.search.includes('print=true')) {
      window.print();
    }
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="nexora-executive-report.html"');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/export/leads ────────────────────────────
router.get('/export/leads', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const data = await crmStore.getLeads({ orgId, limit: 10000 });
    const rows = data.items || [];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'source', label: 'Source' },
      { key: 'value', label: 'Value' },
      { key: 'score', label: 'Score' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'createdAt', label: 'Created At' },
    ];
    sendCSV(res, 'nexora-leads.csv', toCSV(rows, cols));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/export/contacts ─────────────────────────
router.get('/export/contacts', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const data = await crmStore.getContacts({ orgId, limit: 10000 });
    const rows = data.items || [];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'title', label: 'Title' },
      { key: 'company', label: 'Company' },
      { key: 'status', label: 'Status' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'createdAt', label: 'Created At' },
    ];
    sendCSV(res, 'nexora-contacts.csv', toCSV(rows, cols));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/export/deals ────────────────────────────
router.get('/export/deals', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const data = await crmStore.getDeals({ orgId, limit: 10000 });
    const rows = data.items || [];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Deal Name' },
      { key: 'amount', label: 'Amount' },
      { key: 'stage', label: 'Stage' },
      { key: 'probability', label: 'Probability %' },
      { key: 'companyName', label: 'Company' },
      { key: 'contactName', label: 'Contact' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'priority', label: 'Priority' },
      { key: 'expectedCloseDate', label: 'Expected Close' },
      { key: 'actualCloseDate', label: 'Actual Close' },
      { key: 'createdAt', label: 'Created At' },
    ];
    sendCSV(res, 'nexora-deals.csv', toCSV(rows, cols));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/export/activities ───────────────────────
router.get('/export/activities', async (req, res, next) => {
  try {
    const { orgId } = req.user;
    const data = await crmStore.getActivities({ orgId, limit: 10000 });
    const rows = data.items || [];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'type', label: 'Type' },
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assignedToName', label: 'Assigned To' },
      { key: 'entityType', label: 'Related To Type' },
      { key: 'entityName', label: 'Related To' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'completedAt', label: 'Completed At' },
      { key: 'outcome', label: 'Outcome' },
      { key: 'createdAt', label: 'Created At' },
    ];
    sendCSV(res, 'nexora-activities.csv', toCSV(rows, cols));
  } catch (err) {
    next(err);
  }
});

export default router;

