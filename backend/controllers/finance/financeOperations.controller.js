'use strict';
const mongoose = require('mongoose');
const S = require('../../services/finance/operations.service');
const W = require('../../services/finance/workflows.service');
const { handler, fail, id, head, actor, text, date, transaction, audit, money } = S;
const Invoice = require('../../models/finance/Invoice');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const Budget = require('../../models/finance/Budget');
const Journal = require('../../models/finance/JournalEntry');
const User = require('../../models/auth/User');
const Department = require('../../models/department/Department');
const Project = require('../../models/common/Project');
const { BankTransaction } = require('../../models/finance/FinanceOperations');
const notify = require('../../services/finance/notify.service');
const paging = q => { const page = Math.max(1, Number.parseInt(q.page, 10) || 1); const limit = Math.min(200, Math.max(1, Number.parseInt(q.limit, 10) || 50)); return { page, limit }; };
const list = (Model, dateField, extra = () => ({})) => async req => {
  const q = req.query || {}; let filter = extra(req); const { page, limit } = paging(q);
  if (q.status) filter.status = String(q.status);
  if (q.recordId) filter._id = id(q.recordId);
  if (q.invoiceId && Model === Payment) filter.$or = [{ invoice: id(q.invoiceId) }, { 'allocations.invoice': id(q.invoiceId) }];
  for (const key of ['departmentId', 'client', 'vendor', 'costCenterId']) if (q[key]) filter[key] = id(q[key]);
  if (q.from || q.to) { filter[dateField] = {}; if (q.from) filter[dateField].$gte = date(q.from); if (q.to) { const end = date(q.to); end.setUTCHours(23, 59, 59, 999); filter[dateField].$lte = end; } }
  if (q.search) { const search = text(q.search, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = ['invoiceNumber', 'clientName', 'customerName', 'title', 'reference', 'employeeName'].filter(k => Model.schema.path(k)).map(k => ({ [k]: new RegExp(search, 'i') })); }
  const sortKey = [dateField, 'createdAt', 'amount', 'total', 'status'].includes(q.sort) ? q.sort : dateField;
  let summary = {};
  if (Model === Invoice) {
    // Overdue is derived (open balance past due date), so status filters map onto stored fields.
    const today = new Date(new Date().toISOString().slice(0, 10));
    const open = { status: { $in: ['sent', 'partially_paid', 'overdue'] }, balanceDue: { $gt: 0 } };
    const stage = { overdue: { ...open, dueDate: { $lt: today } }, sent: { status: { $in: ['sent', 'overdue'] }, $or: [{ dueDate: null }, { dueDate: { $gte: today } }] }, partially_paid: { status: 'partially_paid', $or: [{ dueDate: null }, { dueDate: { $gte: today } }] } };
    const base = { ...filter }; delete base.status;
    // $and keeps a search $or and a stage $or from overwriting each other.
    const within = f => ({ $and: [base, f] });
    if (q.status) filter = within(stage[q.status] || { status: q.status });
    const count = f => Invoice.countDocuments(within(f));
    const [draft, sent, partially_paid, overdue, paid, all, money2] = await Promise.all([
      count({ status: 'draft' }), count(stage.sent), count(stage.partially_paid), count(stage.overdue), count({ status: 'paid' }), count({}),
      Invoice.aggregate([{ $match: within(open) }, { $group: { _id: null, receivable: { $sum: '$balanceDue' }, overdue: { $sum: { $cond: [{ $lt: ['$dueDate', today] }, '$balanceDue', 0] } } } }]),
    ]);
    const r2 = n => Math.round((n || 0) * 100) / 100;
    summary = { counts: { draft, sent, partially_paid, overdue, paid, all }, totals: { receivable: r2(money2[0]?.receivable), overdue: r2(money2[0]?.overdue) } };
  }
  const [items, total] = await Promise.all([Model.find(filter).sort({ [sortKey]: q.order === 'asc' ? 1 : -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Model.countDocuments(filter)]);
  return { items: Model === Invoice ? items.map(i => ({ ...i, status: S.invoiceStatus(i) })) : items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, ...summary };
};
const createInvoice = handler(S.createInvoice, 201);
const updateInvoice = handler(S.updateInvoice);
const createInvoiceNote = handler(S.note, 201);
const createPayment = handler(S.createPayment, 201);
const updatePayment = handler(S.updatePayment);
const createExpense = handler(W.createExpense, 201);
const updateExpense = handler(W.updateExpense);
const updateFinanceRequestAction = handler(W.expenseAction);
const getInvoices = handler(list(Invoice, 'issueDate'));
const getPayments = handler(list(Payment, 'paymentDate', req => ({ ...(req.query.direction === 'in' ? { direction: { $ne: 'out' } } : req.query.direction === 'out' ? { direction: 'out' } : {}), ...(req.projectId ? { projectId: req.projectId } : {}) })));
const getExpenses = handler(list(Expense, 'incurredDate'));
const deleteInvoice = handler(async req => transaction(async session => { const inv = await Invoice.findById(id(req.params.id)).session(session); if (!inv) fail(404, 'Invoice not found'); if (inv.status !== 'draft') fail(409, 'Only drafts can be removed'); await audit(req, 'invoice_draft_deleted', inv, inv.toObject(), null, session); await inv.deleteOne({ session }); return { deleted: true }; }));
const deleteExpense = handler(async req => transaction(async session => { const e = await Expense.findById(id(req.params.id)).session(session); if (!e) fail(404, 'Expense not found'); if (e.status !== 'draft') fail(409, 'Use a controlled cancellation for submitted expenses'); await audit(req, 'expense_draft_deleted', e, e.toObject(), null, session); await e.deleteOne({ session }); return { deleted: true }; }));
const getBudgets = handler(async req => {
  const q = req.query || {};
  const filter = {};
  // `scope` is how the Budgets page asks for the department view or the project view; without
  // it both come back, so existing callers keep seeing every budget.
  if (q.scope === 'project') filter.scope = 'project';
  else if (q.scope === 'department') filter.scope = { $ne: 'project' };
  if (q.departmentId) filter.departmentId = id(q.departmentId);
  if (q.projectId) filter.projectId = id(q.projectId);
  if (q.fiscalYear) filter.fiscalYear = text(q.fiscalYear, 20);
  const budgets = await Budget.find(filter).sort({ fiscalYear: -1 }).limit(200).populate('projectId', 'name code');
  const result = [];
  for (const b of budgets) result.push(await W.budgetSnapshot(b, null));
  return result;
});
// Minimal project list for the budget and expense pickers. Finance needs to name a project to
// budget against it; the portal's own role guard on this router is what limits who gets here.
const getProjectOptions = handler(async req => {
  const q = text((req.query || {}).search, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = q ? { $or: [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }] } : {};
  return Project.find(filter).select('name code status').sort({ name: 1 }).limit(500).lean();
});
// Budget-versus-actual rolled up by dimension, split fixed/variable. `groupBy=department`
// answers "which departments are overspending", `project` answers the same for delivery work.
const getBudgetVariance = handler(async req => {
  const q = req.query || {};
  const groupBy = q.groupBy === 'project' ? 'project' : 'department';
  const filter = groupBy === 'project' ? { scope: 'project' } : { scope: { $ne: 'project' } };
  if (q.fiscalYear) filter.fiscalYear = text(q.fiscalYear, 20);
  const budgets = await Budget.find(filter).sort({ fiscalYear: -1 }).limit(500).populate('projectId', 'name code');
  const groups = new Map();
  const zero = () => ({
    allocated: 0, spent: 0, reserved: 0, available: 0, baseline: 0, drift: 0,
    plannedToDate: 0, committedToDate: 0, timingVariance: 0, projected: 0, forecastVariance: 0, breached: 0,
    fixed: { allocated: 0, committed: 0, variance: 0 }, variable: { allocated: 0, committed: 0, variance: 0 },
  });
  for (const b of budgets) {
    const snap = await W.budgetSnapshot(b, null);
    const key = groupBy === 'project' ? String(b.projectId?._id || b.projectId || 'unassigned') : String(b.departmentId || 'unassigned');
    const label = groupBy === 'project' ? (b.projectId?.name || 'Unassigned project') : (b.department || 'Unassigned');
    if (!groups.has(key)) groups.set(key, { key, label, budgets: 0, ...zero() });
    const g = groups.get(key);
    g.budgets += 1;
    g.allocated += Number(snap.allocated || 0); g.spent += Number(snap.spent || 0);
    g.reserved += Number(snap.reserved || 0); g.available += Number(snap.available || 0);
    g.baseline += Number(snap.baselineView?.allocated || 0); g.drift += Number(snap.baselineView?.drift || 0);
    g.plannedToDate += Number(snap.toDate.planned || 0); g.committedToDate += Number(snap.toDate.committed || 0);
    g.timingVariance += Number(snap.toDate.variance || 0);
    g.projected += Number(snap.forecast.projected || 0); g.forecastVariance += Number(snap.forecast.variance || 0);
    if (snap.control.breached) g.breached += 1;
    for (const side of ['fixed', 'variable']) {
      g[side].allocated += Number(snap.costBreakdown[side].allocated || 0);
      g[side].committed += Number(snap.costBreakdown[side].committed || 0);
      g[side].variance += Number(snap.costBreakdown[side].variance || 0);
    }
  }
  const derive = g => ({
    ...g,
    utilization: g.allocated ? (g.spent + g.reserved) / g.allocated * 100 : 0,
    // Pace > 100 means committing faster than the plan expects by this point in the year.
    pace: g.plannedToDate ? (g.committedToDate / g.plannedToDate) * 100 : null,
  });
  // Worst pacing first when there is a plan to date, else worst utilization: the rows that
  // need action are the ones running ahead of plan, not simply the largest budgets.
  const rows = [...groups.values()].map(derive)
    .sort((a, b) => (b.pace ?? -1) - (a.pace ?? -1) || b.utilization - a.utilization);
  const totals = rows.reduce((t, r) => {
    t.allocated += r.allocated; t.spent += r.spent; t.reserved += r.reserved; t.available += r.available;
    t.baseline += r.baseline; t.drift += r.drift;
    t.plannedToDate += r.plannedToDate; t.committedToDate += r.committedToDate; t.timingVariance += r.timingVariance;
    t.projected += r.projected; t.forecastVariance += r.forecastVariance; t.breached += r.breached;
    for (const side of ['fixed', 'variable']) { t[side].allocated += r[side].allocated; t[side].committed += r[side].committed; t[side].variance += r[side].variance; }
    return t;
  }, zero());
  return { groupBy, periodsElapsed: W.elapsedPeriods(q.fiscalYear || String(new Date().getUTCFullYear())), rows, totals: derive(totals) };
});
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
// Spreads a total across 12 periods in minor units, giving the remainder to the first periods
// so the profile always adds back to the total exactly rather than losing paise to rounding.
const spread = (totalMinor) => {
  const total = BigInt(totalMinor);
  const base = total / 12n;
  const extra = Number(total - base * 12n);
  return Array.from({ length: 12 }, (_, i) => base + (i < extra ? 1n : 0n));
};
const evenPhasing = (budget) => {
  const f = spread(money.minor(budget.allocatedFixed || 0));
  const v = spread(money.minor(budget.allocatedVariable || 0));
  return {
    phasingMethod: 'even',
    phasing: MONTHS.map((label, i) => ({ period: i + 1, label, fixed: money.decimal(f[i]), variable: money.decimal(v[i]) })),
  };
};
// A manual profile must reconcile to the allocation, or the plan and its phasing would
// disagree and every to-date variance computed from it would be wrong.
const phasingFrom = (rows, budget) => {
  if (!Array.isArray(rows)) fail(422, 'Phasing must be a list of periods');
  if (!rows.length) return { phasing: [], phasingMethod: 'none' };
  if (rows.length > 12) fail(422, 'A phasing profile has at most twelve periods');
  const seen = new Set();
  let fixedTotal = 0n; let variableTotal = 0n;
  const phasing = rows.map(r => {
    const period = Number(r.period);
    if (!Number.isInteger(period) || period < 1 || period > 12) fail(422, 'Each phasing period must be 1 to 12');
    if (seen.has(period)) fail(422, `Period ${period} appears twice in the phasing profile`);
    seen.add(period);
    const fixed = BigInt(money.minor(r.fixed ?? 0));
    const variable = BigInt(money.minor(r.variable ?? 0));
    if (fixed < 0n || variable < 0n) fail(422, 'Phasing amounts cannot be negative');
    fixedTotal += fixed; variableTotal += variable;
    return { period, label: text(r.label, 20) || MONTHS[period - 1], fixed: money.decimal(fixed), variable: money.decimal(variable) };
  }).sort((a, b) => a.period - b.period);
  if (fixedTotal !== BigInt(money.minor(budget.allocatedFixed || 0))) fail(422, 'Phased fixed amounts must add up to the fixed allocation');
  if (variableTotal !== BigInt(money.minor(budget.allocatedVariable || 0))) fail(422, 'Phased variable amounts must add up to the variable allocation');
  return { phasing, phasingMethod: 'manual' };
};
const saveBudget = update => handler(req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required'); const b = req.body;
  let budget = update ? await Budget.findById(id(req.params.id)).session(session) : new Budget();
  if (!budget) fail(404, 'Budget not found'); const before = update ? budget.toObject() : null;
  if (!update) {
    const department = await Department.findById(id(b.departmentId)).session(session); if (!department) fail(422, 'Department not found');
    budget.departmentId = department._id; budget.department = department.name; budget.fiscalYear = text(b.fiscalYear, 20); budget.createdBy = actor(req); budget.costCenterId = b.costCenterId || null; budget.financialPeriodId = b.financialPeriodId || null;
    // Scope is fixed at creation: moving a budget between department and project scope after
    // costs are booked against it would re-point spend that has already been reported.
    const scope = ['department', 'project'].includes(b.scope) ? b.scope : 'department';
    if (scope === 'project') {
      if (!b.projectId) fail(422, 'A project is required for a project budget');
      if (!await Project.exists({ _id: id(b.projectId) }).session(session)) fail(422, 'Project not found');
      budget.projectId = id(b.projectId);
    }
    budget.scope = scope;
  }
  await S.openPeriod(budget.financialPeriodId, session);
  // The fixed/variable split is the plan behind the total, so the two must reconcile to it.
  // Sending only a total keeps the whole allocation variable, which is the safer default.
  const splitSent = b.allocatedFixed !== undefined || b.allocatedVariable !== undefined;
  if (b.allocated !== undefined) budget.allocated = money.decimal(S.positive(b.allocated));
  if (splitSent) {
    const fixed = BigInt(money.minor(b.allocatedFixed ?? 0));
    const variable = BigInt(money.minor(b.allocatedVariable ?? 0));
    if (fixed < 0n || variable < 0n) fail(422, 'Fixed and variable allocations cannot be negative');
    if (fixed + variable !== BigInt(money.minor(budget.allocated))) fail(422, 'Fixed and variable allocations must add up to the total allocation');
    budget.allocatedFixed = money.decimal(fixed); budget.allocatedVariable = money.decimal(variable);
  } else if (b.allocated !== undefined) {
    budget.allocatedFixed = 0; budget.allocatedVariable = budget.allocated;
  }
  if (b.alertThreshold !== undefined) { if (!Number.isInteger(Number(b.alertThreshold)) || Number(b.alertThreshold) < 1 || Number(b.alertThreshold) > 100) fail(422, 'Alert threshold must be 1 to 100'); budget.alertThreshold = Number(b.alertThreshold); }
  if (b.notes !== undefined) budget.notes = text(b.notes);
  // Cost control policy. Soft control is a deliberate choice to let work continue and report
  // the breach, so it is recorded on the budget rather than inferred at spend time.
  if (b.control !== undefined) { if (!['hard', 'soft'].includes(b.control)) fail(422, 'Control must be hard or soft'); budget.control = b.control; }
  if (b.tolerancePct !== undefined) {
    const t = Number(b.tolerancePct);
    if (!Number.isFinite(t) || t < 0 || t > 50) fail(422, 'Tolerance must be between 0 and 50 percent');
    budget.tolerancePct = Math.round(t * 100) / 100;
  }
  // Phasing: either an explicit per-period profile, or an even spread derived from the totals.
  if (b.phasing !== undefined) budget.set(phasingFrom(b.phasing, budget));
  else if (b.phasingMethod === 'even') budget.set(evenPhasing(budget));
  else if (b.phasingMethod === 'none') { budget.phasing = []; budget.phasingMethod = 'none'; }
  // A re-spread keeps an even profile aligned after the allocation changes; a hand-built
  // profile is never silently rewritten, because that would discard deliberate planning.
  else if (budget.phasingMethod === 'even' && (b.allocated !== undefined || splitSent)) budget.set(evenPhasing(budget));
  const clash = budget.scope === 'project'
    ? { scope: 'project', projectId: budget.projectId, fiscalYear: budget.fiscalYear, financialPeriodId: budget.financialPeriodId || null }
    : { scope: { $ne: 'project' }, departmentId: budget.departmentId, fiscalYear: budget.fiscalYear, costCenterId: budget.costCenterId || null, financialPeriodId: budget.financialPeriodId || null };
  if (await Budget.exists({ _id: { $ne: budget._id }, ...clash }).session(session)) fail(409, budget.scope === 'project' ? 'Budget already exists for this project and period' : 'Budget already exists for this department, cost center and period');
  await budget.save({ session }); const snapshot = await W.refreshBudget(budget._id, session); await audit(req, 'budget_saved', budget, before, snapshot, session); return snapshot;
}), update ? 200 : 201);
// Adds to or removes from a budget's allocation, always with a reason. Reducing below
// what is already committed is refused, because that would make the budget retrospectively
// overspent without anyone having spent anything new.
const adjustBudget = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const budget = await Budget.findById(id(req.params.id)).session(session);
  if (!budget) fail(404, 'Budget not found');
  const reason = text(req.body.reason, 500);
  if (!reason) fail(422, 'A reason for the adjustment is required');
  const raw = String(req.body.delta ?? '').trim();
  const negative = raw.startsWith('-');
  const magnitude = money.minor(negative ? raw.slice(1) : raw, 'Adjustment');
  if (!magnitude) fail(422, 'Adjustment must be a non-zero amount');
  const delta = negative ? -magnitude : magnitude;
  const before = budget.toObject();
  const allocatedAfter = BigInt(money.minor(budget.allocated)) + BigInt(delta);
  if (allocatedAfter <= 0n) fail(422, 'Allocation must stay above zero');
  await S.openPeriod(budget.financialPeriodId, session);
  // The adjustment names which side of the budget it changes, so the fixed/variable plan keeps
  // adding up to the total. Unspecified, it lands on the variable side, matching the default
  // used when a budget is created from a total alone.
  const isFixedSide = String(req.body.costType || 'variable').toLowerCase() === 'fixed';
  const target = isFixedSide ? 'allocatedFixed' : 'allocatedVariable';
  const sideAfter = BigInt(money.minor(budget[target] || 0)) + BigInt(delta);
  if (sideAfter < 0n) fail(422, `Adjustment would take the ${isFixedSide ? 'fixed' : 'variable'} allocation below zero`);
  budget[target] = money.decimal(sideAfter);
  budget.allocated = money.decimal(allocatedAfter);
  // Once a baseline exists, every allocation change is a numbered revision against it, so the
  // drift from the approved plan stays visible however many adjustments accumulate.
  if (budget.baseline?.approvedAt) budget.revision = (budget.revision || 0) + 1;
  budget.adjustments.push({
    delta: money.decimal(BigInt(Math.abs(delta))) * (negative ? -1 : 1),
    allocatedAfter: budget.allocated,
    reason,
    actor: actor(req),
    actorName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
  });
  // An even profile follows the new total; a manual one is left alone, so a hand-built plan is
  // never rewritten by an adjustment, but it is flagged as out of date for the head to re-phase.
  if (budget.phasingMethod === 'even') budget.set(evenPhasing(budget));
  // Reducing the allocation must not drop it below money already committed.
  budget.alertedAt = 0;
  await budget.save({ session });
  const snapshot = await W.refreshBudget(budget._id, session);
  await audit(req, 'budget_adjusted', budget, before, { delta, allocated: budget.allocated, reason, revision: budget.revision }, session);
  return snapshot;
}));

