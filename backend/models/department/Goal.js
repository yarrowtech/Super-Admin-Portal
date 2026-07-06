const mongoose = require('mongoose');

const GOAL_STATUSES = ['not-started', 'in-progress', 'achieved', 'missed'];

const goalSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    title: { type: String, required: true, trim: true },
    metric: { type: String, trim: true, default: '' },
    targetValue: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: GOAL_STATUSES, default: 'not-started', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

goalSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
module.exports.GOAL_STATUSES = GOAL_STATUSES;
