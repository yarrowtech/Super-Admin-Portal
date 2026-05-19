const mongoose = require('mongoose');

const LAW_SECTIONS = [
  'dashboard',
  'agreements',
  'privacy-policy',
  'disputes-fraud',
  'ip-copyright',
  'work-hire',
  'third-party',
  'alerts',
  'ai-insights',
  'documents',
  'contracts',
  'compliance',
  'cases',
  'risk-advisory',
  'policy-review',
  'ip-management',
  'reporting'
];

const LAW_STATUSES = ['Draft', 'Pending', 'In Review', 'Active', 'Ready', 'Attention', 'Archived'];
const LAW_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const lawSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: LAW_SECTIONS,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: LAW_STATUSES,
      default: 'Draft',
      index: true
    },
    priority: {
      type: String,
      enum: LAW_PRIORITIES,
      default: 'Medium',
      index: true
    },
    owner: {
      type: String,
      trim: true,
      default: ''
    },
    dueDate: {
      type: Date
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

lawSchema.index({ section: 1, createdAt: -1 });
lawSchema.index({ section: 1, projectId: 1, createdAt: -1 });
lawSchema.index({ title: 'text', description: 'text', notes: 'text', referenceNumber: 'text' });

module.exports = mongoose.models.Law || mongoose.model('Law', lawSchema);
