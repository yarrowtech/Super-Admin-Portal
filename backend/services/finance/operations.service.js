'use strict';
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const Invoice = require('../../models/finance/Invoice');
const Payment = require('../../models/finance/Payment');
const Note = require('../../models/finance/InvoiceNote');
const Audit = require('../../models/finance/AuditLog');
const Period = require('../../models/finance/FinancialPeriod');
const Account = require('../../models/finance/Account');
const Journal = require('../../models/finance/JournalEntry');
const { BankTransaction, TaxRule } = require('../../models/finance/FinanceOperations');
const money = require('./money');
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const head = user => ['finance_manager', 'admin', 'super_admin'].includes(user?.role);
const actor = req => req.user?.id || req.user?._id;
const text = (value, max = 1000) => String(value || '').trim().slice(0, max);
const id = value => { if (!mongoose.isValidObjectId(value)) fail(422, 'Invalid record identifier'); return value; };
const date = (value, label = 'Date') => { const d = new Date(value); if (!value || !Number.isFinite(d.getTime())) fail(422, `${label} is invalid`); return d; };
const positive = value => { const n = money.minor(value); if (!n) fail(422, 'Amount must be positive'); return n; };
const pick = (body, fields) => Object.fromEntries(fields.filter(k => body[k] !== undefined).map(k => [k, body[k]]));
async function transaction(work) {
  const session = await mongoose.startSession();
  try { let result; await session.withTransaction(async () => { result = await work(session); }); return result; }
  catch (e) { if (e.code === 11000) fail(409, 'Duplicate reference or financial record'); if (e.code === 20) fail(503, 'Financial writes require a MongoDB replica set; no changes were saved'); throw e; }
  finally { await session.endSession(); }
}
async function audit(req, action, resource, before, after, session) {
  await Audit.create([{ actor: actor(req), actorRole: req.user?.role, action, resourceType: resource.constructor.modelName, resourceId: String(resource._id), meta: { before, after } }], { session });
}
async function openPeriod(periodId, session) {
  if (!periodId) return;
  const p = await Period.findById(id(periodId)).session(session);
  if (!p) fail(422, 'Financial period not found');
  if (p.isClosed) fail(409, 'Financial period is closed');
}
// Any non-zero GST/TDS rate must match an active configured rule effective on the issue date.
async function ruleFor(kind, rate, on, session) {
  const rateBp = money.basisPoints(rate || 0, `${kind.toUpperCase()} rate`);
  if (!rateBp) return null;
  const rule = await TaxRule.findOne({ kind, rateBp, isActive: true, effectiveFrom: { $lte: on }, $or: [{ effectiveTo: null }, { effectiveTo: { $gte: on } }] }).sort({ effectiveFrom: -1 }).session(session).lean();
  if (!rule) fail(422, `No active ${kind.toUpperCase()} rule at ${rateBp / 100}% is effective on ${on.toISOString().slice(0, 10)}`);
  return rule;
}
async function taxedAmounts(items, discount, tdsRate, gstRate, on, session) {
  const lines = (Array.isArray(items) ? items : []).map(i => ({ ...(i.toObject ? i.toObject() : i), taxRate: i.taxRate ?? gstRate ?? 0 }));
  const amounts = money.invoice(lines, discount || 0, { tdsRate: tdsRate || 0 });
  for (const l of amounts.items) await ruleFor('gst', l.taxRate, on, session);
  const tds = await ruleFor('tds', amounts.tdsRate, on, session);
  const rates = [...new Set(amounts.items.map(l => l.taxRate))];
  return { ...amounts, gstRate: rates.length === 1 ? rates[0] : 0, tdsSection: tds?.section || '' };
}
// Reading is tolerant of legacy rows: historical records predating strict money handling can
// hold negative or float-artifact amounts (e.g. 59279.32000000001). Rounding here keeps a
// single bad row from failing a whole listing; writes still go through strict money parsing.
const amountOf = value => Math.round((Number(value) || 0) * 100);
function invoiceStatus(inv) {
  if (['draft', 'void'].includes(inv.status)) return inv.status;
  if (amountOf(inv.balanceDue) <= 0) return 'paid';
  if (inv.dueDate && new Date(inv.dueDate) < new Date(new Date().toISOString().slice(0, 10))) return 'overdue';
  return amountOf(inv.amountPaid) > 0 ? 'partially_paid' : 'sent';
}
async function journal(req, source, lines, session, entryDate = new Date(), memo = '', dimensions = {}) {
  const codes = {
    '1100': ['Receivables', 'asset'], '1000': ['Cash and bank', 'asset'],
    '4000': ['Sales revenue', 'revenue'], '2100': ['Expense payable', 'liability'],
    '2200': ['Payroll payable', 'liability'], '5000': ['Operating expenses', 'expense'],
    '5100': ['Payroll expense', 'expense'], '2300': ['Customer advances', 'liability'],
    '1200': ['TDS receivable', 'asset'], '2400': ['GST output payable', 'liability'],
    '2500': ['TDS payable', 'liability'], '2510': ['Provident fund payable', 'liability'],
    '2520': ['Professional tax payable', 'liability'],
  };
  const resolved = [];
  let debit = 0n; let credit = 0n;
  for (const [code, dr, cr] of lines) {
    const [name, type] = codes[code];
    const account = await Account.findOneAndUpdate({ code }, { $setOnInsert: { name, type, normalBalance: ['asset', 'expense'].includes(type) ? 'debit' : 'credit' } }, { upsert: true, new: true, session });
    if (!account.isActive || account.type !== type) fail(409, `Account ${code} must be active and of type ${type}`);
    debit += BigInt(dr); credit += BigInt(cr);
    // Auto-posted lines carry the source document's dimensions, so departmental
    // reports can read the line without walking back to the entry.
    if (dr || cr) resolved.push({
      account: account._id,
      debit: money.decimal(dr),
      credit: money.decimal(cr),
      departmentId: dimensions.departmentId || null,
      projectId: dimensions.projectId || null,
      client: dimensions.client || null,
      costCenterId: dimensions.costCenterId || null,
    });
  }
  if (debit !== credit || debit <= 0n) fail(422, 'Journal must balance and have a positive amount');
  const [entry] = await Journal.create([{ ...pick(dimensions, ['departmentId', 'client', 'vendor', 'costCenterId']), entryNumber: `AUTO-${source}`, sourceKey: source, memo, entryDate, lines: resolved, totalDebit: money.decimal(debit), totalCredit: money.decimal(credit), status: 'posted', postedAt: new Date(), createdBy: actor(req) }], { session });
  return entry;
}
async function finalize(req, inv, session) {
  if (!head(req.user)) fail(403, 'Finance Head permission required to issue invoices');
  await openPeriod(inv.financialPeriodId, session);
  if (!inv.items.length || !inv.clientName || !inv.dueDate) fail(422, 'Customer, line items and due date are required');
  if (inv.invoiceType !== 'customer') fail(422, 'Use the vendor ledger for supplier bills');
  // Re-validate rates against the rules effective on the issue date at the moment of issue.
  const amounts = await taxedAmounts(inv.items, inv.discount, inv.tdsRate, undefined, inv.issueDate, session);
  Object.assign(inv, amounts, { balanceDue: amounts.receivable });
  const total = positive(inv.total); const gst = money.minor(inv.gstAmount); const tds = money.minor(inv.tdsAmount);
  const entry = await journal(req, `invoice-${inv._id}`, [['1100', total - tds, 0], ['1200', tds, 0], ['4000', 0, total - gst], ['2400', 0, gst]], session, inv.issueDate, inv.invoiceNumber, inv);
  inv.journalEntryId = entry._id;
  inv.status = 'sent';
  inv.status = invoiceStatus(inv);
}
async function createInvoice(req) {
  return transaction(async session => {
    const b = req.body || {};
    const issueDate = b.issueDate ? date(b.issueDate) : new Date();
    const amounts = await taxedAmounts(b.items, b.discount, b.tdsRate, b.gstRate, issueDate, session);
    if (!amounts.totalMinor) fail(422, 'Invoice total must be positive');
    if (b.amountPaid && money.minor(b.amountPaid)) fail(422, 'Record payments separately');
    if (b.status && !['draft', 'sent'].includes(b.status)) fail(422, 'New invoices must be draft or issued');
    const payload = pick(b, ['client', 'clientName', 'clientEmail', 'clientPhone', 'departmentId', 'costCenterId', 'financialPeriodId', 'terms', 'notes']);
    if (payload.client) id(payload.client);
    const dueDate = b.dueDate ? date(b.dueDate) : null;
    if (dueDate && dueDate < new Date(issueDate.toISOString().slice(0, 10))) fail(422, 'Due date cannot precede issue date');
    await openPeriod(b.financialPeriodId, session);
    const inv = new Invoice({ ...payload, ...amounts, invoiceNumber: text(b.invoiceNumber, 100) || `INV-${crypto.randomUUID()}`, currency: 'INR', issueDate, dueDate, amountPaid: 0, balanceDue: amounts.receivable, status: 'draft', createdBy: actor(req) });
    if (b.status === 'sent') await finalize(req, inv, session);
    await inv.save({ session });
    await audit(req, 'invoice_created', inv, null, inv.toObject(), session);
    return inv;
  });
}
async function updateInvoice(req) {
  return transaction(async session => {
    const inv = await Invoice.findById(id(req.params.id)).session(session);
    if (!inv) fail(404, 'Invoice not found');
    if (inv.status !== 'draft') fail(409, 'Issued invoices are immutable; use a credit or debit note');
    if (inv.review?.status === 'submitted' && !head(req.user)) fail(409, 'Invoice is under review');
    const b = req.body || {};
    if (['amountPaid', 'balanceDue', 'total', 'subtotal', 'gstAmount', 'tdsAmount', 'taxTotal', 'journalEntryId', 'review', 'createdBy'].some(k => b[k] !== undefined)) fail(422, 'Calculated and audit fields cannot be edited');
    if (b.status && !['draft', 'sent', 'void'].includes(b.status)) fail(422, 'Use payments to settle an invoice');
    const before = inv.toObject();
    Object.assign(inv, pick(b, ['client', 'clientName', 'clientEmail', 'clientPhone', 'invoiceNumber', 'departmentId', 'costCenterId', 'terms', 'notes']));
    if (b.issueDate) inv.issueDate = date(b.issueDate);
    if (b.dueDate) inv.dueDate = date(b.dueDate);
    if (inv.dueDate && inv.dueDate < new Date(inv.issueDate.toISOString().slice(0, 10))) fail(422, 'Due date cannot precede issue date');
    const amounts = await taxedAmounts(b.items || inv.items, b.discount ?? inv.discount, b.tdsRate ?? inv.tdsRate, b.gstRate, inv.issueDate, session);
    Object.assign(inv, amounts, { balanceDue: amounts.receivable });
    await openPeriod(inv.financialPeriodId, session);
    if (b.status === 'sent') await finalize(req, inv, session);
    if (b.status === 'void') { if (!head(req.user)) fail(403, 'Finance Head required'); inv.status = 'void'; }
    await inv.save({ session }); await audit(req, 'invoice_updated', inv, before, inv.toObject(), session); return inv;
  });
}
async function note(req) {
  return transaction(async session => {
    const inv = await Invoice.findById(id(req.params.id)).session(session);
    if (!inv) fail(404, 'Invoice not found');
    if (['draft', 'void'].includes(inv.status)) fail(409, 'Notes require an issued invoice');
    await openPeriod(inv.financialPeriodId, session);
    const b = req.body; const n = positive(b.amount);
    if (!['credit', 'debit'].includes(b.type) || !text(b.reason)) fail(422, 'Note type and reason are required');
    if (b.type === 'credit' && n > money.minor(inv.balanceDue)) fail(409, 'Credit exceeds the outstanding balance');
    const key = text(b.reference || b.idempotencyKey, 120);
    if (!key) fail(422, 'A unique note reference is required');
    const before = inv.toObject();
    // A note is tax-inclusive; its GST share follows the invoice's GST-to-total ratio.
    const invTotal = BigInt(money.minor(inv.total));
    const g = invTotal ? money.roundedProduct(BigInt(n), BigInt(money.minor(inv.gstAmount)), invTotal) : 0n;
    const [record] = await Note.create([{ invoice: inv._id, type: b.type, amount: money.decimal(n), gstAmount: money.decimal(g), reason: text(b.reason), reference: key, createdBy: actor(req) }], { session });
    const sign = b.type === 'credit' ? -1n : 1n;
    const total = invTotal + sign * BigInt(n);
    inv.total = money.decimal(total);
    inv.gstAmount = money.decimal(BigInt(money.minor(inv.gstAmount)) + sign * g);
    inv.taxTotal = inv.gstAmount;
    inv.balanceDue = money.decimal(total - BigInt(money.minor(inv.tdsAmount)) - BigInt(money.minor(inv.amountPaid)));
    inv.status = invoiceStatus(inv); await inv.save({ session });
    const net = n - Number(g); const gn = Number(g);
    await journal(req, `note-${record._id}`, b.type === 'credit' ? [['4000', net, 0], ['2400', gn, 0], ['1100', 0, n]] : [['1100', n, 0], ['4000', 0, net], ['2400', 0, gn]], session, new Date(), text(b.reason), inv);
    await audit(req, `invoice_${b.type}_note`, inv, before, inv.toObject(), session); return record;
  });
}
async function createPayment(req) {
  return transaction(async session => {
    const b = req.body || {}; const amount = positive(b.amount);
    if (b.direction === 'out' || b.vendor) fail(422, 'Use the vendor ledger for vendor payments');
    if (b.status && b.status !== 'recorded') fail(422, 'New payments must be recorded');
    const reference = text(b.reference || b.idempotencyKey, 120);
    if (!reference) fail(422, 'A unique payment reference is required');
    if (!['cash', 'bank', 'online'].includes(b.method || 'bank')) fail(422, 'Invalid payment method');
    await openPeriod(b.financialPeriodId, session);
    const allocations = b.allocations || (b.invoice ? [{ invoice: b.invoice, amount: b.amount }] : []);
    if (!Array.isArray(allocations) || allocations.length > 100) fail(422, 'Invalid allocations');
    const seen = new Set(); let allocated = 0n; let customer = b.client ? String(id(b.client)) : ''; let name = text(b.customerName);
    const normalized = [];
    const paymentId = new mongoose.Types.ObjectId();
    for (const a of allocations) {
      const invoiceId = String(id(a.invoice));
      if (seen.has(invoiceId)) fail(422, 'Invoice appears twice in allocation'); seen.add(invoiceId);
      const n = positive(a.amount); allocated += BigInt(n);
      if (allocated > BigInt(amount)) fail(422, 'Allocations exceed payment amount');
      const inv = await Invoice.findById(invoiceId).session(session);
      if (!inv || (req.projectId && String(inv.projectId) !== String(req.projectId))) fail(404, 'Invoice not found');
      if (['draft', 'void'].includes(inv.status) || inv.invoiceType !== 'customer') fail(409, 'Only issued customer invoices can receive payments');
      await openPeriod(inv.financialPeriodId, session);
      const owner = String(inv.client || inv.clientName);
      if (customer && owner !== customer) fail(422, 'All allocations must belong to the same customer'); customer = owner; name = inv.clientName;
      if (n > money.minor(inv.balanceDue)) fail(409, 'Payment exceeds invoice balance');
      const before = inv.toObject();
      inv.amountPaid = money.decimal(BigInt(money.minor(inv.amountPaid)) + BigInt(n));
      inv.balanceDue = money.decimal(BigInt(money.minor(inv.balanceDue)) - BigInt(n));
      inv.paymentId = paymentId; inv.status = invoiceStatus(inv); await inv.save({ session });
      await audit(req, 'payment_allocated', inv, before, inv.toObject(), session);
      normalized.push({ invoice: inv._id, amountMinor: n });
    }
    if (!name) fail(422, 'Customer is required');
    const [p] = await Payment.create([{ _id: paymentId, invoice: normalized.length === 1 ? normalized[0].invoice : undefined, client: b.client || undefined, customerName: name, amount: money.decimal(amount), amountMinor: amount, allocations: normalized, direction: 'in', status: 'recorded', reference, method: b.method || 'bank', paymentDate: b.paymentDate ? date(b.paymentDate) : new Date(), financialPeriodId: b.financialPeriodId || null, departmentId: b.departmentId || null, projectId: req.projectId || null, notes: text(b.notes), createdBy: actor(req) }], { session });
    await journal(req, `payment-${p._id}`, [['1000', amount, 0], ['1100', 0, Number(allocated)], ['2300', 0, Number(BigInt(amount) - allocated)]], session, p.paymentDate, reference, p);
    await audit(req, 'payment_recorded', p, null, p.toObject(), session); return p;
  });
}
async function updatePayment(req) {
  return transaction(async session => {
    const p = await Payment.findById(id(req.params.id)).session(session);
    if (!p || (req.projectId && String(p.projectId) !== String(req.projectId))) fail(404, 'Payment not found');
    const b = req.body || {};
    if (Object.keys(b).some(k => !['status', 'failureReason', 'bankTransactionId'].includes(k))) fail(422, 'Recorded payment fields are immutable');
    if (p.direction === 'out') fail(409, 'Use the vendor ledger for vendor payments');
    if (!['recorded', 'reconciled'].includes(p.status)) fail(409, 'Payment has already been reversed');
    await openPeriod(p.financialPeriodId, session);
    const before = p.toObject();
    if (b.status === 'reconciled') {
      if (p.status === 'reconciled') return p;
      const bank = await BankTransaction.findById(id(b.bankTransactionId)).session(session);
      if (!bank || bank.payment) fail(409, 'Select an unmatched bank transaction');
      if (bank.direction !== 'in' || bank.amountMinor !== money.minor(p.amount)) fail(422, 'Bank transaction direction and amount must match');
      bank.payment = p._id; bank.matchedBy = actor(req); bank.matchedAt = new Date(); await bank.save({ session }); p.status = 'reconciled';
    } else if (['failed', 'cancelled'].includes(b.status)) {
      if (!text(b.failureReason)) fail(422, 'A reversal reason is required');
      const allocations = p.allocations?.length ? p.allocations : p.invoice ? [{ invoice: p.invoice, amountMinor: money.minor(p.amount) }] : [];
      let allocated = 0n;
      for (const a of allocations) {
        const inv = await Invoice.findById(a.invoice).session(session);
        if (!inv) fail(409, 'Allocated invoice is missing'); await openPeriod(inv.financialPeriodId, session);
        const n = BigInt(a.amountMinor); allocated += n;
        const beforeInvoice = inv.toObject();
        inv.amountPaid = money.decimal(BigInt(money.minor(inv.amountPaid)) - n);
        inv.balanceDue = money.decimal(BigInt(money.minor(inv.balanceDue)) + n);
        inv.status = invoiceStatus(inv); await inv.save({ session });
        await audit(req, 'payment_allocation_reversed', inv, beforeInvoice, inv.toObject(), session);
      }
      const amount = money.minor(p.amount);
      await journal(req, `reversal-${p._id}`, [['1000', 0, amount], ['1100', Number(allocated), 0], ['2300', Number(BigInt(amount) - allocated), 0]], session, new Date(), text(b.failureReason), p);
      await BankTransaction.updateOne({ payment: p._id }, { $set: { payment: null, matchedBy: null, matchedAt: null } }, { session });
      p.status = b.status; p.failureReason = text(b.failureReason);
    } else fail(422, 'Use reconciliation or a controlled reversal');
    await p.save({ session }); await audit(req, 'payment_updated', p, before, p.toObject(), session); return p;
  });
}
const handler = (fn, status = 200) => async (req, res) => {
  try { return res.status(status).json({ success: true, data: await fn(req) }); }
  catch (e) {
    const code = e.statusCode || (e.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(e.name) ? 422 : 500);
    // An unexpected failure is a bug: keep the stack server-side, return a generic message.
    if (code === 500) (req.log || console).error({ err: e, path: req.originalUrl || req.path }, 'finance operation failed');
    return res.status(code).json({ success: false, code: `FINANCE_${code}`, error: code === 500 ? 'Financial operation failed; no partial transaction was committed' : e.message });
  }
};
module.exports = { amountOf, createInvoice, updateInvoice, createPayment, updatePayment, note, finalize, invoiceStatus, transaction, audit, openPeriod, journal, fail, head, actor, text, id, date, positive, pick, handler, money };
