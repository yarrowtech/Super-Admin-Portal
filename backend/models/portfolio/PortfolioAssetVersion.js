const mongoose = require('mongoose');

// Full-content snapshot per version, mirroring the existing
// backend/models/law/LegalDocumentVersion.v2.js pattern. Created on explicit
// save-settle or status transition — never per keystroke (see
// portfolioHierarchy.service.js).
const portfolioAssetVersionSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', required: true, index: true },
    versionNumber: { type: Number, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    changeSummary: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    legacyId: { type: String, default: null },
    legacySource: { type: String, default: null },
    migratedAt: { type: Date, default: null },
    migrationBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'MigrationBatch', default: null },
  },
  { timestamps: true }
);

portfolioAssetVersionSchema.index({ assetId: 1, createdAt: -1 });

module.exports =
  mongoose.models.PortfolioAssetVersion || mongoose.model('PortfolioAssetVersion', portfolioAssetVersionSchema);
