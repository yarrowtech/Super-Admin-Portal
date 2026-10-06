'use strict';
// Finance Control Tower (§3) and the two ledger-driven reports the brief adds to §E:
// project P&L / contribution margin, and a cash flow statement.
//
// Both reports read posted journal lines, never the source documents, so they agree with
// the trial balance by construction. That is the whole point of a ledger being the single
// source of truth: a report that re-derives totals from invoices can drift from it.
const S = require('../../services/finance/operations.service');
const T = require('../../services/finance/controlTower.service');
const { scopeFor } = require('../../services/finance/departmentAccess');
const Journal = require('../../models/finance/JournalEntry');
const Project = require('../../models/common/Project');

const { handler, fail, date } = S;

const r2 = n => Math.round((n || 0) * 100) / 100;

// A finance employee sees their own department; the head sees everything.
// scopeFor returns null (all), an id (scoped), or undefined (role owns no department).
const towerScope = async req => {
  const scope = await scopeFor(req.user);
  if (scope === null) return null;
  if (scope === undefined) fail(403, 'Your role is not assigned to a department with finance visibility');
  return scope;
};

const getControlTower = handler(async req => T.overview(req, await towerScope(req)));
const getControlTowerCard = handler(async req => T.drilldown(req, req.params.card, await towerScope(req)));
const getSummaryPack = handler(async req => T.summaryPack(req, await towerScope(req)));

// ── Shared ledger match ─────────────────────────────────────────────────────
// Every filter §E requires, applied to posted lines.
const ledgerMatch = q => {
  const match = { status: 'posted' };
  if (q.from || q.to) {
    match.entryDate = {};
    if (q.from) match.entryDate.$gte = date(q.from, 'From date');
    if (q.to) { const end = date(q.to, 'To date'); end.setUTCHours(23, 59, 59, 999); match.entryDate.$lte = end; }
  }
  return match;
};

// Dimension filters are applied after $unwind, because a line may carry its own dimension
// that differs from the entry's (a shared cost split across projects).
const lineMatch = q => {
  const out = {};
  if (q.departmentId) out['dim.departmentId'] = S.id(q.departmentId);
  if (q.projectId) out['dim.projectId'] = S.id(q.projectId);
  if (q.costCenterId) out['dim.costCenterId'] = S.id(q.costCenterId);
  return out;
};