// Locks the current allocation as the approved plan. Everything after this is measured as
// drift from it, which is what makes "we are on budget" a meaningful claim.
const approveBudgetBaseline = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const budget = await Budget.findById(id(req.params.id)).session(session);
  if (!budget) fail(404, 'Budget not found');
  if (budget.baseline?.approvedAt && !req.body.rebaseline) {
    fail(409, 'This budget already has an approved baseline. Re-baselining needs an explicit confirmation and a reason.');
  }
  const reason = text(req.body.reason, 500);
  if (budget.baseline?.approvedAt && !reason) fail(422, 'Re-baselining requires a reason');
  const before = budget.toObject();
  budget.baseline = {
    allocated: budget.allocated,
    fixed: budget.allocatedFixed || 0,
    variable: budget.allocatedVariable || 0,
    approvedAt: new Date(),
    approvedBy: actor(req),
    approvedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
  };
  budget.revision = 0;
  if (reason) budget.adjustments.push({ delta: 0, allocatedAfter: budget.allocated, reason: `Re-baselined: ${reason}`, actor: actor(req), actorName: budget.baseline.approvedByName });
  await budget.save({ session });
  const snapshot = await W.refreshBudget(budget._id, session);
  await audit(req, before.baseline?.approvedAt ? 'budget_rebaselined' : 'budget_baseline_approved', budget, before, { baseline: budget.baseline, reason }, session);
  return snapshot;
}));

