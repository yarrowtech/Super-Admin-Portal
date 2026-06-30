const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String, trim: true },
    commentedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    complainant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    againstPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      default: 'other',
      enum: ['workplace-harassment', 'work-environment', 'policy-violation', 'discrimination', 'payroll', 'leave', 'other'],
      index: true,
    },
    priority: {
      type: String,
      default: 'medium',
      enum: ['low', 'medium', 'high', 'urgent'],
      index: true,
    },
    status: {
      type: String,
      default: 'pending-review',
      enum: ['pending-review', 'investigating', 'resolved', 'escalated', 'closed'],
      index: true,
    },
    solution: { type: String, trim: true },
    actionTaken: { type: String, trim: true },
    resolvedDate: { type: Date },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    comments: [commentSchema],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
