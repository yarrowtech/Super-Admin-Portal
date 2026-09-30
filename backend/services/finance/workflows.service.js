'use strict';
const mongoose = require('mongoose');
const S = require('./operations.service');
const { money, fail, transaction, audit, actor, head, id, text, date, positive, journal, openPeriod } = S;
const Payroll = require('../../models/finance/Payroll');
const Expense = require('../../models/finance/Expense');
const Budget = require('../../models/finance/Budget');
const Payment = require('../../models/finance/Payment');
const User = require('../../models/auth/User');
const Department = require('../../models/department/Department');
const { Salary } = require('../../models/finance/FinanceOperations');
const sum = (rows, field) => rows.reduce((n, row) => n + BigInt(money.minor(row[field] || 0)), 0n);
const signed = n => n < 0n ? -money.decimal(-n) : money.decimal(n);
async function budgetSnapshot(b, session) {
  const expenses = await Expense.find({ budgetId: b._id, status: { $nin: ['draft', 'rejected', 'cancelled'] } }).session(session).lean();
  const payrolls = await Payroll.find({ budgetId: b._id, status: { $in: ['processed', 'disbursed'] } }).session(session).lean();
  const spent = sum(expenses.filter(e => ['approved', 'processing', 'completed', 'paid'].includes(e.status)), 'amount') + sum(payrolls, 'grossPay');
  const reserved = sum(expenses.filter(e => !['approved', 'processing', 'completed', 'paid'].includes(e.status)), 'amount');
  const allocated = BigInt(money.minor(b.allocated));
  const utilization = allocated ? Number((spent + reserved) * 10000n / allocated) / 100 : 0;
  return { ...b.toObject(), spent: money.decimal(spent), reserved: money.decimal(reserved), available: signed(allocated - spent - reserved), utilization, status: utilization > 100 ? 'over' : utilization >= (b.alertThreshold || 85) ? 'at-risk' : 'on-track' };
}
async function refreshBudget(budgetId, session) {
  if (!budgetId) return;
  // A write on the budget serializes concurrent reservations and approvals.
  const budget = await Budget.findByIdAndUpdate(budgetId, { $inc: { __v: 1 } }, { new: true, session });
  if (!budget) fail(422, 'Budget not found');
  const snapshot = await budgetSnapshot(budget, session);
  if (snapshot.available < 0) fail(409, 'Operation would exceed available budget');
  Object.assign(budget, S.pick(snapshot, ['spent', 'reserved', 'available', 'utilization']));
  await budget.save({ session }); return snapshot;
}
async function selectBudget(body, departmentId, session) {
  if (body.budgetId) {
    const b = await Budget.findById(id(body.budgetId)).session(session);
    if (!b || String(b.departmentId) !== String(departmentId) || b.status === 'closed') fail(422, 'Budget must be open and belong to the department');
    return b._id;
  }
  const year = String(body.fiscalYear || new Date(body.incurredDate || body.periodStart || Date.now()).getUTCFullYear());
  const budgets = await Budget.find({ departmentId, fiscalYear: year, status: { $nin: ['closed', 'draft'] } }).session(session);
  if (budgets.length > 1) fail(422, 'Choose a specific budget for this department and period');
  return budgets[0]?._id || null;
}
async function createPayroll(req) {
  return transaction(async session => {
    const b = req.body || {};
    const employeeId = id(b.employee);
    const employee = await User.findOne({ _id: employeeId, isActive: true }).session(session);
    const salary = await Salary.findOne({ employee: employeeId }).session(session);
    if (!employee || !salary) fail(422, 'An active employee and an authorized salary profile are required');
    const start = date(b.periodStart, 'Period start'); const end = date(b.periodEnd, 'Period end');
    if (end < start || start.toISOString().slice(0, 7) !== end.toISOString().slice(0, 7)) fail(422, 'Payroll must cover a single calendar month');
    if (start < salary.effectiveFrom) fail(422, 'Salary profile is not effective for this period');
    const periodKey = start.toISOString().slice(0, 7);
    // Protect duplicates of historical runs created before periodKey was introduced.
    const monthStart = new Date(`${periodKey}-01T00:00:00Z`); const nextMonth = new Date(monthStart); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    if (await Payroll.exists({ employee: employeeId, periodStart: { $lt: nextMonth }, periodEnd: { $gte: monthStart } }).session(session)) fail(409, 'Payroll already exists for this employee and month');
    await openPeriod(b.financialPeriodId, session);
    const gross = BigInt(salary.baseMinor) + BigInt(salary.allowanceMinor);
    const deductions = BigInt(salary.deductionMinor);
    if (gross <= deductions) fail(422, 'Net salary must be positive');
    const budgetId = await selectBudget(b, salary.departmentId, session);
    const [p] = await Payroll.create([{ employee: employeeId, employeeName: `${employee.firstName} ${employee.lastName}`, departmentId: salary.departmentId, budgetId, periodStart: start, periodEnd: end, periodKey, grossPay: money.decimal(gross), deductions: money.decimal(deductions), netPay: money.decimal(gross - deductions), salarySnapshot: salary.toObject(), status: 'draft', financialPeriodId: b.financialPeriodId || null, notes: text(b.notes), createdBy: actor(req) }], { session });
    await audit(req, 'payroll_draft_created', p, null, { employee: p.employee, periodKey }, session); return p;
  });
}
async function processPayroll(req, p, session) {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  if (!p.employee || !p.salarySnapshot) fail(409, 'Legacy payroll must be reviewed and recreated from an authorized salary profile');
  await openPeriod(p.financialPeriodId, session);
  const gross = money.minor(p.grossPay); const net = money.minor(p.netPay); const deduction = money.minor(p.deductions);
  if (gross !== net + deduction) fail(422, 'Payroll does not balance');
  p.status = 'processed'; p.payslipNumber = `PS-${p.periodKey}-${p._id}`;
  const entry = await journal(req, `payroll-${p._id}`, [['5100', gross, 0], ['2200', 0, gross]], session, p.periodEnd, p.payslipNumber, p);
  p.journalEntryId = entry._id;
  await p.save({ session }); await refreshBudget(p.budgetId, session);
}
async function updatePayroll(req) {
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const p = await Payroll.findById(id(req.params.id)).session(session);
    if (!p) fail(404, 'Payroll not found');
    if (Object.keys(req.body).some(k => !['status', 'paidOn', 'notes'].includes(k))) fail(422, 'Salary amounts and employee identity are immutable');
    const before = { status: p.status };
    if (req.body.status === 'processed' && p.status === 'draft') await processPayroll(req, p, session);
    else if (req.body.status === 'disbursed' && p.status === 'processed') {
      await openPeriod(p.financialPeriodId, session);
      const paidOn = req.body.paidOn ? date(req.body.paidOn) : new Date();
      const amount = money.minor(p.netPay);
      const [payment] = await Payment.create([{ amount: p.netPay, amountMinor: amount, direction: 'out', status: 'completed', reference: `PAYROLL-${p._id}`, paymentDate: paidOn, customerName: p.employeeName, method: 'bank', departmentId: p.departmentId, createdBy: actor(req) }], { session });
      await journal(req, `payroll-paid-${p._id}`, [['2200', amount, 0], ['1000', 0, amount]], session, paidOn, p.payslipNumber, p);
      p.paymentId = payment._id; p.status = 'disbursed'; p.paidOn = paidOn; await p.save({ session });
    } else fail(409, 'Payroll must progress from draft to processed to disbursed');
    await audit(req, 'payroll_transition', p, before, { status: p.status, paymentId: p.paymentId }, session); return p;
  });
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
    await openPeriod(b.financialPeriodId, session);
    const budgetId = await selectBudget(b, department._id, session);
    const [e] = await Expense.create([{ title: text(b.title, 200), category: text(b.category, 100), amount: money.decimal(amount), departmentId: department._id, department: department.name, budgetId, financialPeriodId: b.financialPeriodId || null, vendor: b.vendor || null, costCenterId: b.costCenterId || null, incurredDate: b.incurredDate ? date(b.incurredDate) : new Date(), documents: documents(b.documents), notes: text(b.notes), submittedBy: actor(req), status: 'submitted', budgetReservedAt: new Date(), statusHistory: [{ from: '', to: 'submitted', action: 'submit', actor: actor(req), actorRole: req.user.role }] }], { session });
    await refreshBudget(budgetId, session); await audit(req, 'expense_submitted', e, null, e.toObject(), session); return e;
  });
}
async function updateExpense(req) {
  return transaction(async session => {
    const e = await Expense.findById(id(req.params.id)).session(session);
    if (!e) fail(404, 'Expense not found');
    if (!['draft', 'submitted', 'needs_information'].includes(e.status)) fail(409, 'Reviewed expenses are immutable');
    if (Object.keys(req.body).some(k => !['title', 'category', 'amount', 'notes', 'documents', 'incurredDate'].includes(k))) fail(422, 'Use lifecycle actions to change financial assignments or status');
    await openPeriod(e.financialPeriodId, session);
    const before = e.toObject(); Object.assign(e, S.pick(req.body, ['title', 'category', 'notes']));
    if (req.body.amount !== undefined) e.amount = money.decimal(positive(req.body.amount));
    if (req.body.documents) e.documents = documents(req.body.documents);
    if (req.body.incurredDate) e.incurredDate = date(req.body.incurredDate);
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
  return transaction(async session => {
    const e = await Expense.findById(id(req.params.id)).session(session); if (!e) fail(404, 'Expense not found');
    const action = req.params.action; const rule = transitions[action]; const comment = text(req.body.comment || req.body.reason);
    if (!rule || !rule[0].includes(e.status)) fail(409, 'Invalid expense transition');
    if (['approve', 'reject', 'cancel', 'complete'].includes(action) && !head(req.user)) fail(403, 'Finance Head permission required');
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
    await e.save({ session }); await refreshBudget(e.budgetId, session); await audit(req, `expense_${action}`, e, before, e.toObject(), session); return { request: e, workflow: null };
  });
}
module.exports = { createPayroll, updatePayroll, processPayroll, createExpense, updateExpense, expenseAction, budgetSnapshot, refreshBudget, signed };
