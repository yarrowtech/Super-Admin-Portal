const mongoose = require('mongoose');

const CAMPAIGN_STATUSES = [
  'draft',
  'objective-defined',
  'platform-selected',
  'budget-allocated',
  'team-assigned',
  'content-in-progress',
  'in-approval',
  'scheduled',
  'live',
  'tracking',
  'closed',
];

const RUNNING_CAMPAIGN_STATUSES = ['live', 'tracking'];

const campaignTeamMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const lifecycleHistorySchema = new mongoose.Schema(
  {
    stage: { type: String, enum: CAMPAIGN_STATUSES, required: true },
    enteredAt: { type: Date, default: Date.now },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    projectName: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true, index: true },
    objective: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    platform: { type: [String], default: [] },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },
    budgetAllocated: { type: Number, default: 0, min: 0 },
    teamMembers: { type: [campaignTeamMemberSchema], default: [] },
    startDate: { type: Date },
    endDate: { type: Date },
    kpiTargets: { type: mongoose.Schema.Types.Mixed, default: {} },
    lifecycleHistory: { type: [lifecycleHistorySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

campaignSchema.index({ projectId: 1, createdAt: -1 });
campaignSchema.index({ name: 'text', objective: 'text', description: 'text' });

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
module.exports.CAMPAIGN_STATUSES = CAMPAIGN_STATUSES;
module.exports.RUNNING_CAMPAIGN_STATUSES = RUNNING_CAMPAIGN_STATUSES;
