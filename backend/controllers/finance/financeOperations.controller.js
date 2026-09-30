'use strict';
const mongoose = require('mongoose');
const S = require('../../services/finance/operations.service');
const W = require('../../services/finance/workflows.service');
const { handler, fail, id, head, actor, text, date, transaction, audit, money } = S;
const Invoice = require('../../models/finance/Invoice');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const Payroll = require('../../models/finance/Payroll');
const Budget = require('../../models/finance/Budget');
const Journal = require('../../models/finance/JournalEntry');
const User = require('../../models/auth/User');
const Department = require('../../models/department/Department');
const { Salary, BankTransaction } = require('../../models/finance/FinanceOperations');
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
const createPayroll = handler(W.createPayroll, 201);
const updatePayroll = handler(W.updatePayroll);
const getInvoices = handler(list(Invoice, 'issueDate'));
const getPayments = handler(list(Payment, 'paymentDate', req => ({ ...(req.query.direction === 'in' ? { direction: { $ne: 'out' } } : req.query.direction === 'out' ? { direction: 'out' } : {}), ...(req.projectId ? { projectId: req.projectId } : {}) })));
const getExpenses = handler(list(Expense, 'incurredDate'));
const getPayrolls = handler(list(Payroll, 'periodStart', req => head(req.user) || req.user.role === 'hr' ? {} : { employee: actor(req) }));
const deleteInvoice = handler(async req => transaction(async session => { const inv = await Invoice.findById(id(req.params.id)).session(session); if (!inv) fail(404, 'Invoice not found'); if (inv.status !== 'draft') fail(409, 'Only drafts can be removed'); await audit(req, 'invoice_draft_deleted', inv, inv.toObject(), null, session); await inv.deleteOne({ session }); return { deleted: true }; }));
const deleteExpense = handler(async req => transaction(async session => { const e = await Expense.findById(id(req.params.id)).session(session); if (!e) fail(404, 'Expense not found'); if (e.status !== 'draft') fail(409, 'Use a controlled cancellation for submitted expenses'); await audit(req, 'expense_draft_deleted', e, e.toObject(), null, session); await e.deleteOne({ session }); return { deleted: true }; }));
const getBudgets = handler(async () => { const budgets = await Budget.find().sort({ fiscalYear: -1 }).limit(200); const result = []; for (const b of budgets) result.push(await W.budgetSnapshot(b, null)); return result; });
const saveBudget = update => handler(req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required'); const b = req.body;
  let budget = update ? await Budget.findById(id(req.params.id)).session(session) : new Budget();
  if (!budget) fail(404, 'Budget not found'); const before = update ? budget.toObject() : null;
  if (!update) { const department = await Department.findById(id(b.departmentId)).session(session); if (!department) fail(422, 'Department not found'); budget.departmentId = department._id; budget.department = department.name; budget.fiscalYear = text(b.fiscalYear, 20); budget.createdBy = actor(req); budget.costCenterId = b.costCenterId || null; budget.financialPeriodId = b.financialPeriodId || null; }
  await S.openPeriod(budget.financialPeriodId, session);
  if (b.allocated !== undefined) budget.allocated = money.decimal(S.positive(b.allocated));
  if (b.alertThreshold !== undefined) { if (!Number.isInteger(Number(b.alertThreshold)) || Number(b.alertThreshold) < 1 || Number(b.alertThreshold) > 100) fail(422, 'Alert threshold must be 1 to 100'); budget.alertThreshold = Number(b.alertThreshold); }
  if (b.notes !== undefined) budget.notes = text(b.notes);
  if (await Budget.exists({ _id: { $ne: budget._id }, departmentId: budget.departmentId, fiscalYear: budget.fiscalYear, costCenterId: budget.costCenterId || null, financialPeriodId: budget.financialPeriodId || null }).session(session)) fail(409, 'Budget already exists for this department, cost center and period');
  await budget.save({ session }); const snapshot = await W.refreshBudget(budget._id, session); await audit(req, 'budget_saved', budget, before, snapshot, session); return snapshot;
}), update ? 200 : 201);
const salaryEmployees = handler(async req => { if (!head(req.user)) fail(403, 'Finance Head required'); return User.find({ isActive: true }).select('firstName lastName email department').sort({ firstName: 1 }).limit(1000).lean(); });
const getSalaries = handler(async req => { if (!head(req.user)) fail(403, 'Finance Head required'); return Salary.find().populate('employee', 'firstName lastName email').limit(1000).lean(); });
const saveSalary = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head required'); const b = req.body;
  const employee = await User.findOne({ _id: id(b.employee), isActive: true }).session(session); if (!employee) fail(422, 'Active employee required');
  if (!await Department.exists({ _id: id(b.departmentId) }).session(session)) fail(422, 'Department not found');
  const baseMinor = S.positive(b.basePay); const allowanceMinor = money.minor(b.allowances || 0); const deductionMinor = money.minor(b.deductions || 0);
  if (BigInt(baseMinor) + BigInt(allowanceMinor) <= BigInt(deductionMinor)) fail(422, 'Net salary must be positive');
  const before = await Salary.findOne({ employee: employee._id }).session(session).lean();
  const record = await Salary.findOneAndUpdate({ employee: employee._id }, { baseMinor, allowanceMinor, deductionMinor, departmentId: b.departmentId, effectiveFrom: date(b.effectiveFrom), authorizedBy: actor(req) }, { upsert: true, new: true, runValidators: true, session });
  await audit(req, 'salary_authorized', record, before, record.toObject(), session); return record;
}));
const bankList = handler(async req => { const { page, limit } = paging(req.query); const filter = req.query.unmatched === 'true' ? { payment: null } : {}; const [items, total] = await Promise.all([BankTransaction.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(), BankTransaction.countDocuments(filter)]); return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }; });
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
  return transaction(async session => {
    if (!head(req.user)) fail(403, 'Finance Head permission required');
    const Model = { invoice: Invoice, payroll: Payroll, journal: Journal }[req.params.module]; if (!Model) fail(422, 'Unknown review module');
    const doc = await Model.findById(id(req.params.id)).session(session); if (!doc) fail(404, 'Record not found');
    if (doc.status !== 'draft' || doc.review?.status !== 'submitted') fail(409, 'Record is not awaiting review');
    const decision = req.body.decision; const note = text(req.body.note);
    if (!['approve', 'return'].includes(decision) || (decision === 'return' && !note)) fail(422, 'Provide a decision and a return reason');
    const before = { status: doc.status, review: doc.review.toObject() };
    if (decision === 'approve') {
      if (req.params.module === 'invoice') await S.finalize(req, doc, session);
      else if (req.params.module === 'payroll') await W.processPayroll(req, doc, session);
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
  if (req.body.lines) doc.lines = req.body.lines.map(l => ({ account: id(l.account), debit: money.decimal(money.minor(l.debit || 0)), credit: money.decimal(money.minor(l.credit || 0)), description: text(l.description) }));
  await validateJournal(doc, session); await doc.save({ session }); await audit(req, 'journal_draft_saved', doc, before, doc.toObject(), session); return doc;
}), update ? 200 : 201);
const postJournalEntry = handler(async req => transaction(async session => { if (!head(req.user)) fail(403, 'Finance Head required'); const doc = await Journal.findById(id(req.params.id)).session(session); if (!doc) fail(404, 'Journal not found'); if (doc.status !== 'draft') fail(409, 'Journal already posted'); await validateJournal(doc, session); doc.status = 'posted'; doc.postedAt = new Date(); await doc.save({ session }); await audit(req, 'journal_posted', doc, { status: 'draft' }, { status: 'posted' }, session); return doc; }));
module.exports = { createInvoice, updateInvoice, createInvoiceNote, createPayment, updatePayment, createExpense, updateExpense, updateFinanceRequestAction, createPayroll, updatePayroll, getInvoices, getPayments, getExpenses, getPayrolls, deleteInvoice, deleteExpense, getBudgets, createBudget: saveBudget(false), updateBudget: saveBudget(true), salaryEmployees, getSalaries, saveSalary, bankList, bankImport, decideReview: handler(decision), createJournalEntry: saveJournal(false), updateJournalEntry: saveJournal(true), postJournalEntry, paging };
