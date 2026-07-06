const mongoose = require('mongoose');

const platformAllocationSchema = new mongoose.Schema(
  { platform: { type: String, trim: true, required: true }, amount: { type: Number, default: 0, min: 0 } },
  { _id: false }
);

const campaignAllocationSchema = new mongoose.Schema(
  { campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true }, amount: { type: Number, default: 0, min: 0 } },
  { _id: false }
);

const budgetAllocationSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    totalBudget: { type: Number, default: 0, min: 0 },
    platformAllocations: { type: [platformAllocationSchema], default: [] },
    campaignAllocations: { type: [campaignAllocationSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BudgetAllocation || mongoose.model('BudgetAllocation', budgetAllocationSchema);
