const mongoose = require('mongoose');

const frameworkRowSchema = new mongoose.Schema({
  phase: { type: String, trim: true, default: '' },
  whenUsed: { type: String, trim: true, default: '' },
  mainFocus: { type: [String], default: [] },
  keyOutput: { type: String, trim: true, default: '' },
}, { _id: false });

const channelPlanRowSchema = new mongoose.Schema({
  category: { type: String, trim: true, default: '' },
  channels: { type: [String], default: [] },
}, { _id: false });

const budgetPlanRowSchema = new mongoose.Schema({
  phase: { type: String, trim: true, default: '' },
  items: { type: [String], default: [] },
}, { _id: false });

const checklistItemSchema = new mongoose.Schema({
  task: { type: String, trim: true, default: '' },
  owner: { type: String, trim: true, default: '' },
  done: { type: Boolean, default: false },
}, { _id: false });

const weeklyUpdateRowSchema = new mongoose.Schema({
  week: { type: String, trim: true, default: '' },
  focusArea: { type: String, trim: true, default: '' },
  progress: { type: String, trim: true, default: '' },
}, { _id: false });

const acquisitionRowSchema = new mongoose.Schema({
  channel: { type: String, trim: true, default: '' },
  monthlyInvestment: { type: String, trim: true, default: '' },
  leadsEstimate: { type: String, trim: true, default: '' },
  cpl: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: '' },
}, { _id: false });

const funnelPerformanceRowSchema = new mongoose.Schema({
  stage: { type: String, trim: true, default: '' },
  target: { type: String, trim: true, default: '' },
  actual: { type: String, trim: true, default: '' },
  conversionPct: { type: String, trim: true, default: '' },
}, { _id: false });

const contentTrackerRowSchema = new mongoose.Schema({
  contentType: { type: String, trim: true, default: '' },
  target: { type: String, trim: true, default: '' },
  completed: { type: String, trim: true, default: '' },
}, { _id: false });

const deliverableItemSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: '' },
  done: { type: Boolean, default: false },
}, { _id: false });

const marketingPlanSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },

  overview: {
    industry: { type: String, trim: true, default: '' },
    platform: { type: String, trim: true, default: '' },
    targetAudience: { type: String, trim: true, default: '' },
    usp: { type: String, trim: true, default: '' },
    currentPhase: { type: String, trim: true, default: '' },
    overallStatus: { type: String, trim: true, default: 'On Track' },
  },

  goals: {
    brand: { type: [String], default: [] },
    marketing: { type: [String], default: [] },
    business: { type: [String], default: [] },
  },

  framework: { type: [frameworkRowSchema], default: [] },

  planning: {
    targetCustomers: { type: [String], default: [] },
    painPoints: { type: [String], default: [] },
    buyingTriggers: { type: [String], default: [] },
    positioning: { type: String, trim: true, default: '' },
    valueProposition: { type: String, trim: true, default: '' },
    channelPlan: { type: [channelPlanRowSchema], default: [] },
  },

  funnelStages: { type: [String], default: [] },

  kpiPlan: { type: [String], default: [] },

  budgetPlan: { type: [budgetPlanRowSchema], default: [] },

  // Page 2 — weekly execution tracking
  weeklyChecklist: { type: [checklistItemSchema], default: [] },
  weeklyUpdates: { type: [weeklyUpdateRowSchema], default: [] },
  acquisitionBudget: { type: [acquisitionRowSchema], default: [] },
  funnelPerformance: { type: [funnelPerformanceRowSchema], default: [] },
  contentTracker: { type: [contentTrackerRowSchema], default: [] },
  priorityMatrix: {
    high: { type: [String], default: [] },
    medium: { type: [String], default: [] },
    low: { type: [String], default: [] },
  },
  deliverables: { type: [deliverableItemSchema], default: [] },
  performanceSnapshot: {
    websiteVisits: { type: String, trim: true, default: '' },
    registrations: { type: String, trim: true, default: '' },
    vendorSignups: { type: String, trim: true, default: '' },
    bookings: { type: String, trim: true, default: '' },
    revenue: { type: String, trim: true, default: '' },
    roas: { type: String, trim: true, default: '' },
  },
  notes: {
    keyObservations: { type: String, trim: true, default: '' },
    challenges: { type: String, trim: true, default: '' },
    nextWeekFocus: { type: String, trim: true, default: '' },
    actionItems: { type: String, trim: true, default: '' },
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.models.MarketingPlan || mongoose.model('MarketingPlan', marketingPlanSchema);
