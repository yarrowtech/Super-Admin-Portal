const mongoose = require('mongoose');

const CHECKLIST_TYPES = ['Website', 'SEO', 'Landing Page', 'CRM', 'Pixel', 'Ads', 'Email', 'WhatsApp', 'Reports'];

const checklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
  },
  { _id: true }
);

const projectChecklistSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    checklistType: { type: String, enum: CHECKLIST_TYPES, required: true },
    items: { type: [checklistItemSchema], default: [] },
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

projectChecklistSchema.pre('save', function computeCompletion(next) {
  this.completionPercent = this.items.length
    ? Math.round((this.items.filter((item) => item.done).length / this.items.length) * 100)
    : 0;
  next();
});

projectChecklistSchema.index({ projectId: 1, checklistType: 1 }, { unique: true });

module.exports = mongoose.models.ProjectChecklist || mongoose.model('ProjectChecklist', projectChecklistSchema);
module.exports.CHECKLIST_TYPES = CHECKLIST_TYPES;
