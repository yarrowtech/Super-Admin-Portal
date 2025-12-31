// backend/models/PolicyDocument.js
const mongoose = require('mongoose');

const policyDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true
    },
    version: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

policyDocumentSchema.index({ category: 1 });
policyDocumentSchema.index({ isActive: 1 });

const PolicyDocument = mongoose.model('PolicyDocument', policyDocumentSchema);

module.exports = PolicyDocument;
