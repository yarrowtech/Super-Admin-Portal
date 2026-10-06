'use strict';
// The Finance Control Tower (§3): five traffic-light cards over the data the portal
// already holds, each with the exact filter that reproduces the rows it counted.
//
// Two rules shape this file.
//   1. Cards are computed with allSettled, so one slow or broken aggregation degrades to
//      a grey card instead of blanking the dashboard.
//   2. A card's count and its drill-down must come from the same filter. If they are
//      derived separately they will eventually disagree, and a number nobody can reproduce
//      is worse than no number.
const Invoice = require('../../models/finance/Invoice');
const Budget = require('../../models/finance/Budget');
const Dispute = require('../../models/finance/Dispute');
const NonCompliance = require('../../models/finance/NonCompliance');
const Justification = require('../../models/finance/Justification');
const W = require('./workflows.service');
const settings = require('./settings.service');

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE_DISPUTE = ['open', 'under_review'];

// Each card owns its filter and its grading, so the drill-down below can re-run exactly
// the query the card counted.
const CARDS = {
  budget_health: {
    label: 'Budget health',
    model: Budget,
    dateField: 'createdAt',
    // budgetSnapshot() operates on a document, not a plain object.
    hydrate: true,
    async filter() { return { status: { $nin: ['closed', 'draft'] } }; },
    // Budget state is not recomputed here: budgetSnapshot() is the one implementation of
    // utilisation, and a second one would eventually disagree with it.
    async grade(rows, cfg) {
      let amber = 0; let red = 0;
      for (const b of rows) {
        const snap = await W.budgetSnapshot(b, null);
        const util = Number(snap.utilization) || 0;
        if (b.breachedAt || util >= 100) red += 1;
        else if (util >= (b.alertThreshold || cfg['tower.budgetAmberPct'])) amber += 1;
      }
      return {
        status: red ? 'red' : amber ? 'amber' : 'green',
        headline: red ? `${red} budget${red > 1 ? 's' : ''} over allocation`
          : amber ? `${amber} budget${amber > 1 ? 's' : ''} near the limit`
            : 'All budgets within allocation',
        metrics: { total: rows.length, amber, red },
      };
    },
  },

  payment_delays: {
    label: 'Payment delays',
    model: Invoice,
    dateField: 'dueDate',
    async filter() {
      return { status: { $nin: ['draft', 'void', 'paid'] }, balanceDue: { $gt: 0 }, dueDate: { $lt: new Date() } };
    },
    async grade(rows, cfg) {
      const now = Date.now();
      const veryLate = rows.filter(r => r.dueDate && now - new Date(r.dueDate).getTime() > 90 * DAY).length;
      const n = rows.length;
      const status = (n >= cfg['tower.overdueRedCount'] || veryLate) ? 'red' : n >= cfg['tower.overdueAmberCount'] ? 'amber' : 'green';
      return {
        status,
        headline: n ? `${n} invoice${n > 1 ? 's' : ''} past due${veryLate ? `, ${veryLate} over 90 days` : ''}` : 'No overdue invoices',
        metrics: { total: n, over90: veryLate },
      };
    },
  },

  open_disputes: {
    label: 'Open disputes',
    model: Dispute,
    dateField: 'createdAt',
    async filter() { return { status: { $in: ACTIVE_DISPUTE } }; },
    async grade(rows, cfg) {
      const now = Date.now();
      const stale = rows.filter(r => now - new Date(r.createdAt).getTime() > cfg['tower.disputeRedAgeDays'] * DAY).length;
      const n = rows.length;
      return {
        status: stale ? 'red' : n ? 'amber' : 'green',
        headline: n ? `${n} open dispute${n > 1 ? 's' : ''}${stale ? `, ${stale} unresolved over ${cfg['tower.disputeRedAgeDays']} days` : ''}` : 'No open disputes',
        metrics: { total: n, stale },
      };
    },
  },

  non_compliance: {
    label: 'Non-compliance',
    model: NonCompliance,
    dateField: 'createdAt',
    async filter() { return { status: { $in: ['open', 'acknowledged'] } }; },
    async grade(rows) {
      const critical = rows.filter(r => r.severity === 'critical').length;
      const elevated = rows.filter(r => ['medium', 'high'].includes(r.severity)).length;
      const n = rows.length;
      return {
        status: critical ? 'red' : elevated ? 'amber' : n ? 'amber' : 'green',
        headline: n ? `${n} open item${n > 1 ? 's' : ''}${critical ? `, ${critical} critical` : ''}` : 'No open non-compliance',
        metrics: { total: n, critical, elevated },
      };
    },
  },

  overdue_invoices: {
    label: 'Ageing receivables',
    model: Invoice,
    dateField: 'dueDate',
    async filter() {
      // The 61+ day buckets only — the portion of ageing that needs intervention.
      const cutoff = new Date(Date.now() - 60 * DAY);
      return { status: { $nin: ['draft', 'void', 'paid'] }, balanceDue: { $gt: 0 }, dueDate: { $lt: cutoff } };
    },
    async grade(rows) {
      const now = Date.now();
      const b90 = rows.filter(r => now - new Date(r.dueDate).getTime() > 90 * DAY).length;
      const b61 = rows.length - b90;
      return {
        status: b90 ? 'red' : b61 ? 'amber' : 'green',
        headline: rows.length ? `${b61} at 61-90 days, ${b90} over 90` : 'Nothing beyond 60 days',
        metrics: { total: rows.length, bucket61to90: b61, bucket90plus: b90 },
      };
    },
  },
};

