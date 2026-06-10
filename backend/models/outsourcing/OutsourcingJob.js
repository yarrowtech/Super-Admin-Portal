const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed'],
      default: 'pending'
    },
    acceptanceStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, trim: true, default: '' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    dueDate: { type: Date, default: null },
    budgetAmount: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, dueDate: 1 });
jobSchema.index({ assignedFreelancer: 1, status: 1 });

module.exports = mongoose.models.OutsourcingJob || mongoose.model('OutsourcingJob', jobSchema);
