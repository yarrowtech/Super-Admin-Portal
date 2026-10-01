'use strict';
const S = require('../../services/finance/operations.service');
const W = require('../../services/finance/workflows.service');
const Journal = require('../../models/finance/JournalEntry');
const Invoice = require('../../models/finance/Invoice');
const Expense = require('../../models/finance/Expense');
const Payroll = require('../../models/finance/Payroll');
const Payment = require('../../models/finance/Payment');
const Budget = require('../../models/finance/Budget');
const { money, fail, id, date, head, actor } = S;
// Reads tolerate legacy float/negative amounts; see S.amountOf.
const amt = S.amountOf;
const signed = W.signed;
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function filter(req, dateField) {
  const q = req.query || {}; const f = {};
  if (q.from || q.to) { f[dateField] = {}; if (q.from) f[dateField].$gte = date(q.from); if (q.to) { const end = date(q.to); end.setUTCHours(23, 59, 59, 999); f[dateField].$lte = end; } if (f[dateField].$gte && f[dateField].$lte && f[dateField].$gte > f[dateField].$lte) fail(422, 'Date range is reversed'); }
  for (const key of ['departmentId', 'client', 'vendor', 'costCenterId']) if (q[key]) f[key] = id(q[key]);
  return f;
}
async function statement(req) {
  const map = new Map();
  for await (const entry of Journal.find({ status: 'posted', ...filter(req, 'entryDate') }).populate('lines.account', 'code name type').lean().cursor()) {
    for (const line of entry.lines) {
      const a = line.account; if (!a) fail(409, 'Posted journal references a missing account');
      const key = String(a._id); const row = map.get(key) || { accountId: key, code: a.code, name: a.name, type: a.type, debit: 0n, credit: 0n };
      row.debit += BigInt(amt(line.debit)); row.credit += BigInt(amt(line.credit)); map.set(key, row);
    }
  }
  let debit = 0n; let credit = 0n; let revenue = 0n; let expenses = 0n; let assets = 0n; let liabilities = 0n; let equity = 0n; let cash = 0n;
  for (const r of map.values()) {
    debit += r.debit; credit += r.credit;
    if (r.type === 'revenue') revenue += r.credit - r.debit;
    if (r.type === 'expense') expenses += r.debit - r.credit;
    if (r.type === 'asset') assets += r.debit - r.credit;
    if (r.type === 'liability') liabilities += r.credit - r.debit;
    if (r.type === 'equity') equity += r.credit - r.debit;
    if (r.code === '1000') cash += r.debit - r.credit;
  }
  const rows = [...map.values()].sort((a, b) => a.code.localeCompare(b.code)).map(r => ({ ...r, debit: signed(r.debit), credit: signed(r.credit) }));
  return { basis: 'Accrual; posted balanced journals only. Revenue = revenue credits minus debits. Expenses = expense debits minus credits. Net income = revenue minus expenses. Balance sheet includes current earnings in equity. Date filters show period movements; omit from for a closing balance.', rows, totals: { debit: signed(debit), credit: signed(credit) }, revenue: signed(revenue), expenses: signed(expenses), netIncome: signed(revenue - expenses), assets: signed(assets), liabilities: signed(liabilities), equity: signed(equity + revenue - expenses), cash: signed(cash), balanced: debit === credit };
}
async function financialSummary(req) {
  const s = await statement(req);
  let receivables = 0n; let overdue = 0n; let overdueCount = 0;
  for await (const inv of Invoice.find({ status: { $nin: ['draft', 'void'] }, invoiceType: 'customer', ...filter(req, 'issueDate') }).lean().cursor()) { const n = BigInt(amt(inv.balanceDue)); receivables += n; if (S.invoiceStatus(inv) === 'overdue') { overdue += n; overdueCount++; } }
  let inflows = 0n; let outflows = 0n;
  for await (const p of Payment.find({ status: { $in: ['recorded', 'reconciled', 'completed'] }, ...filter(req, 'paymentDate') }).lean().cursor()) { const n = BigInt(amt(p.amount)); if (p.direction === 'out') outflows += n; else inflows += n; }
  let payrollPayable = 0n;
  for await (const p of Payroll.find({ status: 'processed', ...filter(req, 'periodStart') }).lean().cursor()) payrollPayable += BigInt(amt(p.netPay));
  const expenseSummary = [];
  const categories = new Map();
  for await (const e of Expense.find({ status: { $in: ['approved', 'processing', 'completed', 'paid'] }, ...filter(req, 'incurredDate') }).lean().cursor()) categories.set(e.category || 'Uncategorized', (categories.get(e.category || 'Uncategorized') || 0n) + BigInt(amt(e.amount)));
  for (const [category, n] of categories) expenseSummary.push({ category, amount: signed(n) });
  let allocated = 0n; let used = 0n;
  const bFilter = {}; if (req.query.departmentId) bFilter.departmentId = id(req.query.departmentId); if (req.query.costCenterId) bFilter.costCenterId = id(req.query.costCenterId);
  for await (const b of Budget.find(bFilter).cursor()) { const snapshot = await W.budgetSnapshot(b, null); allocated += BigInt(amt(b.allocated)); used += BigInt(amt(snapshot.spent)) + BigInt(amt(snapshot.reserved)); }
  return { ...s, receivables: signed(receivables), overdue: signed(overdue), overdueCount, inflows: signed(inflows), outflows: signed(outflows), netCashFlow: signed(inflows - outflows), payrollPayable: head(req.user) || req.user.role === 'hr' ? signed(payrollPayable) : null, budgetAllocated: signed(allocated), budgetCommittedAndSpent: signed(used), expenseSummary, taxStatus: 'GST/TDS computed from configured effective-dated tax rules; statutory filing integrations are not connected.' };
}
async function pdf(res, title, rows) {
  const browser = await require('puppeteer').launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setRequestInterception(true); page.on('request', r => r.abort());
    await page.setContent(`<html><head><meta charset="utf-8"><style>body{font:13px Arial;padding:24px;color:#18263b}h1{font-size:24px}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #ddd;padding:9px;white-space:pre-wrap}td:first-child{font-weight:bold}</style></head><body><h1>${escape(title)}</h1><table>${rows.map(r => `<tr>${r.map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`);
    const buffer = await page.pdf({ format: 'A4', printBackground: true }); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'attachment; filename="finance-document.pdf"'); res.setHeader('Cache-Control', 'private, no-store'); return res.send(Buffer.from(buffer));
  } finally { await browser.close(); }
}
const documentExport = async (req, res) => {
  try {
    if (req.params.kind === 'invoice') {
      const inv = await Invoice.findById(id(req.params.id)).lean(); if (!inv) fail(404, 'Invoice not found');
      return await pdf(res, `Invoice ${inv.invoiceNumber}`, [['Customer', inv.clientName], ['Status', S.invoiceStatus(inv)], ['Issued', inv.issueDate?.toISOString().slice(0, 10)], ['Due', inv.dueDate?.toISOString().slice(0, 10)], ...inv.items.map(i => [i.description, `${i.quantity} x ${i.rate} = ${i.amount}`]), ['Discount', inv.discount], ['Adjusted total', inv.total], ['Paid', inv.amountPaid], ['Outstanding', inv.balanceDue], ['Currency', inv.currency], ['Terms', inv.terms]]);
    }
    if (req.params.kind === 'payslip') {
      const p = await Payroll.findById(id(req.params.id)).lean(); if (!p) fail(404, 'Payroll not found');
      if (!head(req.user) && req.user.role !== 'hr' && String(p.employee) !== String(actor(req))) fail(403, 'Payslip access denied');
      if (p.status === 'draft') fail(409, 'Payslip is available after payroll approval');
      const s = p.statutory || {};
      const snapshot = p.salarySnapshot || {};
      const rupees = (minorValue) => (Number(minorValue || 0) / 100).toFixed(2);
      return await pdf(res, p.payslipNumber || 'Payslip', [
        ['Employee', p.employeeName],
        ['Period', p.periodKey || p.periodStart.toISOString().slice(0, 7)],
        ['Basic pay', rupees(snapshot.baseMinor)],
        ['Allowances', rupees(snapshot.allowanceMinor)],
        ['Gross earnings', p.grossPay],
        // Each withholding is itemised so the employee can see what was deducted and why.
        ['Provident fund (employee)', s.pf || 0],
        ['Professional tax', s.professionalTax || 0],
        ['TDS', s.tds || 0],
        ['Other deductions', s.other || 0],
        ['Total deductions', p.deductions],
        ['Net payable', p.netPay],
        ['Status', p.status],
        ['Paid on', p.paidOn ? p.paidOn.toISOString().slice(0, 10) : 'Not yet disbursed'],
      ]);
    }
    fail(404, 'Document type not found');
  } catch (e) { return res.status(e.statusCode || 500).json({ success: false, error: e.statusCode ? e.message : 'PDF generation failed' }); }
};
const reportExport = async (req, res) => {
  try {
    const summary = await financialSummary(req);
    const rows = [['Accounting basis', summary.basis], ['Revenue', summary.revenue], ['Expenses', summary.expenses], ['Net income', summary.netIncome], ['Cash inflows', summary.inflows], ['Cash outflows', summary.outflows], ['Net cash flow', summary.netCashFlow], ['Receivables', summary.receivables], ['Overdue', summary.overdue], ['Payroll payable', summary.payrollPayable ?? 'Restricted'], ['Tax status', summary.taxStatus], [], ['Account', 'Name', 'Debit', 'Credit'], ...summary.rows.map(r => [r.code, r.name, r.debit, r.credit]), [], ['Expense category', 'Approved expenditure'], ...summary.expenseSummary.map(r => [r.category, r.amount])];
    if (req.query.format === 'pdf') return await pdf(res, 'Financial report', rows);
    const csv = rows.map(row => row.map(v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="finance-report.csv"'); res.setHeader('Cache-Control', 'private, no-store'); return res.send(csv);
  } catch (e) { return res.status(e.statusCode || 500).json({ success: false, error: e.statusCode ? e.message : 'Report export failed' }); }
};
const getTaxSummary = S.handler(async req => {
  let sales = 0n; let gst = 0n; let tds = 0n;
  for await (const inv of Invoice.find({ status: { $nin: ['draft', 'void'] }, ...filter(req, 'issueDate') }).lean().cursor()) { sales += BigInt(amt(inv.subtotal)); gst += BigInt(amt(inv.gstAmount)); tds += BigInt(amt(inv.tdsAmount)); }
  return { taxableSales: signed(sales), gstCollected: signed(gst), tdsWithheld: signed(tds), status: 'Computed from issued invoices using configured tax rules' };
});
module.exports = { statement, financialSummary, summary: S.handler(financialSummary), getTrialBalance: S.handler(statement), getBalanceSheet: S.handler(statement), getProfitLoss: S.handler(statement), getTaxSummary, getItrSummary: S.handler(async req => { const s = await statement(req); return { totalIncome: s.revenue, totalExpenses: s.expenses, taxableIncome: null, estimatedTax: null, status: 'Not calculated: jurisdiction and tax rules require confirmation' }; }), documentExport, reportExport };
