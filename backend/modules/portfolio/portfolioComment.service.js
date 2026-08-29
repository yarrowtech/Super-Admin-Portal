const PortfolioComment = require('../../models/portfolio/PortfolioComment');
const {
  ValidationError,
  NotFoundError,
  assertId,
  audit,
  resolveAssetChain,
  userSummary,
} = require('./portfolioShared');

const POPULATE = { path: 'authorId', select: 'firstName lastName email role profileImage' };

const shape = (doc) => {
  const c = doc.toObject ? doc.toObject() : doc;
  return {
    _id: c._id,
    assetId: c.assetId,
    parentId: c.parentId,
    body: c.deletedAt ? '[deleted]' : c.body,
    deleted: Boolean(c.deletedAt),
    editedAt: c.editedAt,
    author: userSummary(c.authorId),
    authorId: c.authorId?._id || c.authorId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

// Returns a flat, oldest-first list; the client groups replies under their
// `parentId` (one level of nesting, per spec §7).
const listComments = async (assetId) => {
  const asset = await resolveAssetChain(assetId);
  const rows = await PortfolioComment.find({ assetId: asset._id }).sort({ createdAt: 1 }).populate(POPULATE).lean();
  return rows.map(shape);
};

const createComment = async (assetId, body, actor) => {
  const asset = await resolveAssetChain(assetId);
  if (!body.body || !String(body.body).trim()) throw new ValidationError('Comment cannot be empty');

  let parentId = null;
  if (body.parentId) {
    assertId(body.parentId, 'parent comment id');
    const parent = await PortfolioComment.findOne({ _id: body.parentId, assetId: asset._id, deletedAt: null });
    if (!parent) throw new NotFoundError('Parent comment not found');
    parentId = parent._id;
  }

  const comment = await PortfolioComment.create({
    assetId: asset._id,
    portfolioId: asset.portfolioId,
    parentId,
    body: String(body.body).trim(),
    authorId: actor?.id,
  });
  await audit(actor, 'COMMENT_ADDED', 'PortfolioComment', comment._id, { assetId: String(assetId) });
  return shape(await comment.populate(POPULATE));
};

const findCommentOrThrow = async (commentId) => {
  assertId(commentId, 'comment id');
  const comment = await PortfolioComment.findOne({ _id: commentId, deletedAt: null });
  if (!comment) throw new NotFoundError('Comment not found');
  return comment;
};

const updateComment = async (commentId, body, actor) => {
  const comment = await findCommentOrThrow(commentId);
  if (String(comment.authorId) !== String(actor?.id)) throw new ValidationError('You can only edit your own comments');
  if (!body.body || !String(body.body).trim()) throw new ValidationError('Comment cannot be empty');
  comment.body = String(body.body).trim();
  comment.editedAt = new Date();
  await comment.save();
  return shape(await comment.populate(POPULATE));
};

const deleteComment = async (commentId, actor) => {
  const comment = await findCommentOrThrow(commentId);
  const isAuthor = String(comment.authorId) === String(actor?.id);
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(String(actor?.role || '').toLowerCase());
  if (!isAuthor && !isAdmin) throw new ValidationError('You can only delete your own comments');
  comment.deletedAt = new Date();
  comment.deletedBy = actor?.id;
  await comment.save();
  await audit(actor, 'ARCHIVED', 'PortfolioComment', comment._id, { trashed: true });
  return { _id: comment._id, deleted: true };
};

module.exports = { listComments, createComment, updateComment, deleteComment };
