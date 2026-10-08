const mongoose = require('mongoose');
const Media = require('../../models/department/Media');
const Project = require('../../models/common/Project');
const User = require('../../models/auth/User');
const { CATEGORIES, KIND_EXPRESSION } = require('./library.catalog');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const fullRoles = ['media_head', 'admin', 'super_admin', 'ceo'];
const oid = value => new mongoose.Types.ObjectId(value);
const uid = user => String(user?._id || user?.id || '');
const fail = (message, statusCode = 400) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
const escape = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const archived = { $or: [{ $eq: ['$status', 'Archived'] }, { $ne: [{ $ifNull: ['$archivedAt', null] }, null] }, { $eq: ['$section', 'archive'] }, { $and: [{ $eq: ['$section', 'campaign'] }, { $eq: ['$campaignStatus', 'Archived'] }] }] };
const fields = ['title', 'description', 'category', 'subcategory', 'assetType', 'tags', 'ownerId', 'campaignId', 'storageUrl', 'storageKey', 'storageProvider', 'thumbnailUrl', 'mimeType', 'fileSizeBytes', 'originalName', 'usageRights', 'expiresAt', 'social', 'campaignStatus', 'relatedIds', 'isMaster'];
const snapshot = record => ({ ...Object.fromEntries(fields.map(key => [key, record[key]]).filter(([, value]) => value !== undefined)), approval: { status: record.approvalStatus, submittedAt: record.submittedAt, approvedAt: record.approvedAt, rejectedAt: record.rejectedAt, steps: record.approvalSteps?.map(step => step.toObject ? step.toObject() : step) || [] } });
const displayName = user => user && typeof user === 'object' ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user' : 'Unknown user';

async function scope(user, projectId) {
  const filter = fullRoles.includes(user?.role) ? {} : { $or: [{ 'teamMembers.employee': uid(user) }, { projectManager: uid(user) }] };
  const projects = await Project.find(filter).select('name description projectCode logo teamMembers projectManager').sort({ name: 1 }).lean();
  if (projectId && !projects.some(project => String(project._id) === projectId)) fail('You do not have access to this project library.', 403);
  return { projects, match: { projectId: { $in: projects.filter(project => !projectId || String(project._id) === projectId).map(project => project._id) } } };
}

async function overview(user, projectId) {
  const { projects, match } = await scope(user, projectId);
  const grouped = await Media.aggregate([
    { $match: { ...match, deletedAt: null } }, { $addFields: { _kind: KIND_EXPRESSION, _archived: archived } },
    { $group: { _id: { project: '$projectId', kind: { $cond: ['$_archived', 'archive', '$_kind'] } }, total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] } } } },
  ]);
  const totals = Object.fromEntries(CATEGORIES.map(category => [category.key, 0])); let pending = 0;
  const libraries = projects.filter(project => !projectId || String(project._id) === projectId).map(project => {
    const counts = Object.fromEntries(CATEGORIES.map(category => [category.key, 0])); let review = 0;
    grouped.filter(row => String(row._id.project) === String(project._id)).forEach(row => { counts[row._id.kind] = row.total; review += row.pending; });
    Object.entries(counts).forEach(([key, value]) => { totals[key] = (totals[key] || 0) + value; }); pending += review;
    return { id: String(project._id), name: project.name, code: project.projectCode, description: project.description, logo: project.logo, counts, pending: review, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  });
  const userIds = [...new Set(projects.filter(project => !projectId || String(project._id) === projectId).flatMap(project => [String(project.projectManager), ...project.teamMembers.map(member => String(member.employee))]).filter(mongoose.isValidObjectId))];
  const tags = (await Media.distinct('tags', { ...match, deletedAt: null })).sort().slice(0, 200);
  const owners = await User.find({ _id: { $in: userIds } }).select('firstName lastName role').lean();
  return { tags, projects: libraries, categories: CATEGORIES, totals: { ...totals, total: Object.values(totals).reduce((a, b) => a + b, 0), pending }, owners: owners.map(owner => ({ id: String(owner._id), name: displayName(owner) })) };
}

