'use strict';
const S = require('../../services/finance/operations.service');
const W = require('../../services/finance/workflows.service');
const Invoice = require('../../models/finance/Invoice');
const Note = require('../../models/finance/InvoiceNote');
const Journal = require('../../models/finance/JournalEntry');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const Client = require('../../models/finance/Client');
const Payroll = require('../../models/finance/Payroll');
const Department = require('../../models/department/Department');
const Vendor = require('../../models/finance/Vendor');
const AuditLog = require('../../models/finance/AuditLog');
const Compliance = require('../../models/finance/Compliance');
const { TaxRule } = require('../../models/finance/FinanceOperations');
const { handler, fail, id, head, actor, text, date, transaction, audit, money } = S;
const signed = W.signed;
// Reads tolerate legacy float/negative amounts; see S.amountOf.
const amt = S.amountOf;
const day = d => (d ? new Date(d).toISOString().slice(0, 10) : '');

function range(q) {
  if (!q.from || !q.to) fail(422, 'Select a from and to date');
  const from = date(q.from, 'From date'); const to = date(q.to, 'To date'); to.setUTCHours(23, 59, 59, 999);
  if (from > to) fail(422, 'Date range is reversed');
  return { from, to };
}
function csv(res, name, rows) {
  const body = rows.map(row => row.map(v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(body);
}
const sendCsv = (name, build) => async (req, res) => {
  try { const { rows } = await build(req); return csv(res, name, rows); }
  catch (e) { return res.status(e.statusCode || 500).json({ success: false, error: e.statusCode ? e.message : 'Export failed' }); }
};

// ---- Tax rules -------------------------------------------------------------
const listTaxRules = handler(async req => {
  const filter = {}; if (['gst', 'tds'].includes(req.query.kind)) filter.kind = req.query.kind;
  if (req.query.on) { const on = date(req.query.on); Object.assign(filter, { isActive: true, effectiveFrom: { $lte: on }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: on } }] }); }
  return (await TaxRule.find(filter).sort({ kind: 1, effectiveFrom: -1 }).limit(500).lean()).map(r => ({ ...r, rate: r.rateBp / 100 }));
});
const createTaxRule = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const b = req.body || {};
  if (!['gst', 'tds'].includes(b.kind) || !text(b.code, 40) || !text(b.name, 120)) fail(422, 'Kind (gst/tds), code and name are required');
  const effectiveFrom = date(b.effectiveFrom, 'Effective from'); const effectiveTo = b.effectiveTo ? date(b.effectiveTo, 'Effective to') : null;
  if (effectiveTo && effectiveTo < effectiveFrom) fail(422, 'Effective to cannot precede effective from');
  const rateBp = money.basisPoints(b.rate);
  const code = text(b.code, 40).toUpperCase();
  // One code may not have two overlapping effective windows.
  const overlap = await TaxRule.exists({ kind: b.kind, code, effectiveFrom: { $lte: effectiveTo || new Date(8.64e15) }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: effectiveFrom } }] }).session(session);
  if (overlap) fail(409, `${code} already has a rule in this effective window; close it with an end date first`);
  const [rule] = await TaxRule.create([{ kind: b.kind, code, name: text(b.name, 120), section: text(b.section, 40), rateBp, effectiveFrom, effectiveTo, notes: text(b.notes), createdBy: actor(req) }], { session });
  await audit(req, 'tax_rule_created', rule, null, rule.toObject(), session);
  return rule;
}), 201);
// Rates and start dates are immutable because issued invoices depend on them.
const updateTaxRule = handler(async req => transaction(async session => {
  if (!head(req.user)) fail(403, 'Finance Head permission required');
  const b = req.body || {};
  if (Object.keys(b).some(k => !['effectiveTo', 'isActive', 'name', 'notes'].includes(k))) fail(422, 'Only end date, active flag, name and notes can change; create a new rule for a new rate');
  const rule = await TaxRule.findById(id(req.params.id)).session(session); if (!rule) fail(404, 'Tax rule not found');
  const before = rule.toObject();
  if (b.effectiveTo !== undefined) { rule.effectiveTo = b.effectiveTo ? date(b.effectiveTo, 'Effective to') : null; if (rule.effectiveTo && rule.effectiveTo < rule.effectiveFrom) fail(422, 'Effective to cannot precede effective from'); }
  if (b.isActive !== undefined) rule.isActive = Boolean(b.isActive);
  if (b.name !== undefined) rule.name = text(b.name, 120) || rule.name;
  if (b.notes !== undefined) rule.notes = text(b.notes);
  await rule.save({ session }); await audit(req, 'tax_rule_updated', rule, before, rule.toObject(), session); return rule;
}));

