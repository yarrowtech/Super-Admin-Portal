const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'Contract', 'Agreement', 'Policy', 'NDA',
  'Compliance', 'IP', 'Dispute', 'Other'
];
const DOCUMENT_STATUSES = ['Draft', 'Pending', 'Approved', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const legalDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TYPES, default: 'Other', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    projectName: { type: String, trim: true, default: '' },
    owner: { type: String, trim: true, default: '' },

    // Content
    latestContent: { type: String, default: '' },
    currentVersion: { type: String, default: 'v1.0' },
    versionMajor: { type: Number, default: 1 },
    versionMinor: { type: Number, default: 0 },

    // Workflow
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'Draft', index: true },
    isLocked: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },

    // People
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdByName: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String, default: '' },

    // CEO feedback
    ceoRemarks: { type: String, default: '' },

    // Timeline
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },

    // Meta
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

legalDocumentSchema.index({ status: 1, createdAt: -1 });
legalDocumentSchema.index({ status: 1, projectId: 1, createdAt: -1 });
legalDocumentSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
legalDocumentSchema.index({ isPublished: 1, type: 1, createdAt: -1 });
legalDocumentSchema.index({ title: 'text' });

module.exports = mongoose.models.LegalDocument || mongoose.model('LegalDocument', legalDocumentSchema);
