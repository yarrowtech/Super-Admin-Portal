require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Department = require('../models/department/Department');
const Budget = require('../models/finance/Budget');
const CostCenter = require('../models/finance/CostCenter');
const Expense = require('../models/finance/Expense');

const APPLY = process.argv.includes('--apply');

// Reconciles every department representation found across the codebase (FINANCE_DEPARTMENTS,
// ROLE_DEPARTMENT, User.department, etc.) into one canonical set of Department documents.
const CANONICAL_SEED = [
  { name: 'Information Technology', code: 'IT', sortOrder: 10 },
  { name: 'Human Resources', code: 'HR', sortOrder: 20 },
  { name: 'Media', code: 'MEDIA', sortOrder: 30 },
  { name: 'Law', code: 'LAW', sortOrder: 40 },
  { name: 'Executive', code: 'EXECUTIVE', sortOrder: 50 },
  { name: 'Outsourcing', code: 'OUTSOURCING', sortOrder: 60 },
  { name: 'Finance', code: 'FINANCE', sortOrder: 70 },
  { name: 'Administration', code: 'ADMIN', sortOrder: 80 },
  { name: 'Sales', code: 'SALES', sortOrder: 90 },
  {
    name: 'Unassigned',
    code: 'UNASSIGNED',
    sortOrder: 999,
    isSystem: true,
    description: 'Legacy/untagged records that could not be matched to a canonical department.',
  },
];

// Legacy free-text department string (lowercased) -> canonical code.
const MAPPING = {
  it: 'IT',
  hr: 'HR',
  'human resources': 'HR',
  media: 'MEDIA',
  law: 'LAW',
  executive: 'EXECUTIVE',
  outsourcing: 'OUTSOURCING',
  finance: 'FINANCE',
  administration: 'ADMIN',
  sales: 'SALES',
  // Not mapped on purpose: 'general' (CostCenter's default), '', null -> falls through to UNASSIGNED.
};

const TARGET_MODELS = [Budget, CostCenter, Expense];

const run = async () => {
  await connectDB();

  const codeToId = new Map();
  const departmentReport = [];
  for (const seed of CANONICAL_SEED) {
    const existing = await Department.findOne({ code: seed.code });
    if (existing) {
      codeToId.set(seed.code, existing._id);
      departmentReport.push({ code: seed.code, action: 'exists', id: existing._id });
      continue;
    }
    if (APPLY) {
      const created = await Department.create(seed);
      codeToId.set(seed.code, created._id);
      departmentReport.push({ code: seed.code, action: 'created', id: created._id });
    } else {
      codeToId.set(seed.code, '<would-create>');
      departmentReport.push({ code: seed.code, action: 'would-create' });
    }
  }

  const collections = [];
  for (const Model of TARGET_MODELS) {
    const docs = await Model.find({ departmentId: null }).select('_id department').lean();
    const outcome = { model: Model.modelName, total: docs.length, matched: 0, unassigned: 0, samples: [] };
    for (const doc of docs) {
      const key = String(doc.department || '').trim().toLowerCase();
      const code = MAPPING[key] || 'UNASSIGNED';
      const targetId = codeToId.get(code);
      if (code === 'UNASSIGNED') outcome.unassigned += 1;
      else outcome.matched += 1;
      if (outcome.samples.length < 10) outcome.samples.push({ id: doc._id, from: doc.department, to: code });
      if (APPLY && typeof targetId !== 'string') {
        await Model.updateOne({ _id: doc._id }, { $set: { departmentId: targetId } });
      }
    }
    collections.push(outcome);
  }

  const report = { mode: APPLY ? 'apply' : 'dry-run', departments: departmentReport, collections };
  console.log(JSON.stringify(report, null, 2));
};

run()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());
