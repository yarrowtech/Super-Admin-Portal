const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingContract', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingJob', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    logDate: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    workSummary: { type: String, trim: true, default: '' },
    deliverableUrl: { type: String, trim: true, default: '' },
    workStatus: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress'
    },
    note: { type: String, trim: true, default: '' },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

timeLogSchema.index({ freelancer: 1, logDate: -1 });
timeLogSchema.index({ contract: 1, verificationStatus: 1 });

module.exports = mongoose.models.OutsourcingTimeLog || mongoose.model('OutsourcingTimeLog', timeLogSchema);
