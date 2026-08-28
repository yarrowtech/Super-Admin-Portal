const mongoose = require('mongoose');

// Threaded comments on an Asset (spec §7 "Comments" tab). One level of nesting:
// a comment either has `parentId: null` (a thread root) or points at a root.
const portfolioCommentSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioComment', default: null, index: true },
    body: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

portfolioCommentSchema.index({ assetId: 1, createdAt: 1 });

module.exports = mongoose.models.PortfolioComment || mongoose.model('PortfolioComment', portfolioCommentSchema);