async function list(user, query) {
  const { match, projects } = await scope(user, query.projectId);
  const page = Math.max(1, Number(query.page) || 1), limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
  const filter = { ...match, deletedAt: query.workspace === 'trash' ? { $ne: null } : null };
  if (query.relatedTo) {
    const parent = await recordFor(user, query.relatedTo);
    if (query.projectId && String(parent.projectId) !== query.projectId) fail('Related items belong to another project.', 403);
    filter.projectId = parent.projectId;
    filter._id = { $ne: parent._id };
    filter.$and = [{ $or: [{ _id: { $in: [...(parent.relatedIds || []), ...(parent.campaignId ? [parent.campaignId] : []), ...(parent.social?.creativeAssetId ? [parent.social.creativeAssetId] : [])] } }, { campaignId: parent._id }, { relatedIds: parent._id }, { 'social.creativeAssetId': parent._id }] }];
  }
  if (query.ownerId) filter.ownerId = oid(query.ownerId);
  if (query.campaignId) filter.campaignId = oid(query.campaignId);
  if (query.tag) filter.tags = query.tag;
  if (query.subcategory) {
    const alternatives = [{ subcategory: query.subcategory }];
    const legacySection = { Videos: 'video', 'Design Files': 'design' }[query.subcategory];
    if (legacySection) alternatives.push({ section: legacySection, subcategory: { $in: ['', null] } });
    filter.$and = [...(filter.$and || []), { $or: alternatives }];
  }
  if (query.assetType) filter.$and = [...(filter.$and || []), { $or: [{ assetType: query.assetType }, { 'metadata.assetType': query.assetType }, { 'social.contentType': query.assetType }] }];
  if (query.platform) filter.$and = [...(filter.$and || []), { $or: [{ 'social.platform': query.platform }, { 'metadata.platform': query.platform }] }];
  if (query.status) filter.status = query.status;
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.dateFrom || query.dateTo) filter.updatedAt = { ...(query.dateFrom && { $gte: new Date(query.dateFrom) }), ...(query.dateTo && { $lte: new Date(`${query.dateTo.slice(0, 10)}T23:59:59.999Z`) }) };
  if (query.workspace === 'favorites') filter.favoriteBy = oid(uid(user));
  if (query.workspace === 'mine') filter.createdBy = oid(uid(user));
  if (query.workspace === 'shared') filter.sharedWith = oid(uid(user));
  if (query.workspace === 'approvals') filter.approvalStatus = 'pending';
  if (query.search) {
    const tokens = query.search.trim().split(/\s+/).slice(0, 20);
    const clauses = await Promise.all(tokens.map(async token => {
      const word = ['videos', 'images', 'campaigns', 'documents'].includes(token.toLowerCase()) ? token.slice(0, -1) : token;
      const regex = new RegExp(escape(word), 'i');
      const alternatives = ['title', 'description', 'tags', 'category', 'subcategory', 'assetType', 'mimeType', 'metadata.assetType', 'metadata.caption', 'metadata.platform', 'section', 'originalName', 'metadata.originalName', 'social.caption', 'social.hashtags', 'social.platform', 'status', 'approvalStatus'].map(field => ({ [field]: regex }));
      const matchingProjects = projects.filter(project => regex.test(project.name) || regex.test(project.projectCode || '')).map(project => project._id);
      if (matchingProjects.length) alternatives.push({ projectId: { $in: matchingProjects } });
      const campaigns = await Media.find({ ...match, section: 'campaign', title: regex }).select('_id').limit(100).lean();
      if (campaigns.length) alternatives.push({ campaignId: { $in: campaigns.map(campaign => campaign._id) } });
      if (word.toLowerCase() === 'campaign') alternatives.push({ campaignId: { $ne: null } });
      if (word.toLowerCase() === 'approval') alternatives.push({ approvalStatus: { $in: ['pending', 'approved', 'rejected'] } });
      return { $or: alternatives };
    }));
    filter.$and = [...(filter.$and || []), ...clauses];
  }

  const pipeline = [{ $match: filter }, { $addFields: { _kind: KIND_EXPRESSION, _archived: archived } }];
  if (query.kind === 'archive') pipeline.push({ $match: { _archived: true } });
  else if (query.workspace !== 'trash') pipeline.push({ $match: { _archived: false, ...(query.kind ? { _kind: query.kind } : {}) } });
  if (query.workspace === 'versions') pipeline.push({ $match: { 'version.history.1': { $exists: true } } });
  const [result] = await Media.aggregate([...pipeline, { $facet: {
    items: [{ $sort: query.sort === 'name' ? { title: 1, _id: 1 } : query.sort === 'calendar' ? { 'social.scheduledAt': 1, publishAt: 1, _id: 1 } : { updatedAt: -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1, _kind: 1 } }],
    count: [{ $count: 'total' }],
  } }]);
  const records = await Media.find({ _id: { $in: result.items.map(item => item._id) } }).select('-version.history -approvalSteps -sharedWith').populate('projectId', 'name projectCode').populate('ownerId createdBy updatedBy', 'firstName lastName').lean();
  const byId = new Map(records.map(record => [String(record._id), record]));
  const items = result.items.map(item => serialize(byId.get(String(item._id)), item._kind, user));
  const total = result.count[0]?.total || 0;
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

