const mongoose = require('mongoose');

const performanceSnapshotSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    periodType: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    taskMetrics: {
      assigned: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      delayed: { type: Number, default: 0 },
      review: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      deadlineSuccessRate: { type: Number, default: 0 },
      averageCompletionHours: { type: Number, default: 0 },
    },
    attendanceMetrics: {
      trackedDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      lateDays: { type: Number, default: 0 },
      leaveDays: { type: Number, default: 0 },
      averageWorkHours: { type: Number, default: 0 },
      consistencyScore: { type: Number, default: 0 },
    },
    workReportMetrics: {
      reportsSubmitted: { type: Number, default: 0 },
      reportConsistencyScore: { type: Number, default: 0 },
      totalReportedHours: { type: Number, default: 0 },
      approvedReports: { type: Number, default: 0 },
      rejectedReports: { type: Number, default: 0 },
    },
    scoreBreakdown: {
      taskExecution: { type: Number, default: 0 },
      quality: { type: Number, default: 0 },
      attendance: { type: Number, default: 0 },
      updates: { type: Number, default: 0 },
      collaboration: { type: Number, default: 0 },
      productivity: { type: Number, default: 0 },
    },
    autoScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    rating: {
      type: String,
      enum: ['Excellent', 'Good', 'Average', 'Needs Improvement', 'Critical Performance Alert'],
      default: 'Average',
      index: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

performanceSnapshotSchema.index(
  { employee: 1, periodType: 1, periodStart: 1, periodEnd: 1 },
  { unique: true, name: 'unique_performance_snapshot_period' }
);

module.exports =
  mongoose.models.PerformanceSystemSnapshot ||
  mongoose.model('PerformanceSystemSnapshot', performanceSnapshotSchema);
