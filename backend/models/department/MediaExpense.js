const mongoose = require('mongoose');

const mediaExpenseSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    platform: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'general' },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mediaExpenseSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.models.MediaExpense || mongoose.model('MediaExpense', mediaExpenseSchema);