// ── Project P&L / contribution margin (§E) ──────────────────────────────────
// Revenue less the direct costs booked to the same project. Contribution margin is what
// the project leaves behind before unallocated overhead, which is the figure a delivery
// decision actually turns on.
async function projectPnl(req) {
  const q = req.query || {};
  const rows = await Journal.aggregate([
    { $match: ledgerMatch(q) },
    { $unwind: '$lines' },
    // Each line's effective dimensions: its own, falling back to the entry's.
    { $addFields: {
      dim: {
        departmentId: { $ifNull: ['$lines.departmentId', '$departmentId'] },
        projectId: { $ifNull: ['$lines.projectId', null] },
        costCenterId: { $ifNull: ['$lines.costCenterId', '$costCenterId'] },
      },
    } },
    { $match: lineMatch(q) },
    { $lookup: { from: 'financeaccounts', localField: 'lines.account', foreignField: '_id', as: 'acct' } },
    { $unwind: '$acct' },
    { $match: { 'acct.type': { $in: ['revenue', 'expense'] } } },
    { $group: {
      _id: { project: '$dim.projectId', type: '$acct.type' },
      debit: { $sum: '$lines.debit' },
      credit: { $sum: '$lines.credit' },
    } },
  ]);

  const projects = await Project.find({}, 'name projectCode').lean();
  const nameOf = new Map(projects.map(p => [String(p._id), p.name || p.projectCode]));
  const byProject = new Map();
  for (const row of rows) {
    const key = row._id.project ? String(row._id.project) : 'overhead';
    const entry = byProject.get(key) || {
      projectId: row._id.project || null,
      project: row._id.project ? (nameOf.get(key) || 'Unknown project') : 'Unallocated overhead',
      revenue: 0,
      directCost: 0,
    };
    // Revenue carries a credit balance; expense a debit balance.
    if (row._id.type === 'revenue') entry.revenue += row.credit - row.debit;
    else entry.directCost += row.debit - row.credit;
    byProject.set(key, entry);
  }

  const items = [...byProject.values()].map(p => {
    const contribution = p.revenue - p.directCost;
    return {
      ...p,
      revenue: r2(p.revenue),
      directCost: r2(p.directCost),
      contribution: r2(contribution),
      // Null rather than 0 when there is no revenue: a 0% margin and "not measurable"
      // are different facts, and showing 0% for an internal project is misleading.
      marginPct: p.revenue > 0 ? r2((contribution / p.revenue) * 100) : null,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totals = items.reduce((acc, p) => ({
    revenue: acc.revenue + p.revenue,
    directCost: acc.directCost + p.directCost,
    contribution: acc.contribution + p.contribution,
  }), { revenue: 0, directCost: 0, contribution: 0 });

  return {
    basis: 'Accrual: posted journal lines, grouped by the project dimension on each line.',
    projects: items,
    totals: {
      revenue: r2(totals.revenue),
      directCost: r2(totals.directCost),
      contribution: r2(totals.contribution),
      marginPct: totals.revenue > 0 ? r2((totals.contribution / totals.revenue) * 100) : null,
    },
  };
}

// ── Cash flow statement (§E) ────────────────────────────────────────────────
// Built from movements on the cash and bank account (1000). Every posted entry that touches
// cash is classified by the *other* side of the entry, which is what makes a receipt from a
// customer "operating" and a loan drawdown "financing".
const CLASSIFY = {
  // account type -> activity. Revenue/expense movements are operating; asset purchases are
  // investing; equity and long-term liabilities are financing.
  revenue: 'operating',
  expense: 'operating',
  asset: 'investing',
  liability: 'financing',
  equity: 'financing',
};

async function cashFlow(req) {
  const q = req.query || {};
  const CASH = '1000';
  const cashAccount = await require('../../models/finance/Account').findOne({ code: CASH }, '_id').lean();
  if (!cashAccount) {
    return { basis: 'No cash account (1000) exists yet; nothing has been posted to cash.', activities: [], totals: { opening: 0, inflow: 0, outflow: 0, net: 0 } };
  }

  // Entries that touch cash, with the cash movement and the contra lines side by side.
  const entries = await Journal.aggregate([
    { $match: { ...ledgerMatch(q), 'lines.account': cashAccount._id } },
    { $project: {
      entryDate: 1, memo: 1, departmentId: 1, costCenterId: 1,
      cash: { $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', cashAccount._id] } } },
      contra: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.account', cashAccount._id] } } },
    } },
  ]);

  const Account = require('../../models/finance/Account');
  const accounts = await Account.find({}, 'code name type').lean();
  const typeOf = new Map(accounts.map(a => [String(a._id), a.type]));

  const buckets = { operating: { inflow: 0, outflow: 0 }, investing: { inflow: 0, outflow: 0 }, financing: { inflow: 0, outflow: 0 } };
  for (const e of entries) {
    const inflow = (e.cash || []).reduce((n, l) => n + (l.debit || 0), 0);
    const outflow = (e.cash || []).reduce((n, l) => n + (l.credit || 0), 0);
    const net = inflow - outflow;
    if (!net) continue;
    // Classify by the largest contra line — the dominant reason cash moved.
    const contra = (e.contra || []).slice().sort((a, b) =>
      ((b.debit || 0) + (b.credit || 0)) - ((a.debit || 0) + (a.credit || 0)))[0];
    const activity = CLASSIFY[typeOf.get(String(contra?.account))] || 'operating';
    if (net > 0) buckets[activity].inflow += net; else buckets[activity].outflow += -net;
  }

  const activities = Object.entries(buckets).map(([activity, v]) => ({
    activity,
    inflow: r2(v.inflow),
    outflow: r2(v.outflow),
    net: r2(v.inflow - v.outflow),
  }));
  const totals = activities.reduce((acc, a) => ({
    inflow: acc.inflow + a.inflow, outflow: acc.outflow + a.outflow, net: acc.net + a.net,
  }), { inflow: 0, outflow: 0, net: 0 });

  return {
    basis: 'Cash basis: posted movements on account 1000, classified by the contra account on each entry.',
    activities,
    totals: { inflow: r2(totals.inflow), outflow: r2(totals.outflow), net: r2(totals.net) },
  };
}

module.exports = {
  getControlTower, getControlTowerCard, getSummaryPack,
  getProjectPnl: handler(projectPnl),
  getCashFlow: handler(cashFlow),
};