// Replaces a budget's phasing profile on its own, so re-planning the shape of the year does
// not require re-sending the whole budget.
const setBudgetPhasing = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const budget = await Budget.findById(id(req.params.id)).session(session);
  if (!budget) fail(404, 'Budget not found');
  const before = budget.toObject();
  if (req.body.method === 'even') budget.set(evenPhasing(budget));
  else if (req.body.method === 'none') { budget.phasing = []; budget.phasingMethod = 'none'; }
  else budget.set(phasingFrom(req.body.phasing, budget));
  await budget.save({ session });
  const snapshot = await W.budgetSnapshot(budget, session);
  await audit(req, 'budget_phasing_set', budget, before, { phasingMethod: budget.phasingMethod }, session);
  return snapshot;
}));

const bankList =handler(async req => { const { page, limit } = paging(req.query); const filter = req.query.unmatched === 'true' ? { payment: null } : {}; const [items, total] = await Promise.all([BankTransaction.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(), BankTransaction.countDocuments(filter)]); return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }; });
const bankImport = handler(async req => transaction(async session => {
  const rows = req.body.rows; if (!Array.isArray(rows) || !rows.length || rows.length > 500) fail(422, 'Import 1 to 500 bank transactions');
  let imported = 0; let skipped = 0;
  for (const row of rows) {
    const account = text(row.account, 120); const reference = text(row.reference, 120);
    if (!account || !reference || !['in', 'out'].includes(row.direction)) fail(422, 'Account, reference and direction (in/out) are required');
    const amountMinor = S.positive(row.amount); const at = date(row.date);
    const existing = await BankTransaction.findOne({ account, reference }).session(session);
    if (existing) { if (existing.amountMinor !== amountMinor || existing.direction !== row.direction || existing.date.getTime() !== at.getTime()) fail(409, `Reference ${reference} conflicts with the existing import`); skipped++; continue; }
    const [bank] = await BankTransaction.create([{ account, reference, amountMinor, date: at, direction: row.direction, description: text(row.description, 500), importedBy: actor(req) }], { session });
    await audit(req, 'bank_transaction_imported', bank, null, { account, reference, amountMinor }, session); imported++;
  }
  return { imported, skipped };
}), 201);
async function decision(req) {
  const doc = await decisionTxn(req);
  // Told after the transaction commits: the submitter should only hear about a decision
  // that actually stuck, and a notification failure must not undo it.
  await notify.reviewDecided({
    module: req.params.module,
    doc,
    decision: req.body.decision,
    decidedByName: doc.review?.decidedByName,
    title: doc.invoiceNumber || doc.employeeName || doc.entryNumber || 'the record',
    note: doc.review?.decisionNote,
    submittedBy: doc.review?.submittedBy,
  });
  return doc;
}
async function decisionTxn(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const Model = { invoice: Invoice, journal: Journal }[req.params.module]; if (!Model) fail(422, 'Unknown review module');
    const doc = await Model.findById(id(req.params.id)).session(session); if (!doc) fail(404, 'Record not found');
    if (doc.status !== 'draft' || doc.review?.status !== 'submitted') fail(409, 'Record is not awaiting review');
    const decision = req.body.decision; const note = text(req.body.note);
    if (!['approve', 'return'].includes(decision) || (decision === 'return' && !note)) fail(422, 'Provide a decision and a return reason');
    const before = { status: doc.status, review: doc.review.toObject() };
    if (decision === 'approve') {
      if (req.params.module === 'invoice') await S.finalize(req, doc, session);
      else { await validateJournal(doc, session); doc.status = 'posted'; doc.postedAt = new Date(); }
    }
    Object.assign(doc.review, { status: decision === 'approve' ? 'approved' : 'returned', decidedBy: actor(req), decidedByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(), decidedAt: new Date(), decisionNote: note });
    await doc.save({ session }); await audit(req, 'review_decision', doc, before, { status: doc.status, review: doc.review.toObject() }, session); return doc;
  });
}
async function validateJournal(doc, session) {
  if (doc.lines.length < 2) fail(422, 'A journal requires at least two lines'); let debit = 0n; let credit = 0n;
  for (const line of doc.lines) { const d = BigInt(money.minor(line.debit)); const c = BigInt(money.minor(line.credit)); if ((!d && !c) || (d && c)) fail(422, 'Each line must have a debit or credit'); if (!await require('../../models/finance/Account').exists({ _id: line.account, isActive: true }).session(session)) fail(422, 'Journal account is missing or inactive'); debit += d; credit += c; }
  if (debit !== credit) fail(422, 'Journal is not balanced'); doc.totalDebit = money.decimal(debit); doc.totalCredit = money.decimal(credit);
}
const saveJournal = update => handler(async req => transaction(async session => {
  const doc = update ? await Journal.findById(id(req.params.id)).session(session) : new Journal({ entryNumber: `JE-${require('node:crypto').randomUUID()}`, createdBy: actor(req) });
  if (!doc) fail(404, 'Journal not found'); if (doc.status !== 'draft') fail(409, 'Posted journals are immutable; post a reversal');
  if (doc.review?.status === 'submitted') fail(409, 'Journal is awaiting review');
  const before = update ? doc.toObject() : null; doc.memo = text(req.body.memo); doc.entryDate = req.body.entryDate ? date(req.body.entryDate) : new Date();
  if (req.body.departmentId !== undefined) doc.departmentId = req.body.departmentId ? id(req.body.departmentId) : null;
  // A line may carry its own dimensions; otherwise it inherits the entry's, so a single
  // entry can be split across departments for an accurate departmental P&L.
  if (req.body.lines) doc.lines = req.body.lines.map(l => ({
    account: id(l.account),
    debit: money.decimal(money.minor(l.debit || 0)),
    credit: money.decimal(money.minor(l.credit || 0)),
    description: text(l.description),
    departmentId: l.departmentId ? id(l.departmentId) : (doc.departmentId || null),
    projectId: l.projectId ? id(l.projectId) : null,
    client: l.client ? id(l.client) : null,
    costCenterId: l.costCenterId ? id(l.costCenterId) : null,
  }));
  await validateJournal(doc, session); await doc.save({ session }); await audit(req, 'journal_draft_saved', doc, before, doc.toObject(), session); return doc;
}), update ? 200 : 201);
const postJournalEntry = handler(async req => transaction(async session => { if (!head(req.user)) fail(403, 'Finance Head required'); const doc = await Journal.findById(id(req.params.id)).session(session); if (!doc) fail(404, 'Journal not found'); if (doc.status !== 'draft') fail(409, 'Journal already posted'); await validateJournal(doc, session); doc.status = 'posted'; doc.postedAt = new Date(); await doc.save({ session }); await audit(req, 'journal_posted', doc, { status: 'draft' }, { status: 'posted' }, session); return doc; }));
module.exports = { createInvoice, updateInvoice, createInvoiceNote, createPayment, updatePayment, createExpense, updateExpense, updateFinanceRequestAction, getInvoices, getPayments, getExpenses, deleteInvoice, deleteExpense, getBudgets, getBudgetVariance, getProjectOptions, createBudget: saveBudget(false), updateBudget: saveBudget(true), adjustBudget, approveBudgetBaseline, setBudgetPhasing, bankList, bankImport, decideReview: handler(decision), createJournalEntry: saveJournal(false), updateJournalEntry: saveJournal(true), postJournalEntry, paging };
