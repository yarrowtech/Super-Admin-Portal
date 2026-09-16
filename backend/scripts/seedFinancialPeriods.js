require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const FinancialPeriod = require('../models/finance/FinancialPeriod');
const Budget = require('../models/finance/Budget');

const APPLY = process.argv.includes('--apply');

// India-style fiscal year: April 1 - March 31.
const buildCurrentFiscalYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  return {
    startYear,
    endYear,
    fiscalYear: `FY${startYear}-${String(endYear).slice(-2)}`,
    startDate: new Date(startYear, 3, 1),
    endDate: new Date(endYear, 2, 31, 23, 59, 59, 999),
  };
};

const buildQuarters = (fy) => ([
  { label: `Q1 ${fy.fiscalYear}`, startDate: new Date(fy.startYear, 3, 1), endDate: new Date(fy.startYear, 5, 30, 23, 59, 59, 999), order: 1 },
  { label: `Q2 ${fy.fiscalYear}`, startDate: new Date(fy.startYear, 6, 1), endDate: new Date(fy.startYear, 8, 30, 23, 59, 59, 999), order: 2 },
  { label: `Q3 ${fy.fiscalYear}`, startDate: new Date(fy.startYear, 9, 1), endDate: new Date(fy.startYear, 11, 31, 23, 59, 59, 999), order: 3 },
  { label: `Q4 ${fy.fiscalYear}`, startDate: new Date(fy.endYear, 0, 1), endDate: new Date(fy.endYear, 2, 31, 23, 59, 59, 999), order: 4 },
]);

const run = async () => {
  await connectDB();
  const fy = buildCurrentFiscalYear();
  const report = { mode: APPLY ? 'apply' : 'dry-run', fiscalYear: fy.fiscalYear, annual: null, quarters: [], budgetBackfill: null };

  let annual = await FinancialPeriod.findOne({ fiscalYear: fy.fiscalYear, periodType: 'annual' });
  if (!annual) {
    report.annual = { action: 'would-create', label: fy.fiscalYear };
    if (APPLY) {
      annual = await FinancialPeriod.create({
        fiscalYear: fy.fiscalYear,
        label: fy.fiscalYear,
        periodType: 'annual',
        startDate: fy.startDate,
        endDate: fy.endDate,
        isCurrent: true,
        order: 0,
      });
      report.annual = { action: 'created', id: annual._id };
    }
  } else {
    report.annual = { action: 'exists', id: annual._id };
  }

  for (const q of buildQuarters(fy)) {
    const existing = await FinancialPeriod.findOne({ fiscalYear: fy.fiscalYear, periodType: 'quarter', label: q.label });
    if (existing) {
      report.quarters.push({ label: q.label, action: 'exists', id: existing._id });
      continue;
    }
    if (APPLY && annual) {
      const created = await FinancialPeriod.create({
        fiscalYear: fy.fiscalYear,
        label: q.label,
        periodType: 'quarter',
        startDate: q.startDate,
        endDate: q.endDate,
        parentPeriod: annual._id,
        order: q.order,
      });
      report.quarters.push({ label: q.label, action: 'created', id: created._id });
    } else {
      report.quarters.push({ label: q.label, action: 'would-create' });
    }
  }

  // Backfill Budget.financialPeriodId by matching the legacy fiscalYear string's year substring.
  const budgets = await Budget.find({ financialPeriodId: null }).select('_id fiscalYear').lean();
  const yearMatch = String(fy.startYear);
  const outcome = { total: budgets.length, matched: 0, skipped: 0, samples: [] };
  for (const budget of budgets) {
    const matches = String(budget.fiscalYear || '').includes(yearMatch);
    if (outcome.samples.length < 10) outcome.samples.push({ id: budget._id, fiscalYear: budget.fiscalYear, matched: matches });
    if (!matches) { outcome.skipped += 1; continue; }
    outcome.matched += 1;
    if (APPLY && annual) {
      await Budget.updateOne({ _id: budget._id }, { $set: { financialPeriodId: annual._id } });
    }
  }
  report.budgetBackfill = outcome;

  console.log(JSON.stringify(report, null, 2));
};

run()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());