function serialize(record, kind, user) {
  const favoriteBy = record.favoriteBy;
  const visible = { ...record }; delete visible.favoriteBy; delete visible.sharedWith;
  return { ...visible, libraryKind: kind || record.libraryKind, assetType: record.assetType || record.metadata?.assetType || '', projectId: String(record.projectId?._id || record.projectId), projectName: record.projectId?.name || record.projectName,
    ownerName: record.ownerId?.firstName ? displayName(record.ownerId) : record.ownerName || displayName(record.createdBy), ownerId: String(record.ownerId?._id || record.ownerId || ''),
    creatorName: displayName(record.createdBy), updatedByName: displayName(record.updatedBy), favorite: (favoriteBy || []).some(value => String(value) === uid(user)),
  };
}

async function recordFor(user, id) {
  const record = await Media.findById(id);
  if (!record) fail('Library item not found', 404);
  await scope(user, String(record.projectId));
  return record;
}
async function detail(user, id) {
  const record = await recordFor(user, id);
  const { items } = await list(user, { projectId: String(record.projectId), workspace: record.deletedAt ? 'trash' : undefined, kind: record.archivedAt || record.status === 'Archived' || record.campaignStatus === 'Archived' ? 'archive' : undefined, search: record.title, limit: 100 });
  const populated = await Media.findById(id).populate('projectId', 'name projectCode').populate('ownerId createdBy updatedBy version.history.changedBy approvalSteps.decidedBy', 'firstName lastName').lean();
  const classified = items.find(item => String(item._id) === id)?.libraryKind || record.libraryKind || CATEGORIES.find(category => category.section === record.section)?.key || 'creative';
  const relations = await Media.find({ projectId: record.projectId, deletedAt: null, _id: { $ne: record._id }, $or: [{ _id: { $in: [...(record.relatedIds || []), ...(record.campaignId ? [record.campaignId] : []), ...(record.social?.creativeAssetId ? [record.social.creativeAssetId] : [])] } }, { campaignId: record._id }, { relatedIds: record._id }, { 'social.creativeAssetId': record._id }] })
    .select('title section libraryKind status campaignId').sort({ updatedAt: -1 }).limit(100).lean();
  return { ...serialize(populated, classified, user), related: relations };
}

