// backend/models/AppraisalReview.js
const mongoose = require('mongoose');

const appraisalReviewSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppraisalCycle',
      required: [true, 'Appraisal cycle is required']
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scores: {
      type: Object,
      default: {}
    },
    summary: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'finalized'],
      default: 'draft'
    }
  },
  { timestamps: true }
);

appraisalReviewSchema.index({ employee: 1 });
appraisalReviewSchema.index({ cycle: 1 });
appraisalReviewSchema.index({ status: 1 });

const AppraisalReview = mongoose.model('AppraisalReview', appraisalReviewSchema);

module.exports = AppraisalReview;
