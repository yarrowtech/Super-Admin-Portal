const mongoose = require('mongoose');

const legalDocumentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LegalDocument',
      required: true,
      index: true,
    },
    version: { type: String, required: true },
    content: { type: String, default: '' },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedByName: { type: String, default: '' },
    changeSummary: { type: String, default: 'Document updated' },
    statusAtTime: { type: String, default: 'Draft' },
  },
  { timestamps: true }
);

legalDocumentVersionSchema.index({ documentId: 1, createdAt: -1 });

module.exports =
  mongoose.models.LegalDocumentVersion ||
  mongoose.model('LegalDocumentVersion', legalDocumentVersionSchema);
