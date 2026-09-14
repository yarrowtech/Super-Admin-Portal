const mongoose = require('mongoose');

const complianceAttachmentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { _id: false }
);

const complianceSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null },
    type: {
      type: String,
      enum: ['gst', 'tds', 'statutory', 'audit', 'other'],
      required: true
    },
    periodLabel: { type: String, trim: true },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'filed', 'overdue'],
      default: 'pending'
    },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    attachments: { type: [complianceAttachmentSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

complianceSchema.index({ type: 1, status: 1 });
complianceSchema.index({ projectId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.models.FinanceCompliance || mongoose.model('FinanceCompliance', complianceSchema);
