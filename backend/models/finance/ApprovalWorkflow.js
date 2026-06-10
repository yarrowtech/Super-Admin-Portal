const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    role: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    remarks: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const approvalWorkflowSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    steps: { type: [stepSchema], default: [] },
  },
  { timestamps: true }
);

approvalWorkflowSchema.index({ module: 1, entityType: 1, entityId: 1 });
approvalWorkflowSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.FinanceApprovalWorkflow || mongoose.model('FinanceApprovalWorkflow', approvalWorkflowSchema);
