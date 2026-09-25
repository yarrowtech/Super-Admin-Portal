const mongoose = require('mongoose');

const DOCUMENT_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];
const DOCUMENT_STATUSES = ['Draft', 'Pending', 'Approved', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const DOCUMENT_SCOPES = ['project', 'company'];
const SOURCE_TYPES = ['blank', 'template', 'upload'];
const CONFIDENTIALITY_LEVELS = ['Internal', 'Confidential', 'Restricted'];

const legalAttachmentSchema = new mongoose.Schema(
  {
    originalFileName: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    fileSize: { type: Number, default: 0 },
    purpose: { type: String, enum: ['source', 'supporting', 'attachment'], default: 'attachment' },
    // Files upload to Cloudinary (see utils/cloudinaryUpload.js); `url` is
    // either a Cloudinary secure_url or, when Cloudinary isn't configured, an
    // inline base64 data URI. `data` (legacy raw Buffer) is kept only to read
    // attachments created before this moved off in-document storage.
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    storageProvider: { type: String, enum: ['cloudinary', 'inline'], default: 'cloudinary' },
    data: Buffer,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

// Notes and key highlight points pinned to a document, usually added by the employee
// editing it through a Law task. `critical` flags points the head must not miss.
const legalAnnotationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['note', 'highlight'], default: 'note' },
    text: { type: String, trim: true, required: true, maxlength: 2000 },
    critical: { type: Boolean, default: false },
    // The document passage this point is about (selected text), so readers can jump to it.
    quote: { type: String, trim: true, default: '', maxlength: 500 },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const legalDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    documentNumber: { type: String, trim: true, default: '', index: true },
    description: { type: String, trim: true, default: '' },
    type: { type: String, enum: DOCUMENT_TYPES, default: 'Other', index: true },
    category: { type: String, trim: true, default: '' },
    scope: { type: String, enum: DOCUMENT_SCOPES, default: 'company', index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    projectName: { type: String, trim: true, default: '' },
    owner: { type: String, trim: true, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: String, trim: true, default: '' },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    legalTeam: { type: String, trim: true, default: '' },

    latestContent: { type: String, default: '' },
    sourceType: { type: String, enum: SOURCE_TYPES, default: 'blank' },
    templateId: { type: String, trim: true, default: '' },
    templateName: { type: String, trim: true, default: '' },
    currentVersion: { type: String, default: 'v1.0' },
    versionMajor: { type: Number, default: 1 },
    versionMinor: { type: Number, default: 0 },

    status: { type: String, enum: DOCUMENT_STATUSES, default: 'Draft', index: true },
    isLocked: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdByName: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String, default: '' },

    ceoRemarks: { type: String, default: '' },
    internalNotes: { type: String, trim: true, default: '' },
    confidentiality: { type: String, enum: CONFIDENTIALITY_LEVELS, default: 'Internal' },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    effectiveDate: { type: Date },
    expiryDate: { type: Date },
    reviewDate: { type: Date },
    signedDate: { type: Date },

    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    tags: { type: [String], default: [] },
    attachments: { type: [legalAttachmentSchema], default: [] },
    annotations: { type: [legalAnnotationSchema], default: [] },

    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedByName: { type: String, default: '' },

    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedByName: { type: String, default: '' },

    // Records that the project's client (Project.client) has acknowledged/
    // agreed to this document — used for Policy-type docs, but not restricted
    // to them. The client's identity lives on the Project, not duplicated here.
    customerAgreement: {
      agreed: { type: Boolean, default: false },
      agreedAt: { type: Date, default: null },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedByName: { type: String, default: '' },
      notes: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true }
);

legalDocumentSchema.index({ status: 1, createdAt: -1 });
legalDocumentSchema.index({ scope: 1, projectId: 1, createdAt: -1 });
legalDocumentSchema.index({ status: 1, projectId: 1, createdAt: -1 });
legalDocumentSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
legalDocumentSchema.index({ isPublished: 1, type: 1, createdAt: -1 });
legalDocumentSchema.index({ deletedAt: 1, createdAt: -1 });
legalDocumentSchema.index({ title: 'text', documentNumber: 'text', description: 'text' });

module.exports = mongoose.models.LegalDocument || mongoose.model('LegalDocument', legalDocumentSchema);
