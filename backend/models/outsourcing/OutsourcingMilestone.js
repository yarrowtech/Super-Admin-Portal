const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingJob', required: true, index: true },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingContract', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    dueDate: { type: Date, default: null },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected', 'paid'],
      default: 'pending'
    },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingPayment', default: null }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.OutsourcingMilestone || mongoose.model('OutsourcingMilestone', milestoneSchema);
