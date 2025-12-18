// backend/models/Applicant.js
const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    resumeUrl: {
      type: String,
      trim: true
    },
    coverLetter: {
      type: String,
      trim: true
    },
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative']
    },
    education: {
      type: String,
      trim: true
    },
    skills: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['pending', 'screening', 'interview', 'offered', 'hired', 'rejected'],
      default: 'pending'
    },
    appliedDate: {
      type: Date,
      default: Date.now
    },
    interviewDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    },
    salary: {
      expected: {
        type: Number,
        min: 0
      },
      offered: {
        type: Number,
        min: 0
      }
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
applicantSchema.index({ email: 1 });
applicantSchema.index({ status: 1 });
applicantSchema.index({ position: 1 });
applicantSchema.index({ appliedDate: -1 });

const Applicant = mongoose.model('Applicant', applicantSchema);

module.exports = Applicant;
