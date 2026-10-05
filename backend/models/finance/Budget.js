const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    // @deprecated legacy free-text department — kept for backward compatibility during migration.
    // New code must read/write `departmentId`; this stays dual-written for now.
    department: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    fiscalYear: { type: String, required: true, trim: true },
    financialPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceFinancialPeriod', index: true, default: null },
    allocated: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    utilization: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'active', 'closed', 'on-track', 'at-risk', 'over'],
      default: 'on-track'
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

budgetSchema.index({ department: 1, fiscalYear: 1 }, { unique: false });
budgetSchema.index({ projectId: 1, fiscalYear: 1 });

budgetSchema.add({ costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter' }, alertThreshold: { type: Number, min: 1, max: 100, default: 85 } });

// A budget belongs to one scope: a department's running cost, or a project's cost to deliver.
// `scope` is what tells the two apart, so a project budget is never double-counted inside the
// departmental total that funds it.
budgetSchema.add({
  scope: { type: String, enum: ['department', 'project'], default: 'department', index: true },
  // Allocation split by cost behaviour. `allocated` stays the single source of truth for the
  // total; these two are how that total was planned and must sum to it.
  allocatedFixed: { type: Number, default: 0, min: 0 },
  allocatedVariable: { type: Number, default: 0, min: 0 },
});

budgetSchema.index({ scope: 1, projectId: 1, fiscalYear: 1 });

// Every change to `allocated` is appended here with a reason, so a budget increase is
// explainable after the fact rather than an unexplained larger number.
budgetSchema.add({
  adjustments: {
    type: [{
      delta: { type: Number, required: true },
      allocatedAfter: { type: Number, required: true },
      reason: { type: String, required: true, trim: true, maxlength: 500 },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      actorName: { type: String, default: '' },
      at: { type: Date, default: Date.now },
    }],
    default: [],
  },
  // Highest alert level already raised, so one crossing does not notify repeatedly.
  alertedAt: { type: Number, default: 0 },
});

// ── Planning ────────────────────────────────────────────────────────────────
// An annual total alone cannot answer "are we overspending *now*", because six months of
// spend against a twelve-month budget looks fine at 50% whether the plan was linear or not.
// Phasing spreads the plan across the year so variance is measured against the plan to date.
budgetSchema.add({
  phasing: {
    type: [{
      // 1–12 for a calendar/fiscal month index; the label is what the UI shows.
      period: { type: Number, required: true, min: 1, max: 12 },
      label: { type: String, trim: true, default: '' },
      fixed: { type: Number, default: 0, min: 0 },
      variable: { type: Number, default: 0, min: 0 },
    }],
    default: [],
  },
  // How the phasing was produced, so the UI can offer to re-spread without losing a
  // hand-built profile: 'even' divides equally, 'manual' was entered period by period.
  phasingMethod: { type: String, enum: ['none', 'even', 'manual'], default: 'none' },
});

// ── Baseline and revisions ──────────────────────────────────────────────────
// The baseline is the plan as approved. Later changes are revisions measured against it, so
// "we are on budget" cannot be achieved by quietly re-planning to match the spend.
budgetSchema.add({
  baseline: {
    allocated: { type: Number, default: 0 },
    fixed: { type: Number, default: 0 },
    variable: { type: Number, default: 0 },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, default: '' },
  },
  // Bumped on every allocation change after the baseline is set.
  revision: { type: Number, default: 0 },
});

// ── Cost control ────────────────────────────────────────────────────────────
// `control` decides what happens when a cost would exceed the remaining budget.
//   hard  — refuse it (the existing behaviour, and the default)
//   soft  — allow it but flag the budget as breached, for budgets that must not block work
// `tolerancePct` permits a small controlled overrun before either rule applies.
budgetSchema.add({
  control: { type: String, enum: ['hard', 'soft'], default: 'hard' },
  tolerancePct: { type: Number, min: 0, max: 50, default: 0 },
  breachedAt: { type: Date, default: null },
});

budgetSchema.index({ departmentId: 1, fiscalYear: 1, costCenterId: 1, financialPeriodId: 1 }, { unique: true, partialFilterExpression: { departmentId: { $type: 'objectId' } } });

module.exports = mongoose.models['FinanceBudget'] || mongoose.model('FinanceBudget', budgetSchema);
