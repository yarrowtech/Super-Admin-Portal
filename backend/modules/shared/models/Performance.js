// backend/models/Performance.js
const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    reviewPeriod: {
      startDate: {
        type: Date,
        required: [true, 'Review start date is required']
      },
      endDate: {
        type: Date,
        required: [true, 'Review end date is required']
      }
    },
    reviewType: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'annual', 'probation'],
      required: [true, 'Review type is required']
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required']
    },
    ratings: {
      technical: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      teamwork: {
        type: Number,
        min: 1,
        max: 5
      },
      problemSolving: {
        type: Number,
        min: 1,
        max: 5
      },
      leadership: {
        type: Number,
        min: 1,
        max: 5
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5
      },
      overall: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    achievements: [{
      type: String,
      trim: true
    }],
    areasOfImprovement: [{
      type: String,
      trim: true
    }],
    goals: [{
      description: String,
      deadline: Date,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'overdue'],
        default: 'pending'
      }
    }],
    comments: {
      type: String,
      trim: true
    },
    employeeComments: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'acknowledged', 'finalized'],
      default: 'draft'
    },
    submittedDate: {
      type: Date
    },
    acknowledgedDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Calculate overall rating if not provided
performanceSchema.pre('save', function (next) {
  if (this.ratings && !this.ratings.overall) {
    const { technical, communication, teamwork, problemSolving, leadership, punctuality } = this.ratings;
    const ratings = [technical, communication, teamwork, problemSolving, leadership, punctuality].filter(r => r);
    if (ratings.length > 0) {
      this.ratings.overall = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
    }
  }
  next();
});

// Indexes for better query performance
performanceSchema.index({ employee: 1, 'reviewPeriod.endDate': -1 });
performanceSchema.index({ reviewer: 1 });
performanceSchema.index({ reviewType: 1 });
performanceSchema.index({ status: 1 });

const Performance = mongoose.model('Performance', performanceSchema);

module.exports = Performance;