// ---- Statutory filing preparation -----------------------------------------
async function gstReturn(req) {
  const { from, to } = range(req.query || {});
  const byRate = new Map(); const invoices = [];
  for await (const inv of Invoice.find({ invoiceType: 'customer', status: { $nin: ['draft', 'void'] }, issueDate: { $gte: from, $lte: to } }).sort({ issueDate: 1 }).lean().cursor()) {
    for (const l of inv.items) {
      const key = Number(l.taxRate || 0);
      const row = byRate.get(key) || { taxable: 0n, tax: 0n, count: 0 };
      const tax = BigInt(amt(l.taxAmount));
      const taxable = BigInt(amt(l.taxableValue ?? l.amount));
      row.taxable += taxable; row.tax += tax; row.count++; byRate.set(key, row);
    }
    invoices.push({ invoiceNumber: inv.invoiceNumber, date: day(inv.issueDate), customer: inv.clientName, taxableValue: inv.taxableValue || inv.subtotal, gst: inv.gstAmount, total: inv.total });
  }
  const notes = await Note.find({ createdAt: { $gte: from, $lte: to } }).populate('invoice', 'invoiceNumber clientName').lean();
  let noteGst = 0n;
  const adjustments = notes.map(n => { const g = BigInt(amt(n.gstAmount)); noteGst += n.type === 'credit' ? -g : g; return { type: n.type, reference: n.reference, invoiceNumber: n.invoice?.invoiceNumber, amount: n.amount, gst: n.gstAmount || 0, date: day(n.createdAt) }; });
  const rates = [...byRate].sort((a, b) => a[0] - b[0]).map(([rate, r]) => ({ rate, lines: r.count, taxableValue: signed(r.taxable), tax: signed(r.tax) }));
  const outward = [...byRate.values()].reduce((n, r) => n + r.tax, 0n);
  return { from: day(from), to: day(to), rates, invoices, adjustments, outputTax: signed(outward), noteAdjustment: signed(noteGst), netOutputTax: signed(outward + noteGst), filing: { status: 'unavailable', message: 'GSTN filing integration is not connected. Export this worksheet and file through the GST portal or your GSP.' } };
}
async function tdsReturn(req) {
  const { from, to } = range(req.query || {});
  const rows = []; let total = 0n;
  for await (const inv of Invoice.find({ invoiceType: 'customer', status: { $nin: ['draft', 'void'] }, tdsAmount: { $gt: 0 }, issueDate: { $gte: from, $lte: to } }).sort({ issueDate: 1 }).lean().cursor()) {
    total += BigInt(amt(inv.tdsAmount));
    rows.push({ invoiceNumber: inv.invoiceNumber, date: day(inv.issueDate), customer: inv.clientName, section: inv.tdsSection, rate: inv.tdsRate, taxableValue: inv.taxableValue || inv.subtotal, tds: inv.tdsAmount });
  }
  return { from: day(from), to: day(to), rows, tdsReceivable: signed(total), filing: { status: 'unavailable', message: 'TRACES / Form 26AS reconciliation is not connected. Match these deductions manually against Form 26AS.' } };
}
const gstCsv = sendCsv('gst-return-worksheet', async req => { const r = await gstReturn(req); return { rows: [['GST worksheet', `${r.from} to ${r.to}`], [], ['Rate %', 'Lines', 'Taxable value', 'Tax'], ...r.rates.map(x => [x.rate, x.lines, x.taxableValue, x.tax]), [], ['Invoice', 'Date', 'Customer', 'Taxable value', 'GST', 'Total'], ...r.invoices.map(x => [x.invoiceNumber, x.date, x.customer, x.taxableValue, x.gst, x.total]), [], ['Note type', 'Reference', 'Invoice', 'Amount', 'GST', 'Date'], ...r.adjustments.map(x => [x.type, x.reference, x.invoiceNumber, x.amount, x.gst, x.date]), [], ['Output tax', r.outputTax], ['Note adjustment', r.noteAdjustment], ['Net output tax', r.netOutputTax]] }; });
const tdsCsv = sendCsv('tds-worksheet', async req => { const r = await tdsReturn(req); return { rows: [['TDS worksheet', `${r.from} to ${r.to}`], ['Invoice', 'Date', 'Customer', 'Section', 'Rate %', 'Taxable value', 'TDS'], ...r.rows.map(x => [x.invoiceNumber, x.date, x.customer, x.section, x.rate, x.taxableValue, x.tds]), [], ['TDS receivable', r.tdsReceivable]] }; });

