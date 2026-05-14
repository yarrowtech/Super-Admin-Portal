const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingJob', required: true, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentType: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'fixed'],
      required: true
    },
    rate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    escrowAmount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft'
    },
    lawStatus: {
      type: String,
      enum: ['pending', 'validated', 'rejected'],
      default: 'pending'
    },
    ndaSigned: { type: Boolean, default: false },
    agreementSigned: { type: Boolean, default: false },
    paymentTermsAccepted: { type: Boolean, default: false },
    signedAt: { type: Date, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    terms: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

contractSchema.index({ freelancer: 1, status: 1 });
contractSchema.index({ client: 1, status: 1 });

module.exports =
  mongoose.models.OutsourcingContract || mongoose.model('OutsourcingContract', contractSchema);
