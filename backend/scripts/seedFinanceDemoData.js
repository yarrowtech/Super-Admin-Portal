require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Department = require('../models/department/Department');
const User = require('../models/auth/User');
const FinancialPeriod = require('../models/finance/FinancialPeriod');
const Budget = require('../models/finance/Budget');
const Expense = require('../models/finance/Expense');
const Invoice = require('../models/finance/Invoice');
const Payment = require('../models/finance/Payment');
const Client = require('../models/finance/Client');
const Vendor = require('../models/finance/Vendor');

// Populates the Finance module with realistic demo records (budgets, expenses,
// invoices, payments, clients, vendors) across real Department docs, so the
// Finance dashboard/portal shows genuine non-zero data instead of an empty DB.
// Idempotent: skips department/fiscal-year combos that already have a budget.
//
// Usage:
//   node backend/scripts/seedFinanceDemoData.js            (dry run — prints what it would do)
//   node backend/scripts/seedFinanceDemoData.js --apply    (writes to the DB)

const APPLY = process.argv.includes('--apply');

const buildCurrentFiscalYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  return { startYear, endYear, fiscalYear: `FY${startYear}-${String(endYear).slice(-2)}` };
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

const EXPENSE_CATEGORIES = ['travel', 'software', 'office supplies', 'utilities', 'professional services', 'marketing'];
const EXPENSE_STATUSES = ['submitted', 'pending', 'under_review', 'verified', 'approved', 'completed'];