const KEYS = Object.keys(CARDS);

// A finance employee's tower is scoped to their own department; the head sees everything.
const scopeFilter = (user, scopeDeptId) => (scopeDeptId ? { departmentId: scopeDeptId } : {});

async function buildCard(key, cfg, scope) {
  const card = CARDS[key];
  const filter = { ...(await card.filter()), ...scope };
  // budget_health grades through budgetSnapshot(), which needs real Mongoose documents
  // (it calls .toObject()); every other card only reads fields, so .lean() is cheaper.
  const query = card.model.find(filter);
  const rows = await (card.hydrate ? query : query.lean());
  const graded = await card.grade(rows, cfg);
  return {
    key,
    label: card.label,
    ...graded,
    drilldown: { path: `/control-tower/${key}`, filter },
  };
}

// Five independent aggregations. A thrown card becomes grey with its reason attached,
// which is more useful to an operator than an empty dashboard.
async function overview(req, scopeDeptId) {
  const cfg = await settings.all();
  const scope = scopeFilter(req.user, scopeDeptId);
  const results = await Promise.allSettled(KEYS.map(k => buildCard(k, cfg, scope)));
  const cards = results.map((r, i) => (r.status === 'fulfilled' ? r.value : {
    key: KEYS[i],
    label: CARDS[KEYS[i]].label,
    status: 'unknown',
    headline: 'Could not be calculated',
    metrics: {},
    error: r.reason?.message || 'Unavailable',
    drilldown: { path: `/control-tower/${KEYS[i]}`, filter: {} },
  }));
  const pendingJustifications = await Justification.countDocuments({ outcome: 'pending' });
  return { cards, pendingJustifications, thresholds: cfg, generatedAt: new Date().toISOString() };
}

// The drill-down re-runs the card's own filter, so the list always matches the count.
async function drilldown(req, key, scopeDeptId) {
  const card = CARDS[key];
  if (!card) { throw Object.assign(new Error('Unknown control tower card'), { statusCode: 404 }); }
  const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit, 10) || 25));
  const filter = { ...(await card.filter()), ...scopeFilter(req.user, scopeDeptId) };
  const [items, total] = await Promise.all([
    card.model.find(filter).sort({ [card.dateField]: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    card.model.countDocuments(filter),
  ]);
  return {
    card: key,
    label: card.label,
    filter,
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// A narrative pack for CEO / Manager review: the same card figures, plus the open
// justification threads that explain them, in a shape that exports cleanly.
async function summaryPack(req, scopeDeptId) {
  const { cards, generatedAt } = await overview(req, scopeDeptId);
  const attention = cards.filter(c => ['red', 'amber'].includes(c.status));
  const justifications = await Justification.find({ outcome: { $in: ['pending', 'escalated'] } })
    .sort({ createdAt: -1 }).limit(50).lean();
  const narrative = attention.length
    ? attention.map(c => `${c.label}: ${c.headline}.`).join(' ')
    : 'All finance control indicators are green for this period.';
  return {
    generatedAt,
    narrative,
    cards,
    requiresAttention: attention.map(c => ({ key: c.key, label: c.label, status: c.status, headline: c.headline })),
    openJustifications: justifications.map(j => ({
      id: j._id, subjectType: j.subjectType, subjectId: j.subjectId,
      question: j.question, outcome: j.outcome, responses: j.responses?.length || 0,
    })),
    attachmentManifest: justifications.flatMap(j => (j.responses || []).flatMap(r => (r.documents || []).map(d => ({
      justification: j._id, label: d.label, url: d.url, sha256: d.sha256,
    })))),
  };
}

module.exports = { overview, drilldown, summaryPack, KEYS, CARDS };
