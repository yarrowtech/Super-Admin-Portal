const mongoose = require('mongoose');

const objectiveSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'in-progress', 'done'], default: 'pending' },
  },
  { _id: true }
);

const weeklyPlanSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    objectives: { type: [objectiveSchema], default: [] },
    generatedReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingReport' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

weeklyPlanSchema.virtual('progress').get(function computeProgress() {
  if (!this.objectives.length) return 0;
  const done = this.objectives.filter((o) => o.status === 'done').length;
  return Math.round((done / this.objectives.length) * 100);
});

weeklyPlanSchema.set('toJSON', { virtuals: true });
weeklyPlanSchema.set('toObject', { virtuals: true });
weeklyPlanSchema.index({ projectId: 1, weekStart: -1 });

module.exports = mongoose.models.WeeklyPlan || mongoose.model('WeeklyPlan', weeklyPlanSchema);
