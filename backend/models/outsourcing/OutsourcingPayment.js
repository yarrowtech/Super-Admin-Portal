const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingContract', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingJob', required: true },
    milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'OutsourcingMilestone', default: null },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    provider: { type: String, default: 'razorpay', trim: true },
    paymentType: {
      type: String,
      enum: ['escrow_fund', 'freelancer_release'],
      required: true
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'approved', 'released'],
      default: 'created'
    },
    providerOrderId: { type: String, trim: true, default: null },
    providerPaymentId: { type: String, trim: true, default: null },
    providerSignature: { type: String, trim: true, default: null },
    approvedByAdmin: { type: Boolean, default: false },
    lawValidated: { type: Boolean, default: false },
    blockedReason: { type: String, trim: true, default: '' },
    approvedAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

paymentSchema.index({ contract: 1, paymentType: 1, status: 1 });
paymentSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.models.OutsourcingPayment || mongoose.model('OutsourcingPayment', paymentSchema);
