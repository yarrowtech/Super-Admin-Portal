const mongoose = require('mongoose');

// A document / media / link attached to a Category (and optionally a specific
// Asset) — spec §11-12. Binaries are NOT stored here: each version keeps a
// Cloudinary reference (url + storageKey) produced by
// modules/media/media.service.js `uploadMediaFile`. Replacing a file pushes a
// new entry onto `versions` and never overwrites — history is retained.
const FILE_TYPES = ['image', 'pdf', 'document', 'link'];

const fileVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    url: { type: String, default: '' },
    storageKey: { type: String, default: '' },
    storageProvider: { type: String, default: 'cloudinary' },
    thumbnailUrl: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
    note: { type: String, trim: true, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const portfolioFileSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioCategory', required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioGroup', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', default: null, index: true },

    name: { type: String, required: true, trim: true },
    fileType: { type: String, enum: FILE_TYPES, default: 'document', index: true },
    linkUrl: { type: String, trim: true, default: '' }, // only for fileType === 'link'
    currentVersion: { type: Number, default: 1 },
    versions: { type: [fileVersionSchema], default: [] },

    deletedAt: { type: Date, default: null, index: true }, // "archived" in the UI
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

portfolioFileSchema.index({ categoryId: 1, deletedAt: 1, updatedAt: -1 });

// Convenience: the live version record.
portfolioFileSchema.virtual('current').get(function current() {
  if (!this.versions?.length) return null;
  return this.versions.find((v) => v.version === this.currentVersion) || this.versions[this.versions.length - 1];
});
portfolioFileSchema.set('toJSON', { virtuals: true });
portfolioFileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.PortfolioFile || mongoose.model('PortfolioFile', portfolioFileSchema);
module.exports.FILE_TYPES = FILE_TYPES;
