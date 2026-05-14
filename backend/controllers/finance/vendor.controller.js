const Invoice = require('../../models/finance/Invoice');
const InvoiceNote = require('../../models/finance/Invoice');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const Budget = require('../../models/finance/Budget');
const CostCenter = require('../../models/finance/Budget');
const Payroll = require('../../models/finance/Payroll');
const FinancialReport = require('../../models/finance/Compliance');
const ComplianceRecord = require('../../models/finance/Compliance');
const Vendor = require('../../models/finance/Vendor');
const Client = require('../../models/finance/Vendor');
const Account = require('../../models/finance/Payment');
const JournalEntry = require('../../models/finance/Payment');

const buildInvoiceNumber = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${stamp}-${rand}`;
};

const buildEntryNumber = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `JE-${stamp}-${rand}`;
};

const normalizeInvoiceItems = (items = []) => {
  const sanitized = Array.isArray(items) ? items : [];
  return sanitized.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const amount = Number(item.amount) || quantity * rate;
    const taxRate = Number(item.taxRate) || 0;
    const taxAmount = Number(item.taxAmount) || (amount * taxRate) / 100;
    return {
      description: item.description,
      quantity,
      rate,
      amount,
      taxRate,
      taxAmount
    };
  });
};

const calculateInvoiceTotals = (items, discount = 0, gstRate = 0, tdsRate = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxTotal = items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
  const safeDiscount = Number(discount) || 0;
  const safeGstRate = Number(gstRate) || 0;
  const safeTdsRate = Number(tdsRate) || 0;
  const gstAmount = safeGstRate ? (subtotal * safeGstRate) / 100 : taxTotal;
  const tdsAmount = safeTdsRate ? (subtotal * safeTdsRate) / 100 : 0;
  const total = subtotal + gstAmount - tdsAmount - safeDiscount;
  return { subtotal, taxTotal, gstAmount, tdsAmount, discount: safeDiscount, total };
};

const deriveBudgetStatus = (allocated, spent) => {
  const safeAllocated = Number(allocated) || 0;
  const safeSpent = Number(spent) || 0;
  if (!safeAllocated) return { utilization: 0, status: 'on-track' };
  const utilization = (safeSpent / safeAllocated) * 100;
  if (utilization > 100) return { utilization, status: 'over' };
  if (utilization >= 85) return { utilization, status: 'at-risk' };
  return { utilization, status: 'on-track' };
};

const sendError = (res, err, fallback) => {
  res.status(500).json({
    success: false,
    error: fallback,
    details: err.message
  });
};

const normalizeJournalLines = (lines = []) => {
  const sanitized = Array.isArray(lines) ? lines : [];
  return sanitized.map((line) => ({
    account: line.account,
    description: line.description,
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0
  }));
};

const calculateJournalTotals = (lines = []) => {
  return lines.reduce(
    (acc, line) => {
      acc.totalDebit += Number(line.debit) || 0;
      acc.totalCredit += Number(line.credit) || 0;
      return acc;
    },
    { totalDebit: 0, totalCredit: 0 }
  );
};

const fetchPostedLines = async () => {
  const entries = await JournalEntry.find({ status: 'posted' }).populate(
    'lines.account',
    'code name type normalBalance'
  );
  const lines = [];
  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (line.account) {
        lines.push({ ...line.toObject(), account: line.account.toObject() });
      }
    });
  });
  return lines;
};

/**
 * Dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const [
      invoiceCount,
      overdueInvoices,
      paymentCount,
      pendingExpenses,
      budgetCount,
      payrollCount,
      accountCount,
      journalCount
    ] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'overdue' }),
      Payment.countDocuments(),
      Expense.countDocuments({ status: 'submitted' }),
      Budget.countDocuments(),
      Payroll.countDocuments(),
      Account.countDocuments(),
      JournalEntry.countDocuments()
    ]);

    const recentInvoices = await Invoice.find().sort({ createdAt: -1 }).limit(5);
    const recentPayments = await Payment.find().sort({ paymentDate: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        totals: {
          invoices: invoiceCount,
          overdueInvoices,
          payments: paymentCount,
          pendingExpenses,
          budgets: budgetCount,
          payrolls: payrollCount,
          accounts: accountCount,
          journalEntries: journalCount
        },
        recentInvoices,
        recentPayments
      }
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch finance dashboard');
  }
};

/**
 * Chart of Accounts
 */
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().sort({ code: 1 });
    res.status(200).json({ success: true, data: accounts });
  } catch (err) {
    sendError(res, err, 'Failed to fetch accounts');
  }
};

exports.createAccount = async (req, res) => {
  try {
    const account = await Account.create(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    sendError(res, err, 'Failed to create account');
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: account });
  } catch (err) {
    sendError(res, err, 'Failed to update account');
  }
};

/**
 * Journal Entries
 */
exports.getJournalEntries = async (req, res) => {
  try {
    const entries = await JournalEntry.find().sort({ entryDate: -1 }).populate('lines.account', 'code name');
    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    sendError(res, err, 'Failed to fetch journal entries');
  }
};

exports.createJournalEntry = async (req, res) => {
  try {
    const payload = req.body || {};
    const lines = normalizeJournalLines(payload.lines);
    const totals = calculateJournalTotals(lines);
    const entryNumber = payload.entryNumber || buildEntryNumber();
    const entry = await JournalEntry.create({
      ...payload,
      entryNumber,
      lines,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    sendError(res, err, 'Failed to create journal entry');
  }
};

exports.updateJournalEntry = async (req, res) => {
  try {
    const payload = req.body || {};
    if (payload.lines) {
      const lines = normalizeJournalLines(payload.lines);
      const totals = calculateJournalTotals(lines);
      payload.lines = lines;
      payload.totalDebit = totals.totalDebit;
      payload.totalCredit = totals.totalCredit;
    }
    const entry = await JournalEntry.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    sendError(res, err, 'Failed to update journal entry');
  }
};

exports.postJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    entry.status = 'posted';
    entry.postedAt = new Date();
    await entry.save();
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    sendError(res, err, 'Failed to post journal entry');
  }
};

/**
 * ERP Reports
 */
exports.getTrialBalance = async (req, res) => {
  try {
    const lines = await fetchPostedLines();
    const accountMap = {};
    lines.forEach((line) => {
      const account = line.account;
      const key = account._id.toString();
      if (!accountMap[key]) {
        accountMap[key] = {
          accountId: key,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: 0,
          credit: 0
        };
      }
      accountMap[key].debit += Number(line.debit) || 0;
      accountMap[key].credit += Number(line.credit) || 0;
    });
    const rows = Object.values(accountMap).sort((a, b) => a.code.localeCompare(b.code));
    const totals = rows.reduce(
      (acc, row) => {
        acc.debit += row.debit;
        acc.credit += row.credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
    res.status(200).json({ success: true, data: { rows, totals } });
  } catch (err) {
    sendError(res, err, 'Failed to generate trial balance');
  }
};

exports.getBalanceSheet = async (req, res) => {
  try {
    const lines = await fetchPostedLines();
    const totals = {
      assets: 0,
      liabilities: 0,
      equity: 0
    };
    lines.forEach((line) => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const type = line.account.type;
      if (type === 'asset') {
        totals.assets += debit - credit;
      } else if (type === 'liability') {
        totals.liabilities += credit - debit;
      } else if (type === 'equity') {
        totals.equity += credit - debit;
      }
    });
    res.status(200).json({ success: true, data: totals });
  } catch (err) {
    sendError(res, err, 'Failed to generate balance sheet');
  }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const lines = await fetchPostedLines();
    let revenue = 0;
    let expenses = 0;
    lines.forEach((line) => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (line.account.type === 'revenue') {
        revenue += credit - debit;
      }
      if (line.account.type === 'expense') {
        expenses += debit - credit;
      }
    });
    res.status(200).json({
      success: true,
      data: {
        revenue,
        expenses,
        netIncome: revenue - expenses
      }
    });
  } catch (err) {
    sendError(res, err, 'Failed to generate profit and loss');
  }
};

exports.getTaxSummary = async (req, res) => {
  try {
    const invoices = await Invoice.find({ status: { $ne: 'void' } });
    const totals = invoices.reduce(
      (acc, invoice) => {
        acc.taxableSales += Number(invoice.subtotal || 0);
        acc.gstCollected += Number(invoice.gstAmount || 0);
        acc.tdsWithheld += Number(invoice.tdsAmount || 0);
        return acc;
      },
      { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 }
    );
    res.status(200).json({ success: true, data: totals });
  } catch (err) {
    sendError(res, err, 'Failed to generate tax summary');
  }
};

exports.getItrSummary = async (req, res) => {
  try {
    const [invoices, expenses] = await Promise.all([
      Invoice.find({ status: { $ne: 'void' } }),
      Expense.find()
    ]);
    const totalIncome = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const taxableIncome = totalIncome - totalExpenses;
    const estimatedTax = taxableIncome > 0 ? taxableIncome * 0.25 : 0;
    res.status(200).json({
      success: true,
      data: { totalIncome, totalExpenses, taxableIncome, estimatedTax }
    });
  } catch (err) {
    sendError(res, err, 'Failed to generate ITR summary');
  }
};

/**
 * Invoices
 */
exports.getInvoices = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { clientName: new RegExp(search, 'i') }
      ];
    }
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (err) {
    sendError(res, err, 'Failed to fetch invoices');
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const payload = req.body || {};
  const items = normalizeInvoiceItems(payload.items);
    const totals = calculateInvoiceTotals(items, payload.discount, payload.gstRate, payload.tdsRate);
    const invoiceNumber = payload.invoiceNumber || buildInvoiceNumber();
    const amountPaid = Number(payload.amountPaid) || 0;
    const balanceDue = totals.total - amountPaid;
    const invoice = await Invoice.create({
      ...payload,
      invoiceNumber,
      items,
      ...totals,
      amountPaid,
      balanceDue,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    sendError(res, err, 'Failed to create invoice');
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const payload = req.body || {};
    const existing = await Invoice.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const shouldRecalculate =
      payload.items || payload.gstRate !== undefined || payload.tdsRate !== undefined || payload.discount !== undefined;
    if (shouldRecalculate) {
      const items = payload.items ? normalizeInvoiceItems(payload.items) : existing.items || [];
      const totals = calculateInvoiceTotals(
        items,
        payload.discount !== undefined ? payload.discount : existing.discount,
        payload.gstRate !== undefined ? payload.gstRate : existing.gstRate,
        payload.tdsRate !== undefined ? payload.tdsRate : existing.tdsRate
      );
      if (payload.items) {
        payload.items = items;
      }
      payload.subtotal = totals.subtotal;
      payload.taxTotal = totals.taxTotal;
      payload.gstAmount = totals.gstAmount;
      payload.tdsAmount = totals.tdsAmount;
      payload.discount = totals.discount;
      payload.total = totals.total;
      const amountPaid = payload.amountPaid !== undefined ? Number(payload.amountPaid) || 0 : Number(existing.amountPaid) || 0;
      payload.amountPaid = amountPaid;
      payload.balanceDue = totals.total - amountPaid;
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    sendError(res, err, 'Failed to update invoice');
  }
};

exports.createInvoiceNote = async (req, res) => {
  try {
    const payload = req.body || {};
    const note = await InvoiceNote.create({
      ...payload,
      invoice: req.params.id,
      createdBy: req.user?.id
    });

    const invoice = await Invoice.findById(req.params.id);
    if (invoice) {
      const amount = Number(note.amount) || 0;
      const adjustment = note.type === 'credit' ? -amount : amount;
      invoice.total = (Number(invoice.total) || 0) + adjustment;
      invoice.balanceDue = invoice.total - (Number(invoice.amountPaid) || 0);
      await invoice.save();
    }

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    sendError(res, err, 'Failed to create invoice note');
  }
};

exports.getInvoiceNotes = async (req, res) => {
  try {
    const query = {};
    if (req.query.invoiceId) {
      query.invoice = req.query.invoiceId;
    }
    const notes = await InvoiceNote.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    sendError(res, err, 'Failed to fetch invoice notes');
  }
};

/**
 * Payments
 */
exports.getPayments = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const payments = await Payment.find(query).sort({ paymentDate: -1 });
    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    sendError(res, err, 'Failed to fetch payments');
  }
};

exports.createPayment = async (req, res) => {
  try {
    const payload = req.body || {};
    const payment = await Payment.create({
      ...payload,
      createdBy: req.user?.id
    });

    if (payment.invoice) {
      const invoice = await Invoice.findById(payment.invoice);
      if (invoice) {
        invoice.amountPaid = (Number(invoice.amountPaid) || 0) + (Number(payment.amount) || 0);
        invoice.balanceDue = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);
        if (invoice.balanceDue <= 0) {
          invoice.status = 'paid';
          invoice.balanceDue = 0;
        } else if (invoice.dueDate && invoice.dueDate < new Date()) {
          invoice.status = 'overdue';
        } else if (invoice.status === 'draft') {
          invoice.status = 'sent';
        }
        await invoice.save();
      }
    }

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    sendError(res, err, 'Failed to record payment');
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    sendError(res, err, 'Failed to update payment');
  }
};

/**
 * Expenses
 */
exports.getExpenses = async (req, res) => {
  try {
    const { status, department } = req.query;
    const query = {};
    if (status) query.status = status;
    if (department) query.department = department;
    const expenses = await Expense.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: expenses });
  } catch (err) {
    sendError(res, err, 'Failed to fetch expenses');
  }
};

exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      submittedBy: req.user?.id
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    sendError(res, err, 'Failed to create expense');
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.status === 'verified') {
      payload.verifiedBy = req.user?.id;
    }
    const expense = await Expense.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    sendError(res, err, 'Failed to update expense');
  }
};

/**
 * Budgets
 */
exports.getBudgets = async (req, res) => {
  try {
    const { department, fiscalYear } = req.query;
    const query = {};
    if (department) query.department = department;
    if (fiscalYear) query.fiscalYear = fiscalYear;
    const budgets = await Budget.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: budgets });
  } catch (err) {
    sendError(res, err, 'Failed to fetch budgets');
  }
};

exports.createBudget = async (req, res) => {
  try {
    const payload = req.body || {};
    const { utilization, status } = deriveBudgetStatus(payload.allocated, payload.spent);
    const budget = await Budget.create({
      ...payload,
      utilization,
      status,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    sendError(res, err, 'Failed to create budget');
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const payload = req.body || {};
    if (payload.allocated !== undefined || payload.spent !== undefined) {
      const existing = await Budget.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Budget not found' });
      }
      const allocated = payload.allocated !== undefined ? payload.allocated : existing.allocated;
      const spent = payload.spent !== undefined ? payload.spent : existing.spent;
      const { utilization, status } = deriveBudgetStatus(allocated, spent);
      payload.utilization = utilization;
      payload.status = status;
    }
    const budget = await Budget.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    sendError(res, err, 'Failed to update budget');
  }
};

/**
 * Cost Centers
 */
exports.getCostCenters = async (req, res) => {
  try {
    const costCenters = await CostCenter.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: costCenters });
  } catch (err) {
    sendError(res, err, 'Failed to fetch cost centers');
  }
};

exports.createCostCenter = async (req, res) => {
  try {
    const costCenter = await CostCenter.create(req.body);
    res.status(201).json({ success: true, data: costCenter });
  } catch (err) {
    sendError(res, err, 'Failed to create cost center');
  }
};

exports.updateCostCenter = async (req, res) => {
  try {
    const costCenter = await CostCenter.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: costCenter });
  } catch (err) {
    sendError(res, err, 'Failed to update cost center');
  }
};

/**
 * Payroll
 */
exports.getPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payrolls });
  } catch (err) {
    sendError(res, err, 'Failed to fetch payrolls');
  }
};

exports.createPayroll = async (req, res) => {
  try {
    const payload = req.body || {};
    const grossPay = Number(payload.grossPay) || 0;
    const deductions = Number(payload.deductions) || 0;
    const netPay = payload.netPay !== undefined ? Number(payload.netPay) : grossPay - deductions;
    const payroll = await Payroll.create({
      ...payload,
      grossPay,
      deductions,
      netPay
    });
    res.status(201).json({ success: true, data: payroll });
  } catch (err) {
    sendError(res, err, 'Failed to create payroll record');
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: payroll });
  } catch (err) {
    sendError(res, err, 'Failed to update payroll record');
  }
};

/**
 * Reports
 */
exports.getReports = async (req, res) => {
  try {
    const reports = await FinancialReport.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    sendError(res, err, 'Failed to fetch reports');
  }
};

exports.createReport = async (req, res) => {
  try {
    const report = await FinancialReport.create({
      ...req.body,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    sendError(res, err, 'Failed to create report');
  }
};

/**
 * Compliance
 */
exports.getCompliance = async (req, res) => {
  try {
    const records = await ComplianceRecord.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (err) {
    sendError(res, err, 'Failed to fetch compliance records');
  }
};

exports.createCompliance = async (req, res) => {
  try {
    const record = await ComplianceRecord.create({
      ...req.body,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    sendError(res, err, 'Failed to create compliance record');
  }
};

exports.updateCompliance = async (req, res) => {
  try {
    const record = await ComplianceRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    sendError(res, err, 'Failed to update compliance record');
  }
};

/**
 * Vendors
 */
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: vendors });
  } catch (err) {
    sendError(res, err, 'Failed to fetch vendors');
  }
};

exports.createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    sendError(res, err, 'Failed to create vendor');
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    sendError(res, err, 'Failed to update vendor');
  }
};

/**
 * Clients
 */
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: clients });
  } catch (err) {
    sendError(res, err, 'Failed to fetch clients');
  }
};

exports.createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    sendError(res, err, 'Failed to create client');
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    sendError(res, err, 'Failed to update client');
  }
};