const run = async () => {
  await connectDB();
  const fy = buildCurrentFiscalYear();
  const report = { mode: APPLY ? 'apply' : 'dry-run', fiscalYear: fy.fiscalYear, departments: [], clients: null, vendors: null, invoices: null, payments: null };

  const [departments, financeManager, financeEmployee, period] = await Promise.all([
    // Excludes the synthetic UNASSIGNED bucket — only real operating departments get demo budgets.
    Department.find({ isActive: true, isSystem: { $ne: true } }).sort({ sortOrder: 1, name: 1 }).lean(),
    User.findOne({ role: 'finance_manager' }).select('_id').lean(),
    User.findOne({ role: 'finance_employee' }).select('_id').lean(),
    FinancialPeriod.findOne({ fiscalYear: fy.fiscalYear, periodType: 'annual' }).select('_id').lean(),
  ]);

  if (!departments.length) {
    console.log('No active departments found — run department seeding first.');
    return;
  }

  const createdByUser = financeManager?._id || financeEmployee?._id || null;
  const allExpenseDocs = [];
  const allBudgetDocs = [];

  for (const dept of departments) {
    const existingBudget = await Budget.findOne({ departmentId: dept._id, fiscalYear: fy.fiscalYear }).lean();
    if (existingBudget) {
      report.departments.push({ department: dept.name, action: 'skipped-existing-budget', budgetId: existingBudget._id });
      continue;
    }

    const allocated = rand(300000, 2500000);
    const expenseCount = rand(3, 7);
    let spent = 0;
    const deptExpenses = [];
    for (let i = 0; i < expenseCount; i += 1) {
      const amount = rand(5000, 150000);
      const status = EXPENSE_STATUSES[rand(0, EXPENSE_STATUSES.length - 1)];
      if (['completed', 'approved'].includes(status)) spent += amount;
      deptExpenses.push({
        title: `${dept.name} ${EXPENSE_CATEGORIES[rand(0, EXPENSE_CATEGORIES.length - 1)]} expense #${i + 1}`,
        category: EXPENSE_CATEGORIES[rand(0, EXPENSE_CATEGORIES.length - 1)],
        amount,
        status,
        department: dept.name,
        departmentId: dept._id,
        financialPeriodId: period?._id || null,
        incurredDate: daysAgo(rand(1, 60)),
        submittedBy: financeEmployee?._id || createdByUser,
        notes: 'Seeded demo expense for finance dashboard testing.',
        statusHistory: [{ from: '', to: status, action: 'submit', comment: 'Seeded', actorRole: 'finance_employee', at: daysAgo(rand(1, 60)) }],
      });
    }

    report.departments.push({
      department: dept.name,
      action: APPLY ? 'created' : 'would-create',
      allocated,
      spentEstimate: spent,
      expenseCount,
    });

    if (APPLY) {
      const budget = await Budget.create({
        department: dept.name,
        departmentId: dept._id,
        fiscalYear: fy.fiscalYear,
        financialPeriodId: period?._id || null,
        allocated,
        spent,
        status: spent / allocated > 1 ? 'over' : spent / allocated >= 0.85 ? 'at-risk' : 'on-track',
        notes: 'Seeded demo budget for finance dashboard testing.',
        createdBy: createdByUser,
      });
      allBudgetDocs.push(budget);
      const created = await Expense.insertMany(deptExpenses.map((e) => ({ ...e, budgetId: budget._id, budgetReservedAt: new Date() })));
      allExpenseDocs.push(...created);
    }
  }

  // Clients + invoices (receivables) tied to real departments.
  const clientNames = ['Nimbus Retail Pvt Ltd', 'Solace Healthcare Group', 'Vertex Manufacturing Co', 'BrightPath Logistics'];
  const clientDocs = [];
  for (const name of clientNames) {
    const existing = await Client.findOne({ name }).lean();
    if (existing) { clientDocs.push(existing); continue; }
    if (APPLY) {
      const client = await Client.create({ name, contactEmail: `${name.split(' ')[0].toLowerCase()}@example.com`, paymentTerms: 'Net 30', balance: 0 });
      clientDocs.push(client);
    } else {
      clientDocs.push({ _id: null, name });
    }
  }
  report.clients = { count: clientDocs.length, names: clientNames };

  const invoiceDocs = [];
  if (APPLY) {
    for (let i = 0; i < 8; i += 1) {
      const dept = departments[rand(0, departments.length - 1)];
      const client = clientDocs[rand(0, clientDocs.length - 1)];
      const qty = rand(1, 5);
      const rate = rand(5000, 60000);
      const amount = qty * rate;
      const gstRate = 18;
      const gstAmount = (amount * gstRate) / 100;
      const total = amount + gstAmount;
      const paid = rand(0, 1) ? total : rand(0, 100) < 50 ? Math.round(total * 0.5) : 0;
      const balanceDue = total - paid;
      const status = balanceDue <= 0 ? 'paid' : rand(0, 1) ? 'sent' : 'overdue';
      const invoiceNumber = `INV-${fy.startYear}${String(rand(1, 12)).padStart(2, '0')}-${1000 + i}`;
      const invoice = await Invoice.create({
        invoiceNumber,
        invoiceType: 'customer',
        client: client._id,
        clientName: client.name,
        status,
        issueDate: daysAgo(rand(5, 45)),
        dueDate: status === 'overdue' ? daysAgo(rand(1, 20)) : daysFromNow(rand(5, 30)),
        gstRate,
        gstAmount,
        items: [{ description: `${dept.name} services`, quantity: qty, rate, amount, taxRate: gstRate, taxAmount: gstAmount }],
        subtotal: amount,
        taxTotal: gstAmount,
        total,
        amountPaid: paid,
        balanceDue,
        department: dept.name,
        departmentId: dept._id,
        createdBy: createdByUser,
      });
      invoiceDocs.push(invoice);
    }
  }
  report.invoices = { count: APPLY ? invoiceDocs.length : 8 };

  // Payments — a mix of reconciled and pending, some tied to invoices.
  const paymentDocs = [];
  if (APPLY) {
    for (let i = 0; i < 6; i += 1) {
      const dept = departments[rand(0, departments.length - 1)];
      const linkedInvoice = invoiceDocs.length && rand(0, 1) ? invoiceDocs[rand(0, invoiceDocs.length - 1)] : null;
      const amount = linkedInvoice ? Math.min(linkedInvoice.amountPaid || rand(5000, 80000), linkedInvoice.total) || rand(5000, 80000) : rand(5000, 80000);
      const status = rand(0, 1) ? 'reconciled' : ['recorded', 'processing', 'scheduled'][rand(0, 2)];
      const payment = await Payment.create({
        departmentId: dept._id,
        invoice: linkedInvoice?._id || null,
        customerName: linkedInvoice?.clientName || 'Vendor settlement',
        amount,
        method: ['bank', 'online', 'cash'][rand(0, 2)],
        status,
        paymentDate: daysAgo(rand(1, 30)),
        reference: `PAYREF-${Date.now()}-${i}`,
        notes: 'Seeded demo payment for finance dashboard testing.',
        createdBy: createdByUser,
      });
      paymentDocs.push(payment);
    }
  }
  report.payments = { count: APPLY ? paymentDocs.length : 6 };

  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to write this data.');
  }
};

run()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());
