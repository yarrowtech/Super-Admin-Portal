// Central policy aggregate. Policy content is stored only in immutable PolicyVersion documents.
const mongoose = require('mongoose');

const POLICY_TYPES = ['PRIVACY_POLICY', 'DATA_PRIVACY_POLICY', 'TERMS_AND_CONDITIONS', 'COOKIE_POLICY', 'DATA_PROCESSING_POLICY', 'ACCEPTABLE_USE_POLICY', 'SECURITY_POLICY', 'COMPLIANCE_POLICY', 'LEGAL_NOTICE', 'OTHER'];
const POLICY_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'];
const POLICY_SCOPES = ['GLOBAL', 'SINGLE_PROJECT', 'SELECTED_PROJECTS'];
const POLICY_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const schema = new mongoose.Schema({
  policyCode: { type: String, required: true, trim: true, uppercase: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  type: { type: String, enum: POLICY_TYPES, default: 'OTHER', index: true },
  description: { type: String, trim: true, default: '' },
  scope: { type: String, enum: POLICY_SCOPES, required: true, index: true },
  status: { type: String, enum: POLICY_STATUSES, default: 'DRAFT', index: true },
  priority: { type: String, enum: POLICY_PRIORITIES, default: 'MEDIUM', index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyVersion', default: null },
  requiresAcceptance: { type: Boolean, default: false },
  requiresReAcceptance: { type: Boolean, default: false },
  effectiveDate: { type: Date, default: null, index: true },
  reviewDate: { type: Date, default: null },
  expirationDate: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

schema.index({ policyCode: 1 }, { unique: true });
schema.index({ slug: 1 }, { unique: true });
schema.index({ status: 1, scope: 1, effectiveDate: 1 });
schema.index({ updatedAt: -1 });

module.exports = mongoose.models.Policy || mongoose.model('Policy', schema);
module.exports.POLICY_TYPES = POLICY_TYPES;
module.exports.POLICY_STATUSES = POLICY_STATUSES;
module.exports.POLICY_SCOPES = POLICY_SCOPES;
module.exports.POLICY_PRIORITIES = POLICY_PRIORITIES;
