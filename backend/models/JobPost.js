// backend/models/JobPost.js
const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time'
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'draft'
    },
    description: {
      type: String,
      trim: true
    },
    postedDate: {
      type: Date
    },
    closingDate: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

jobPostSchema.index({ department: 1 });
jobPostSchema.index({ status: 1 });
jobPostSchema.index({ postedDate: -1 });

const JobPost = mongoose.model('JobPost', jobPostSchema);

module.exports = JobPost;
