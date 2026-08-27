const mongoose = require('mongoose');

const appraisalReviewSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'AppraisalCycle', index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'submitted', 'completed'], default: 'pending', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AppraisalReview || mongoose.model('AppraisalReview', appraisalReviewSchema);