// ---- Audit data export ------------------------------------------------------
const auditCsv = sendCsv('finance-audit-trail', async req => {
  if (!head(req.user) && req.user.role !== 'ceo') fail(403, 'Audit export requires Finance Head or CEO');
  const { from, to } = range(req.query || {});
  const logs = await AuditLog.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 }).limit(50000).populate('actor', 'firstName lastName email').lean();
  return { rows: [['Timestamp', 'Actor', 'Role', 'Action', 'Resource', 'Resource ID'], ...logs.map(l => [l.createdAt?.toISOString(), l.actor ? `${l.actor.firstName || ''} ${l.actor.lastName || ''} <${l.actor.email || ''}>`.trim() : '', l.actorRole, l.action, l.resourceType, l.resourceId])] };
});

// ---- Compliance calendar (whitelisted fields) --------------------------------
function compliancePayload(b, creating) {
  const out = {};
  if (creating || b.type !== undefined) { if (!['gst', 'tds', 'statutory', 'audit', 'other'].includes(b.type)) fail(422, 'Invalid compliance type'); out.type = b.type; }
  if (b.status !== undefined) { if (!['pending', 'filed', 'overdue'].includes(b.status)) fail(422, 'Invalid status'); out.status = b.status; }
  for (const k of ['periodLabel', 'reference', 'notes']) if (b[k] !== undefined) out[k] = text(b[k], k === 'notes' ? 2000 : 120);
  if (b.dueDate !== undefined) out.dueDate = b.dueDate ? date(b.dueDate, 'Due date') : null;
  if (b.attachments !== undefined) {
    if (!Array.isArray(b.attachments) || b.attachments.length > 10) fail(422, 'At most ten attachments');
    out.attachments = b.attachments.map(a => { const url = text(a.url, 1500); if (!/^https:\/\//i.test(url)) fail(422, 'Attachments must use https'); return { label: text(a.label, 120), url }; });
  }
  if (out.status === 'filed' && !out.reference && creating) fail(422, 'A filing acknowledgement reference is required');
  return out;
}
const createCompliance = handler(async req => transaction(async session => {
  const [rec] = await Compliance.create([{ ...compliancePayload(req.body || {}, true), projectId: req.projectId || null, createdBy: actor(req) }], { session });
  await audit(req, 'compliance_created', rec, null, rec.toObject(), session); return rec;
}), 201);
const updateCompliance = handler(async req => transaction(async session => {
  const rec = await Compliance.findOne({ _id: id(req.params.id), ...(req.projectId ? { projectId: req.projectId } : {}) }).session(session);
  if (!rec) fail(404, 'Compliance record not found');
  const before = rec.toObject(); Object.assign(rec, compliancePayload(req.body || {}, false));
  if (rec.status === 'filed' && !rec.reference) fail(422, 'A filing acknowledgement reference is required');
  await rec.save({ session }); await audit(req, 'compliance_updated', rec, before, rec.toObject(), session); return rec;
}));

// ---- Monthly / yearly summary from posted journals --------------------------
// Revenue/expense per month come from posted journal lines (accrual); cash from account 1000.
async function periodSummary(req) {
  const year = Number.parseInt(req.query.year, 10) || new Date().getUTCFullYear();
  if (year < 2000 || year > 2100) fail(422, 'Invalid year');
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${year}-${String(i + 1).padStart(2, '0')}`, revenue: 0n, expenses: 0n, cashIn: 0n, cashOut: 0n, gst: 0n }));
  const start = new Date(Date.UTC(year, 0, 1)); const end = new Date(Date.UTC(year + 1, 0, 1));
  for await (const e of Journal.find({ status: 'posted', entryDate: { $gte: start, $lt: end } }).populate('lines.account', 'code type').lean().cursor()) {
    const m = months[new Date(e.entryDate).getUTCMonth()];
    for (const l of e.lines) {
      const a = l.account; if (!a) continue; const dr = BigInt(amt(l.debit)); const cr = BigInt(amt(l.credit));
      if (a.type === 'revenue') m.revenue += cr - dr;
      if (a.type === 'expense') m.expenses += dr - cr;
      if (a.code === '1000') { m.cashIn += dr; m.cashOut += cr; }
      if (a.code === '2400') m.gst += cr - dr;
    }
  }
  const out = months.map(m => ({ month: m.month, revenue: signed(m.revenue), expenses: signed(m.expenses), netIncome: signed(m.revenue - m.expenses), cashIn: signed(m.cashIn), cashOut: signed(m.cashOut), netCash: signed(m.cashIn - m.cashOut), gst: signed(m.gst) }));
  const t = months.reduce((a, m) => ({ revenue: a.revenue + m.revenue, expenses: a.expenses + m.expenses, cashIn: a.cashIn + m.cashIn, cashOut: a.cashOut + m.cashOut, gst: a.gst + m.gst }), { revenue: 0n, expenses: 0n, cashIn: 0n, cashOut: 0n, gst: 0n });
  return { year, months: out, totals: { revenue: signed(t.revenue), expenses: signed(t.expenses), netIncome: signed(t.revenue - t.expenses), cashIn: signed(t.cashIn), cashOut: signed(t.cashOut), netCash: signed(t.cashIn - t.cashOut), gst: signed(t.gst) } };
}
const periodCsv = sendCsv('finance-period-summary', async req => { const r = await periodSummary(req); return { rows: [['Month', 'Revenue', 'Expenses', 'Net income', 'Cash in', 'Cash out', 'Net cash', 'GST output'], ...r.months.map(m => [m.month, m.revenue, m.expenses, m.netIncome, m.cashIn, m.cashOut, m.netCash, m.gst]), ['Total', r.totals.revenue, r.totals.expenses, r.totals.netIncome, r.totals.cashIn, r.totals.cashOut, r.totals.netCash, r.totals.gst]] }; });

// ---- Revenue by customer (issued invoices, net of notes) --------------------
async function revenueReport(req) {
  const { from, to } = range(req.query || {});
  const rows = await Invoice.aggregate([
    { $match: { invoiceType: 'customer', status: { $nin: ['draft', 'void'] }, issueDate: { $gte: from, $lte: to } } },
    { $group: { _id: '$clientName', invoices: { $sum: 1 }, billed: { $sum: '$total' }, gst: { $sum: '$gstAmount' }, collected: { $sum: '$amountPaid' }, outstanding: { $sum: '$balanceDue' } } },
    { $sort: { billed: -1 } },
  ]);
  const r2 = n => Math.round(n * 100) / 100;
  return { from: day(from), to: day(to), rows: rows.map(r => ({ customer: r._id, invoices: r.invoices, billed: r2(r.billed), gst: r2(r.gst), collected: r2(r.collected), outstanding: r2(r.outstanding) })), basis: 'Issued customer invoices by issue date; totals include GST and credit/debit note adjustments.' };
}

// ---- Receivables aging + expense pipeline for the dashboard -----------------
// Computed server-side so the figures cover every record, not just the page on screen.
async function agingSummary(req) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const scope = {}; if (req.query.departmentId) scope.departmentId = id(req.query.departmentId);
  const [aging] = await Invoice.aggregate([
    { $match: { ...scope, invoiceType: 'customer', status: { $in: ['sent', 'partially_paid', 'overdue'] }, balanceDue: { $gt: 0 } } },
    { $project: { balanceDue: 1, days: { $cond: [{ $and: ['$dueDate', { $lt: ['$dueDate', today] }] }, { $dateDiff: { startDate: '$dueDate', endDate: today, unit: 'day' } }, -1] } } },
    { $group: {
      _id: null,
      outstandingAmount: { $sum: '$balanceDue' }, count: { $sum: 1 },
      current: { $sum: { $cond: [{ $lt: ['$days', 0] }, '$balanceDue', 0] } }, currentCount: { $sum: { $cond: [{ $lt: ['$days', 0] }, 1, 0] } },
      b1: { $sum: { $cond: [{ $and: [{ $gte: ['$days', 0] }, { $lte: ['$days', 30] }] }, '$balanceDue', 0] } }, b1Count: { $sum: { $cond: [{ $and: [{ $gte: ['$days', 0] }, { $lte: ['$days', 30] }] }, 1, 0] } },
      b2: { $sum: { $cond: [{ $and: [{ $gt: ['$days', 30] }, { $lte: ['$days', 60] }] }, '$balanceDue', 0] } }, b2Count: { $sum: { $cond: [{ $and: [{ $gt: ['$days', 30] }, { $lte: ['$days', 60] }] }, 1, 0] } },
      b3: { $sum: { $cond: [{ $and: [{ $gt: ['$days', 60] }, { $lte: ['$days', 90] }] }, '$balanceDue', 0] } }, b3Count: { $sum: { $cond: [{ $and: [{ $gt: ['$days', 60] }, { $lte: ['$days', 90] }] }, 1, 0] } },
      b4: { $sum: { $cond: [{ $gt: ['$days', 90] }, '$balanceDue', 0] } }, b4Count: { $sum: { $cond: [{ $gt: ['$days', 90] }, 1, 0] } },
    } },
  ]);
  const expenses = await Expense.aggregate([{ $match: scope }, { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]);
  const r2 = n => Math.round((n || 0) * 100) / 100;
  const pick2 = list => list.reduce((acc, s) => { const row = expenses.find(e => e._id === s); return { amount: acc.amount + (row?.amount || 0), count: acc.count + (row?.count || 0) }; }, { amount: 0, count: 0 });
  const pending = pick2(['submitted', 'pending', 'under_review', 'needs_information', 'pending_approval']);
  const verified = pick2(['verified']);
  const a = aging || {};
  return {
    receivables: { outstandingAmount: r2(a.outstandingAmount), count: a.count || 0, overdueAmount: r2((a.b1 || 0) + (a.b2 || 0) + (a.b3 || 0) + (a.b4 || 0)), overdueCount: (a.b1Count || 0) + (a.b2Count || 0) + (a.b3Count || 0) + (a.b4Count || 0) },
    aging: [
      { label: 'Current', amount: r2(a.current), count: a.currentCount || 0 },
      { label: '1-30', amount: r2(a.b1), count: a.b1Count || 0 },
      { label: '31-60', amount: r2(a.b2), count: a.b2Count || 0 },
      { label: '61-90', amount: r2(a.b3), count: a.b3Count || 0 },
      { label: '90+', amount: r2(a.b4), count: a.b4Count || 0 },
    ],
    expenses: { totalAmount: r2(expenses.reduce((n, e) => n + e.amount, 0)), pendingAmount: r2(pending.amount), pendingCount: pending.count, verifiedAmount: r2(verified.amount), verifiedCount: verified.count, byStatus: expenses.map(e => ({ status: e._id, amount: r2(e.amount), count: e.count })) },
  };
}

// ---- Departmental P&L ---------------------------------------------------------
// Revenue and expense per department, read from posted journal LINES so an entry
// split across departments is attributed correctly. A line with no department of its
// own falls back to the entry's; anything still unset is reported as "Unallocated",
// which is deliberate — silently hiding it would make the totals lie.
async function departmentalPnl(req) {
  const q = req.query || {};
  const match = { status: 'posted' };
  if (q.from || q.to) {
    match.entryDate = {};
    if (q.from) match.entryDate.$gte = date(q.from, 'From date');
    if (q.to) { const end = date(q.to, 'To date'); end.setUTCHours(23, 59, 59, 999); match.entryDate.$lte = end; }
  }
  const rows = await Journal.aggregate([
    { $match: match },
    { $unwind: '$lines' },
    { $lookup: { from: 'financeaccounts', localField: 'lines.account', foreignField: '_id', as: 'acct' } },
    { $unwind: '$acct' },
    { $match: { 'acct.type': { $in: ['revenue', 'expense'] } } },
    { $group: {
      _id: { department: { $ifNull: ['$lines.departmentId', '$departmentId'] }, type: '$acct.type' },
      debit: { $sum: '$lines.debit' },
      credit: { $sum: '$lines.credit' },
    } },
  ]);
  const departments = await Department.find({}, 'name code').lean();
  const nameOf = new Map(departments.map(d => [String(d._id), d.name]));
  const byDept = new Map();
  for (const row of rows) {
    const key = row._id.department ? String(row._id.department) : 'unallocated';
    const entry = byDept.get(key) || { departmentId: row._id.department || null, department: nameOf.get(key) || 'Unallocated', revenue: 0, expenses: 0 };
    // Revenue is a credit balance; expense is a debit balance.
    if (row._id.type === 'revenue') entry.revenue += row.credit - row.debit;
    else entry.expenses += row.debit - row.credit;
    byDept.set(key, entry);
  }
  const r2 = n => Math.round((n || 0) * 100) / 100;
  const departmentsOut = [...byDept.values()]
    .map(d => ({ ...d, revenue: r2(d.revenue), expenses: r2(d.expenses), netIncome: r2(d.revenue - d.expenses), margin: d.revenue > 0 ? r2(((d.revenue - d.expenses) / d.revenue) * 100) : null }))
    .sort((a, b) => b.revenue - a.revenue);
  const totals = departmentsOut.reduce((acc, d) => ({ revenue: acc.revenue + d.revenue, expenses: acc.expenses + d.expenses }), { revenue: 0, expenses: 0 });
  return {
    from: day(match.entryDate?.$gte), to: day(match.entryDate?.$lte),
    departments: departmentsOut,
    totals: { revenue: r2(totals.revenue), expenses: r2(totals.expenses), netIncome: r2(totals.revenue - totals.expenses) },
    basis: 'Accrual. Posted journal lines only, grouped by the line\'s department (falling back to the entry\'s). Lines with no department appear as Unallocated.',
  };
}

// ---- Finance settings the UI mirrors -----------------------------------------
// The receipt rule and alert levels live on the server; the form reads them so the
// two can never drift apart.
const getSettings = handler(async () => ({
  receiptRequiredAbove: require('../../config/financeThresholds').getReceiptThreshold(),
  budgetAlertLevels: require('../../config/financeThresholds').getBudgetAlertLevels(),
  currency: 'INR',
  locale: 'en-IN',
}));

// ---- Global search ----------------------------------------------------------
// One query across the records a finance user jumps between. Payroll rows are
// restricted to the finance head and HR, matching the payroll read rules elsewhere.
const search = handler(async req => {
  const term = text(req.query.q, 100);
  if (term.length < 2) return { query: term, groups: [] };
  const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const canSeePayroll = head(req.user) || req.user.role === 'hr';
  const [invoices, clients, vendors, payrolls] = await Promise.all([
    Invoice.find({ $or: [{ invoiceNumber: rx }, { clientName: rx }] }).sort({ issueDate: -1 }).limit(6).select('invoiceNumber clientName total balanceDue status issueDate').lean(),
    Client.find({ $or: [{ name: rx }, { contactEmail: rx }] }).limit(6).select('name contactEmail balance').lean(),
    Vendor.find({ $or: [{ name: rx }, { contactEmail: rx }, { taxId: rx }] }).limit(6).select('name contactEmail balance status').lean(),
    canSeePayroll ? Payroll.find({ employeeName: rx }).sort({ periodStart: -1 }).limit(6).select('employeeName netPay status periodKey periodStart').lean() : [],
  ]);
  const groups = [
    { kind: 'invoice', label: 'Invoices', path: '/finance/dashboard/invoices', items: invoices.map(i => ({ id: i._id, title: i.invoiceNumber, subtitle: i.clientName, amount: i.balanceDue, status: S.invoiceStatus(i), href: `/finance/dashboard/invoices/${i._id}` })) },
    { kind: 'client', label: 'Clients', path: '/finance/dashboard/directory', items: clients.map(c => ({ id: c._id, title: c.name, subtitle: c.contactEmail, amount: c.balance })) },
    { kind: 'vendor', label: 'Vendors', path: '/finance/dashboard/directory', items: vendors.map(v => ({ id: v._id, title: v.name, subtitle: v.contactEmail, amount: v.balance, status: v.status })) },
    { kind: 'payroll', label: 'Payroll', path: '/finance/dashboard/payroll', items: (payrolls || []).map(p => ({ id: p._id, title: p.employeeName, subtitle: p.periodKey || day(p.periodStart), amount: p.netPay, status: p.status })) },
  ].filter(g => g.items.length);
  return { query: term, groups, total: groups.reduce((n, g) => n + g.items.length, 0) };
});

// ---- Customer balances (receivables per customer from invoices + unapplied receipts) ----
async function customerBalances() {
  const rows = await Invoice.aggregate([
    { $match: { invoiceType: 'customer', status: { $nin: ['draft', 'void'] } } },
    { $group: { _id: '$clientName', client: { $first: '$client' }, outstanding: { $sum: '$balanceDue' }, overdue: { $sum: { $cond: [{ $and: [{ $gt: ['$balanceDue', 0] }, { $lt: ['$dueDate', new Date()] }] }, '$balanceDue', 0] } }, invoices: { $sum: 1 } } },
    { $sort: { outstanding: -1 } },
  ]);
  const advances = await Payment.aggregate([{ $match: { direction: { $ne: 'out' }, status: { $in: ['recorded', 'reconciled'] } } }, { $project: { customerName: 1, unapplied: { $subtract: ['$amountMinor', { $sum: '$allocations.amountMinor' }] } } }, { $group: { _id: '$customerName', unapplied: { $sum: '$unapplied' } } }]);
  const adv = new Map(advances.map(a => [a._id, a.unapplied || 0]));
  const r2 = n => Math.round(n * 100) / 100;
  return rows.map(r => ({ customer: r._id, client: r.client, invoices: r.invoices, outstanding: r2(r.outstanding), overdue: r2(r.overdue), unappliedCredit: r2((adv.get(r._id) || 0) / 100) }));
}

// ---- Chart of accounts ---------------------------------------------------------
// Code and type drive every report, so they are fixed once a posted journal uses the account.
const Account = require('../../models/finance/Account');
const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const createAccount = handler(async req => transaction(async session => {
  const b = req.body || {}; const code = text(b.code, 20); const name = text(b.name, 120);
  if (!/^[A-Za-z0-9.-]+$/.test(code) || !name || !ACCOUNT_TYPES.includes(b.type)) fail(422, 'Code, name and a valid account type are required');
  if (await Account.exists({ code }).session(session)) fail(409, `Account ${code} already exists`);
  const [account] = await Account.create([{ code, name, type: b.type, normalBalance: ['asset', 'expense'].includes(b.type) ? 'debit' : 'credit', notes: text(b.notes) }], { session });
  await audit(req, 'account_created', account, null, account.toObject(), session); return account;
}), 201);
const updateAccount = handler(async req => transaction(async session => {
  const b = req.body || {}; const account = await Account.findById(id(req.params.id)).session(session);
  if (!account) fail(404, 'Account not found');
  const before = account.toObject();
  const used = await Journal.exists({ status: 'posted', 'lines.account': account._id }).session(session);
  if ((b.code !== undefined && text(b.code, 20) !== account.code) || (b.type !== undefined && b.type !== account.type)) {
    if (used) fail(409, 'Code and type are locked once posted journals use this account');
    if (b.type !== undefined) { if (!ACCOUNT_TYPES.includes(b.type)) fail(422, 'Invalid account type'); account.type = b.type; account.normalBalance = ['asset', 'expense'].includes(b.type) ? 'debit' : 'credit'; }
    if (b.code !== undefined) account.code = text(b.code, 20);
  }
  if (b.name !== undefined) account.name = text(b.name, 120) || account.name;
  if (b.notes !== undefined) account.notes = text(b.notes);
  if (b.isActive !== undefined) account.isActive = Boolean(b.isActive);
  await account.save({ session }); await audit(req, 'account_updated', account, before, account.toObject(), session); return account;
}));

module.exports = {
  createAccount, updateAccount,
  listTaxRules, createTaxRule, updateTaxRule,
  getGstReturn: handler(gstReturn), getTdsReturn: handler(tdsReturn), gstCsv, tdsCsv, auditCsv,
  createCompliance, updateCompliance,
  getPeriodSummary: handler(periodSummary), periodCsv, getRevenueReport: handler(revenueReport),
  getCustomerBalances: handler(customerBalances), getAgingSummary: handler(agingSummary), search, getSettings, getDepartmentalPnl: handler(departmentalPnl),
};
