'use strict';
const mongoose = require('mongoose');
const S = require('./operations.service');
const { money, fail, transaction, audit, actor, head, id, text, date, positive, journal, openPeriod } = S;
const Expense = require('../../models/finance/Expense');
const Budget = require('../../models/finance/Budget');
const Payment = require('../../models/finance/Payment');
const User = require('../../models/auth/User');
const Department = require('../../models/department/Department');
const { getReceiptThreshold, getBudgetAlertLevels } = require('../../config/financeThresholds');
const { assertDepartmentAccess } = require('./departmentAccess');
const notify = require('./notify.service');
// Snapshot reads tolerate legacy float/negative amounts; writes below stay strict.
const sum = (rows, field) => rows.reduce((n, row) => n + BigInt(S.amountOf(row[field])), 0n);
const signed = n => n < 0n ? -money.decimal(-n) : money.decimal(n);
const SPENT_STATUSES = ['approved', 'processing', 'completed', 'paid'];
const isFixed = e => String(e.costType || 'variable') === 'fixed';
// Months of a fiscal year that have begun, 1–12. A budget's progress is judged against the
// plan for the periods that have actually started, not against the whole year.
function elapsedPeriods(fiscalYear, now = new Date()) {
  const year = Number.parseInt(String(fiscalYear).slice(0, 4), 10);
  if (!Number.isFinite(year)) return 12;
  const current = now.getUTCFullYear();
  if (current > year) return 12;
  if (current < year) return 0;
  return now.getUTCMonth() + 1;
}
// Plan to date from the phasing profile; with no profile the annual plan is spread evenly,
// which is the assumption a reader makes anyway when no profile was entered.
function planToDate(b, elapsed) {
  const rows = Array.isArray(b.phasing) ? b.phasing : [];
  if (rows.length) {
    let fixed = 0n; let variable = 0n;
    for (const row of rows) {
      if (Number(row.period) > elapsed) continue;
      fixed += BigInt(S.amountOf(row.fixed || 0));
      variable += BigInt(S.amountOf(row.variable || 0));
    }
    return { fixed, variable, phased: true };
  }
  const share = (total) => BigInt(S.amountOf(total || 0)) * BigInt(Math.max(0, Math.min(elapsed, 12))) / 12n;
  return { fixed: share(b.allocatedFixed), variable: share(b.allocatedVariable), phased: false };
}
async function budgetSnapshot(b, session) {
  const expenses = await Expense.find({ budgetId: b._id, status: { $nin: ['draft', 'rejected', 'cancelled'] } }).session(session).lean();
  const settled = expenses.filter(e => SPENT_STATUSES.includes(e.status));
  const open = expenses.filter(e => !SPENT_STATUSES.includes(e.status));
  const spent = sum(settled, 'amount');
  const reserved = sum(open, 'amount');
  const allocated = BigInt(S.amountOf(b.allocated));
  const utilization = allocated ? Number((spent + reserved) * 10000n / allocated) / 100 : 0;
  // Fixed/variable breakdown of what has been committed, against how the allocation was
  // planned. Variance is planned minus committed, so a negative figure is an overrun on
  // that side of the budget even when the budget as a whole still looks healthy.
  const fixedSpent = sum(settled.filter(isFixed), 'amount');
  const fixedReserved = sum(open.filter(isFixed), 'amount');
  const variableSpent = sum(settled.filter(e => !isFixed(e)), 'amount');
  const variableReserved = sum(open.filter(e => !isFixed(e)), 'amount');
  const planFixed = BigInt(S.amountOf(b.allocatedFixed || 0));
  const planVariable = BigInt(S.amountOf(b.allocatedVariable || 0));
  const costBreakdown = {
    fixed: {
      allocated: money.decimal(planFixed),
      spent: money.decimal(fixedSpent),
      reserved: money.decimal(fixedReserved),
      committed: money.decimal(fixedSpent + fixedReserved),
      variance: signed(planFixed - fixedSpent - fixedReserved),
      utilization: planFixed ? Number((fixedSpent + fixedReserved) * 10000n / planFixed) / 100 : 0,
    },
    variable: {
      allocated: money.decimal(planVariable),
      spent: money.decimal(variableSpent),
      reserved: money.decimal(variableReserved),
      committed: money.decimal(variableSpent + variableReserved),
      variance: signed(planVariable - variableSpent - variableReserved),
      utilization: planVariable ? Number((variableSpent + variableReserved) * 10000n / planVariable) / 100 : 0,
    },
  };
  // ── Plan to date ──────────────────────────────────────────────────────────
  // Timing variance: committed so far against what the plan expected by now. This is what
  // separates "spending too fast" from "spending as planned", which the annual total hides.
  const elapsed = elapsedPeriods(b.fiscalYear);
  const ptd = planToDate(b, elapsed);
  const committedFixed = fixedSpent + fixedReserved;
  const committedVariable = variableSpent + variableReserved;
  const plannedToDate = ptd.fixed + ptd.variable;
  const committed = spent + reserved;
  const toDate = {
    periodsElapsed: elapsed,
    phased: ptd.phased,
    planned: money.decimal(plannedToDate),
    committed: money.decimal(committed),
    // Negative means ahead of plan (overspending for this point in the year).
    variance: signed(plannedToDate - committed),
    variancePct: plannedToDate ? Number((plannedToDate - committed) * 10000n / plannedToDate) / 100 : 0,
    fixed: { planned: money.decimal(ptd.fixed), committed: money.decimal(committedFixed), variance: signed(ptd.fixed - committedFixed) },
    variable: { planned: money.decimal(ptd.variable), committed: money.decimal(committedVariable), variance: signed(ptd.variable - committedVariable) },
  };

  // ── Forecast ──────────────────────────────────────────────────────────────
  // Year-end outturn projected from the run rate so far. Fixed costs are assumed to continue
  // at their current monthly rate; the projection is only meaningful once a month has closed,
  // so before that the forecast is simply the plan.
  const runRate = elapsed > 0 ? committed / BigInt(elapsed) : 0n;
  const projected = elapsed > 0 ? runRate * 12n : allocated;
  const forecast = {
    runRate: money.decimal(runRate),
    projected: money.decimal(projected),
    // Negative means the year is projected to end over budget.
    variance: signed(allocated - projected),
    // Months the current run rate can continue before the allocation is exhausted.
    monthsOfCover: runRate > 0n ? Math.round(Number((allocated - committed) * 100n / runRate)) / 100 : null,
    confidence: elapsed === 0 ? 'none' : elapsed < 3 ? 'low' : elapsed < 6 ? 'medium' : 'high',
  };

  // ── Baseline drift ────────────────────────────────────────────────────────
  // How far the live allocation has moved from the plan that was approved.
  const baseAllocated = BigInt(S.amountOf(b.baseline?.allocated || 0));
  const baselineView = baseAllocated > 0n ? {
    allocated: money.decimal(baseAllocated),
    drift: signed(allocated - baseAllocated),
    driftPct: Number((allocated - baseAllocated) * 10000n / baseAllocated) / 100,
    revision: b.revision || 0,
    approvedAt: b.baseline?.approvedAt || null,
    approvedByName: b.baseline?.approvedByName || '',
  } : null;

  // Tolerance lets a budget absorb a controlled overrun before it counts as breached.
  const tolerance = allocated * BigInt(Math.round(Number(b.tolerancePct || 0) * 100)) / 10000n;
  const ceiling = allocated + tolerance;
  const control = {
    mode: b.control || 'hard',
    tolerancePct: Number(b.tolerancePct || 0),
    ceiling: money.decimal(ceiling),
    headroom: signed(ceiling - committed),
    breached: committed > ceiling,
  };

  return {
    ...b.toObject(),
    spent: money.decimal(spent),
    reserved: money.decimal(reserved),
    available: signed(allocated - spent - reserved),
    utilization,
    costBreakdown,
    toDate,
    forecast,
    baselineView,
    control,
    status: utilization > 100 ? 'over' : utilization >= (b.alertThreshold || 85) ? 'at-risk' : 'on-track',
  };
}
async function refreshBudget(budgetId, session) {
  if (!budgetId) return;
  // A write on the budget serializes concurrent reservations and approvals.
  const budget = await Budget.findByIdAndUpdate(budgetId, { $inc: { __v: 1 } }, { new: true, session });
  if (!budget) fail(422, 'Budget not found');
  const snapshot = await budgetSnapshot(budget, session);
  // Hard control refuses the operation; soft control lets it through and records the breach,
  // for budgets where blocking the work would cost more than the overrun. Tolerance is
  // already folded into `control.headroom`, so a budget with headroom is never refused.
  if (snapshot.control.headroom < 0) {
    if (snapshot.control.mode === 'hard') {
      const err = new Error(snapshot.control.tolerancePct
        ? `Operation would exceed the available budget plus its ${snapshot.control.tolerancePct}% tolerance`
        : 'Operation would exceed available budget');
      err.statusCode = 409;
      err.details = { allocated: budget.allocated, committed: snapshot.toDate.committed, ceiling: snapshot.control.ceiling, headroom: snapshot.control.headroom };
      throw err;
    }
    if (!budget.breachedAt) budget.breachedAt = new Date();
  } else if (budget.breachedAt) {
    budget.breachedAt = null; // Recovered, so a later breach is reported as new.
  }
  Object.assign(budget, S.pick(snapshot, ['spent', 'reserved', 'available', 'utilization']));
  // Raise an alert the first time utilization crosses each level; `alertedAt` records
  // the highest level already announced so one crossing does not notify repeatedly.
  const crossed = getBudgetAlertLevels().filter(level => snapshot.utilization >= level);
  const highest = crossed.length ? Math.max(...crossed) : 0;
  if (highest > (budget.alertedAt || 0)) {
    budget.alertedAt = highest;
    snapshot.alert = {
      level: highest,
      utilization: snapshot.utilization,
      message: highest >= 100
        ? `${budget.department} has used its entire ${budget.fiscalYear} budget (${snapshot.utilization.toFixed(1)}%).`
        : `${budget.department} has reached ${snapshot.utilization.toFixed(1)}% of its ${budget.fiscalYear} budget.`,
    };
  } else if (highest < (budget.alertedAt || 0)) {
    budget.alertedAt = highest; // Utilization fell back (reversal or increased allocation).
  }
  await budget.save({ session }); return snapshot;
}
async function selectBudget(body, departmentId, session) {
  if (body.budgetId) {
    const b = await Budget.findById(id(body.budgetId)).session(session);
    if (!b || String(b.departmentId) !== String(departmentId) || b.status === 'closed') fail(422, 'Budget must be open and belong to the department');
    // A cost booked to a project must be charged to that project's budget, not to the
    // department's running budget, or project profitability silently loses the spend.
    if (body.projectId && b.scope === 'project' && String(b.projectId) !== String(body.projectId)) fail(422, 'Budget belongs to a different project');
    return b._id;
  }
  const year = String(body.fiscalYear || new Date(body.incurredDate || body.periodStart || Date.now()).getUTCFullYear());
  // With a project on the cost, its project budget is preferred; departmental budgets are
  // the fallback so costs that are not project work keep working exactly as before.
  if (body.projectId) {
    const projectBudgets = await Budget.find({ scope: 'project', projectId: id(body.projectId), fiscalYear: year, status: { $nin: ['closed', 'draft'] } }).session(session);
    if (projectBudgets.length > 1) fail(422, 'Choose a specific budget for this project and period');
    if (projectBudgets.length === 1) return projectBudgets[0]._id;
  }
  const budgets = await Budget.find({ departmentId, fiscalYear: year, scope: { $ne: 'project' }, status: { $nin: ['closed', 'draft'] } }).session(session);
  if (budgets.length > 1) fail(422, 'Choose a specific budget for this department and period');
  return budgets[0]?._id || null;
}
// Unset means variable: the safer default, since an unclassified cost that is really fixed
// shows up as an unexplained variable overrun rather than quietly inflating fixed headroom.
function costType(value) {
  if (value === undefined || value === null || value === '') return 'variable';
  const v = String(value).toLowerCase();
  if (!['fixed', 'variable'].includes(v)) fail(422, 'Cost type must be fixed or variable');
  return v;
}
function documents(body) {
  if (!Array.isArray(body || []) || (body || []).length > 10) fail(422, 'At most ten documents are allowed');
  return (body || []).map(d => {
    const url = text(d.url, 1500);
    if (!/^https:\/\//i.test(url) && !/^\/api\/dept\/finance\/attachments\/[a-f\d]{24}$/i.test(url)) fail(422, 'Use a secure attachment URL');
    return { label: text(d.label, 120), url };
  });
}
async function createExpense(req) {
  return transaction(async session => {
    const b = req.body || {}; const amount = positive(b.amount);
    const department = await Department.findOne({ _id: id(b.departmentId), isActive: true }).session(session);
    if (!department || !text(b.title)) fail(422, 'Title and active department are required');
    // Claims at or above the configured limit need proof at submission, not at review.
    const threshold = getReceiptThreshold();
    if (amount >= threshold * 100 && !(b.documents || []).length) {
      fail(422, `A supporting document is required for claims of ₹${threshold.toLocaleString('en-IN')} or more`);
    }
    await openPeriod(b.financialPeriodId, session);
    const budgetId = await selectBudget(b, department._id, session);
    const [e] = await Expense.create([{ title: text(b.title, 200), category: text(b.category, 100), amount: money.decimal(amount), costType: costType(b.costType), departmentId: department._id, department: department.name, projectId: b.projectId ? id(b.projectId) : null, budgetId, financialPeriodId: b.financialPeriodId || null, vendor: b.vendor || null, costCenterId: b.costCenterId || null, incurredDate: b.incurredDate ? date(b.incurredDate) : new Date(), documents: documents(b.documents), notes: text(b.notes), submittedBy: actor(req), status: 'submitted', budgetReservedAt: new Date(), statusHistory: [{ from: '', to: 'submitted', action: 'submit', actor: actor(req), actorRole: req.user.role }] }], { session });
    await refreshBudget(budgetId, session); await audit(req, 'expense_submitted', e, null, e.toObject(), session); return e;
  });
}
async function updateExpense(req) {
  return transaction(async session => {
    const e = await Expense.findById(id(req.params.id)).session(session);
    if (!e) fail(404, 'Expense not found');
    if (!['draft', 'submitted', 'needs_information'].includes(e.status)) fail(409, 'Reviewed expenses are immutable');
    if (Object.keys(req.body).some(k => !['title', 'category', 'amount', 'notes', 'documents', 'incurredDate', 'costType'].includes(k))) fail(422, 'Use lifecycle actions to change financial assignments or status');
    await openPeriod(e.financialPeriodId, session);
    const before = e.toObject(); Object.assign(e, S.pick(req.body, ['title', 'category', 'notes']));
    if (req.body.costType !== undefined) e.costType = costType(req.body.costType);
    if (req.body.amount !== undefined) e.amount = money.decimal(positive(req.body.amount));
    if (req.body.documents) e.documents = documents(req.body.documents);
    if (req.body.incurredDate) e.incurredDate = date(req.body.incurredDate);
    // Re-check after the edit: raising the amount or removing the receipt must not
    // sneak a claim past the threshold.
    const threshold = getReceiptThreshold();
    if (money.minor(e.amount) >= threshold * 100 && !e.documents.length) {
      fail(422, `A supporting document is required for claims of ₹${threshold.toLocaleString('en-IN')} or more`);
    }
    await e.save({ session }); await refreshBudget(e.budgetId, session); await audit(req, 'expense_updated', e, before, e.toObject(), session); return e;
  });
}
const transitions = {
  review: [['submitted', 'pending'], 'under_review'], request_information: [['submitted', 'under_review', 'verified', 'pending_approval'], 'needs_information'],
  verify: [['submitted', 'pending', 'under_review', 'needs_information'], 'verified'], send_for_approval: [['verified'], 'pending_approval'],
  approve: [['verified', 'pending_approval'], 'approved'], reject: [['submitted', 'under_review', 'needs_information', 'verified', 'pending_approval'], 'rejected'],
  process: [['approved'], 'processing'], complete: [['processing'], 'completed'], cancel: [['draft', 'submitted', 'under_review', 'needs_information'], 'cancelled'],
};
async function expenseAction(req) {
  const result = await expenseActionTxn(req);
  // The submitter hears what happened to their claim, and the head hears when a budget
  // crosses an alert level. Both are after-commit, so neither can undo the decision.
  await notify.expenseDecided({
    expense: result.request,
    action: req.params.action,
    actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
    comment: text(req.body?.comment || req.body?.reason),
  });
  if (result.budgetAlert) {
    const budget = await Budget.findById(result.request.budgetId).lean();
    if (budget) await notify.budgetAlert({ budget, alert: result.budgetAlert });
  }
  return result;
}
async function expenseActionTxn(req) {
  return transaction(async session => {
    const e = await Expense.findById(id(req.params.id)).session(session); if (!e) fail(404, 'Expense not found');
    const action = req.params.action; const rule = transitions[action]; const comment = text(req.body.comment || req.body.reason);
    if (!rule || !rule[0].includes(e.status)) fail(409, 'Invalid expense transition');
    // Departmental silo: a department head may review and approve their own department's
    // claims; paying one out stays with Finance, which controls the bank.
    const FINANCE_ONLY = ['complete', 'process'];
    if (FINANCE_ONLY.includes(action) && !head(req.user)) fail(403, 'Finance Head permission required to release payment');
    if (['approve', 'reject', 'cancel'].includes(action) && !head(req.user)) {
      await assertDepartmentAccess(req.user, e.departmentId, session);
    }
    if (action === 'approve' && String(e.submittedBy) === String(actor(req))) fail(403, 'A different reviewer must approve this expense');
    if (['reject', 'request_information'].includes(action) && !comment) fail(422, 'Decision reason is required');
    if (action === 'verify' && !e.documents.length) fail(422, 'Attach supporting documents before verification');
    await openPeriod(e.financialPeriodId, session);
    const before = e.toObject(); const amount = money.minor(e.amount);
    e.statusHistory.push({ from: e.status, to: rule[1], action, comment, actor: actor(req), actorRole: req.user.role }); e.status = rule[1];
    if (action === 'verify') e.verifiedBy = actor(req);
    if (action === 'request_information') e.requestedInfo = comment;
    if (action === 'approve') { e.approvedBy = actor(req); const j = await journal(req, `expense-${e._id}`, [['5000', amount, 0], ['2100', 0, amount]], session, e.incurredDate, e.title, e); e.journalEntryId = j._id; }
    if (action === 'complete') {
      const [p] = await Payment.create([{ amount: e.amount, amountMinor: amount, direction: 'out', status: 'completed', method: 'bank', reference: `EXPENSE-${e._id}`, customerName: e.title, requestId: e._id, vendor: e.vendor, departmentId: e.departmentId, paymentDate: new Date(), createdBy: actor(req) }], { session });
      await journal(req, `expense-paid-${e._id}`, [['2100', amount, 0], ['1000', 0, amount]], session, p.paymentDate, e.title, e);
      e.paymentId = p._id; e.budgetConsumedAt = new Date(); e.processedBy = actor(req);
    }
    await e.save({ session });
    const snapshot = await refreshBudget(e.budgetId, session);
    await audit(req, `expense_${action}`, e, before, e.toObject(), session);
    return { request: e, workflow: null, budgetAlert: snapshot?.alert || null };
  });
}
module.exports = { createExpense, updateExpense, expenseAction, budgetSnapshot, refreshBudget, signed, elapsedPeriods, planToDate };