async function validateLinks(user, projectId, payload) {
  const { projects } = await scope(user, projectId), project = projects.find(project => String(project._id) === projectId);
  if (payload.ownerId && String(payload.ownerId) !== uid(user) && !project.teamMembers.some(member => String(member.employee) === String(payload.ownerId)) && String(project.projectManager) !== String(payload.ownerId)) fail('Owner must belong to the selected project.');
  if (payload.ownerId && !await User.exists({ _id: payload.ownerId })) fail('Owner does not exist.');
  const ids = [...(payload.relatedIds || []), ...(payload.campaignId ? [payload.campaignId] : []), ...(payload.social?.creativeAssetId ? [payload.social.creativeAssetId] : [])].map(String);
  if (ids.length && await Media.countDocuments({ _id: { $in: [...new Set(ids)] }, projectId, deletedAt: null }) !== new Set(ids).size) fail('Related items must belong to the same project.');
  if (payload.campaignId && !await Media.exists({ _id: payload.campaignId, projectId, section: 'campaign' })) fail('Select a campaign from this project.');
}
const audit = (user, record, action) => writeAuditTrail({ userId: uid(user), module: 'media', action, targetType: 'Media', targetId: record._id, metadata: { projectId: record.projectId, section: record.section } });
async function create(user, payload) {
  const category = CATEGORIES.find(category => category.key === payload.libraryKind && category.section);
  if (!category) fail('Choose a library category.');
  if (category.key === 'social' && !payload.social?.platform) fail('Choose a social platform.');
  await validateLinks(user, payload.projectId, payload);
  const body = Object.fromEntries(fields.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]));
  const record = new Media({ ...body, projectId: payload.projectId, libraryKind: category.key, section: category.section, moduleType: category.key, ownerId: payload.ownerId || uid(user), createdBy: uid(user), updatedBy: uid(user), isMaster: category.key === 'brand', status: 'Draft' });
  record.version.history = [{ number: 1, label: 'v1.0', note: 'Initial version', changedBy: uid(user), snapshot: snapshot(record) }];
  await record.save(); await audit(user, record, 'library_created'); return detail(user, String(record._id));
}
async function update(user, id, payload) {
  const record = await recordFor(user, id);
  if (record.deletedAt) fail('Restore this item from Trash before editing.', 409);
  if (record.approvalStatus === 'pending') fail('Resolve the pending review before editing.', 409);
  if (!payload.expectedUpdatedAt || new Date(payload.expectedUpdatedAt).getTime() !== record.updatedAt.getTime()) fail('This item changed. Reload before saving.', 409);
  if (payload.projectId && payload.projectId !== String(record.projectId)) fail('Moving records between projects is not allowed.');
  await validateLinks(user, String(record.projectId), payload);
  if (payload.isMaster && record.libraryKind !== 'brand' && record.section !== 'brand') fail('Only brand foundation items can be master assets.');
  const update = Object.fromEntries(fields.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]));
  // Backfill the current legacy version's snapshot before replacing any file.
  const history = record.version?.history?.map(entry => entry.toObject()) || [];
  if (!history.length) history.push({ number: 1, label: record.version.current, note: 'Preserved existing version', changedBy: record.updatedBy || record.createdBy, changedAt: record.updatedAt, snapshot: snapshot(record) });
  history[history.length - 1].snapshot = snapshot(record);
  const number = history.length + 1, label = `v${record.version.major || 1}.${number - 1}`;
  history.push({ number, label, note: payload.versionNote || 'Updated library item', changedBy: uid(user), changedAt: new Date(), snapshot: { ...snapshot(record), ...update, approval: { status: 'draft', steps: [] } } });
  const saved = await Media.findOneAndUpdate({ _id: record._id, updatedAt: record.updatedAt }, { $set: { ...update, updatedBy: uid(user), status: 'Draft', approvalStatus: 'draft', approvalSteps: [], version: { major: record.version.major || 1, minor: number - 1, current: label, history } }, $unset: { approvalWorkflowId: 1, approvedAt: 1, rejectedAt: 1, submittedAt: 1 } }, { new: true, runValidators: true });
  if (!saved) fail('This item changed. Reload before saving.', 409);
  await audit(user, saved, 'library_version_created'); return detail(user, id);
}
async function action(user, id, payload) {
  const record = await recordFor(user, id), userId = uid(user);
  if (payload.action === 'favorite') {
    await Media.updateOne({ _id: id }, payload.enabled ? { $addToSet: { favoriteBy: userId } } : { $pull: { favoriteBy: userId } }, { timestamps: false }); return detail(user, id);
  }
  if (!['media_marketing', 'media_head', 'admin', 'super_admin'].includes(user.role)) fail('This role cannot change library records.', 403);
  if (record.deletedAt && payload.action !== 'restore') fail('Restore this item from Trash first.', 409);
  if (payload.action === 'share') {
    if (!record.canShare) fail('Sharing is disabled for this item.', 403);
    const { projects } = await scope(user, String(record.projectId)); const project = projects.find(project => String(project._id) === String(record.projectId));
    if (!project.teamMembers.some(member => String(member.employee) === payload.userId) && String(project.projectManager) !== payload.userId) fail('Share with a user allocated to this project.');
    await Media.updateOne({ _id: id }, { $addToSet: { sharedWith: payload.userId } }, { timestamps: false }); await audit(user, record, 'library_shared'); return detail(user, id);
  }
  if (payload.action === 'restore-version') {
    const version = record.version.history.find(version => version.number === payload.number);
    if (!version?.snapshot) fail('This legacy version has no recoverable file snapshot.');
    return update(user, id, { ...version.snapshot, expectedUpdatedAt: payload.expectedUpdatedAt, versionNote: `Restored ${version.label} as current version` });
  }
  if (record.approvalStatus === 'pending') fail('Resolve the pending review first.', 409);
  let changes;
  switch (payload.action) {
    case 'archive': changes = { status: 'Archived', archivedAt: new Date(), ...(record.section === 'campaign' && { campaignStatus: 'Archived' }) }; break;
    case 'unarchive': changes = { status: record.approvalStatus === 'approved' ? 'Approved' : 'Draft', archivedAt: null, ...(record.section === 'campaign' && { campaignStatus: 'Draft' }) }; break;
    case 'trash': changes = { deletedAt: new Date() }; break;
    case 'restore': changes = { deletedAt: null }; break;
    case 'schedule':
    case 'publish':
      if (record.approvalStatus !== 'approved') fail('Approval is required before scheduling or publishing.', 409);
      if (payload.action === 'schedule' && !payload.date) fail('Choose a scheduled date.');
      changes = payload.action === 'schedule' ? { status: 'Scheduled', publishAt: new Date(payload.date), 'social.scheduledAt': new Date(payload.date) } : { status: 'Published', 'social.publishedAt': new Date() }; break;
    default: fail('Unknown library action.');
  }
  if (!payload.expectedUpdatedAt || new Date(payload.expectedUpdatedAt).getTime() !== record.updatedAt.getTime()) fail('This item changed. Reload before saving.', 409);
  const saved = await Media.findOneAndUpdate({ _id: id, updatedAt: record.updatedAt }, { $set: { ...changes, updatedBy: userId } }, { new: true, runValidators: true });
  if (!saved) fail('This item changed. Reload before saving.', 409);
  await audit(user, saved, `library_${payload.action}`); return detail(user, id);
}
module.exports = { overview, list, detail, create, update, action, recordFor };
