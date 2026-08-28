const mongoose = require('mongoose');

// A typed link between two assets (spec §7 "Relations" tab). Stored one-directional
// from `assetId` -> `relatedAssetId`; the service also surfaces inbound links when
// listing an asset's relations. Both assets must belong to the same portfolio.
const RELATION_TYPES = ['related', 'blocks', 'blocked_by', 'derived_from', 'part_of'];

const portfolioAssetRelationSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', required: true, index: true },
    relatedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    type: { type: String, enum: RELATION_TYPES, default: 'related' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

portfolioAssetRelationSchema.index({ assetId: 1, relatedAssetId: 1, type: 1 }, { unique: true });

module.exports =
  mongoose.models.PortfolioAssetRelation || mongoose.model('PortfolioAssetRelation', portfolioAssetRelationSchema);
module.exports.RELATION_TYPES = RELATION_TYPES;
