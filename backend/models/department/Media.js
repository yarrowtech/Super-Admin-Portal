const mongoose = require('mongoose');

const MEDIA_SECTIONS = [
  'dashboard',
  'asset',
  'campaign',
  'content',
  'brand',
  'design',
  'video',
  'social',
  'advertisement',
  'seo',
  'website',
  'testimonial',
  'case-study',
  'approval',
  'report',
  'archive',
];

const MEDIA_STATUSES = ['Draft', 'Pending', 'In Review', 'Approved', 'Scheduled', 'Live', 'Published', 'Needs Revision', 'Rejected', 'Archived'];
const MEDIA_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const versionSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const approvalStepSchema = new mongoose.Schema(
  {
    role: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    optional: { type: Boolean, default: false },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    remarks: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const assignedEmployeeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    section: { type: String, enum: MEDIA_SECTIONS, default: 'dashboard', index: true },
    moduleType: { type: String, trim: true, default: 'asset', index: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: MEDIA_STATUSES, default: 'Draft', index: true },
    priority: { type: String, enum: MEDIA_PRIORITIES, default: 'Medium', index: true },

    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    projectName: { type: String, trim: true, default: '' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    departmentName: { type: String, trim: true, default: '' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    clientName: { type: String, trim: true, default: '' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    teamName: { type: String, trim: true, default: '' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    campaignName: { type: String, trim: true, default: '' },

    assignedEmployees: { type: [assignedEmployeeSchema], default: [] },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ownerName: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    folderPath: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    mimeType: { type: String, trim: true, default: '' },
    storageProvider: { type: String, trim: true, default: 'local' },
    storageKey: { type: String, trim: true, default: '' },
    storageUrl: { type: String, trim: true, default: '' },
    thumbnailUrl: { type: String, trim: true, default: '' },
    previewUrl: { type: String, trim: true, default: '' },
    fileSizeBytes: { type: Number, default: 0, min: 0 },
    isWatermarked: { type: Boolean, default: false },
    canDownload: { type: Boolean, default: true },
    canShare: { type: Boolean, default: true },
    expiresAt: { type: Date },

    version: {
      current: { type: String, default: 'v1.0' },
      major: { type: Number, default: 1, min: 1 },
      minor: { type: Number, default: 0, min: 0 },
      history: { type: [versionSchema], default: [] },
    },

    approvalStatus: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft', index: true },
    approvalWorkflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceApprovalWorkflow', index: true },
    approvalSteps: { type: [approvalStepSchema], default: [] },

    publishAt: { type: Date },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    archivedAt: { type: Date },

    usageCount: { type: Number, default: 0, min: 0 },
    downloadCount: { type: Number, default: 0, min: 0 },
    shareCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    storageUsageBytes: { type: Number, default: 0, min: 0 },
    lastAccessedAt: { type: Date },

    budgetImpact: {
      spend: { type: Number, default: 0, min: 0 },
      roiAtSnapshot: { type: Number, default: 0 },
    },

    analytics: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

mediaSchema.index({ section: 1, projectId: 1, createdAt: -1 });
mediaSchema.index({ moduleType: 1, status: 1, createdAt: -1 });
mediaSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text', projectName: 'text', clientName: 'text', campaignName: 'text' });

module.exports = mongoose.models.Media || mongoose.model('Media', mediaSchema);
