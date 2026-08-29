const PortfolioAssetRelation = require('../../models/portfolio/PortfolioAssetRelation');
const { RELATION_TYPES } = require('../../models/portfolio/PortfolioAssetRelation');
const { ValidationError, NotFoundError, assertId, audit, resolveAssetChain } = require('./portfolioShared');

const ASSET_SUMMARY = 'title status assetType categoryId';

// Inverse of each type, shown when listing relations *from* the other side —
// e.g. an asset "blocked_by" X should also show up when listing X ("blocks" it).
const INVERSE = { related: 'related', blocks: 'blocked_by', blocked_by: 'blocks', derived_from: 'part_of', part_of: 'derived_from' };

const shapeAsset = (a) => (a ? { _id: a._id, title: a.title, status: a.status, assetType: a.assetType } : null);

// Lists relations both directions: rows this asset created, and rows other
// assets created pointing at it (surfaced with the inverse type).
const listRelations = async (assetId) => {
  const asset = await resolveAssetChain(assetId);
  const [outgoing, incoming] = await Promise.all([
    PortfolioAssetRelation.find({ assetId: asset._id }).populate('relatedAssetId', ASSET_SUMMARY).lean(),
    PortfolioAssetRelation.find({ relatedAssetId: asset._id }).populate('assetId', ASSET_SUMMARY).lean(),
  ]);

  const rows = [
    ...outgoing.map((r) => ({ _id: r._id, type: r.type, asset: shapeAsset(r.relatedAssetId), direction: 'outgoing' })),
    ...incoming.map((r) => ({ _id: r._id, type: INVERSE[r.type] || r.type, asset: shapeAsset(r.assetId), direction: 'incoming' })),
  ];

  const grouped = {};
  RELATION_TYPES.forEach((t) => { grouped[t] = []; });
  rows.forEach((r) => { (grouped[r.type] || (grouped[r.type] = [])).push(r); });
  return grouped;
};

const createRelation = async (assetId, body, actor) => {
  const asset = await resolveAssetChain(assetId);
  assertId(body.relatedAssetId, 'related asset id');
  if (String(body.relatedAssetId) === String(asset._id)) throw new ValidationError('An asset cannot relate to itself');
  const related = await resolveAssetChain(body.relatedAssetId, { portfolioId: asset.portfolioId });

  const type = RELATION_TYPES.includes(body.type) ? body.type : 'related';
  const existing = await PortfolioAssetRelation.findOne({ assetId: asset._id, relatedAssetId: related._id, type });
  if (existing) return existing;

  const relation = await PortfolioAssetRelation.create({
    assetId: asset._id, relatedAssetId: related._id, portfolioId: asset.portfolioId, type, createdBy: actor?.id,
  });
  await audit(actor, 'RELATION_ADDED', 'PortfolioAsset', asset._id, { relatedAssetId: String(related._id), type });
  return relation;
};

const deleteRelation = async (relationId, actor) => {
  assertId(relationId, 'relation id');
  const relation = await PortfolioAssetRelation.findById(relationId);
  if (!relation) throw new NotFoundError('Relation not found');
  await relation.deleteOne();
  await audit(actor, 'RELATION_REMOVED', 'PortfolioAsset', relation.assetId, { relatedAssetId: String(relation.relatedAssetId) });
  return { _id: relationId, deleted: true };
};

module.exports = { listRelations, createRelation, deleteRelation };
