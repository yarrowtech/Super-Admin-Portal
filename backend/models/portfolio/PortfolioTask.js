const mongoose = require('mongoose');

// Execution tasks for a Category (spec §9). A task may optionally be attached to
// a specific Asset. Board columns map 1:1 to `status`. `order` is the position
// within a status column and is rewritten on every move so drag-and-drop
// persists (spec: "if drag persistence is not implemented, do not fake it" — it
// is implemented, via POST /tasks/:id/move).
const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'review', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const portfolioTaskSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioCategory', required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioGroup', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', default: null, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null, index: true },
    order: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

portfolioTaskSchema.index({ categoryId: 1, status: 1, order: 1 });

module.exports = mongoose.models.PortfolioTask || mongoose.model('PortfolioTask', portfolioTaskSchema);
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.TASK_PRIORITIES = TASK_PRIORITIES;
