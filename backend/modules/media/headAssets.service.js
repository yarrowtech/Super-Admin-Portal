const mongoose = require('mongoose');
const Media = require('../../models/department/Media');
const Project = require('../../models/common/Project');
const User = require('../../models/auth/User');
const SECTIONS = ['asset', 'brand', 'content', 'design', 'video', 'social'];
const id = value => String(value?._id || value || '');
const name = user => user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user' : 'Unknown contributor';

async function getHeadAssets(query = {}) {
  const page = Math.max(1, Number(query.page) || 1), limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
  const filter = { deletedAt: null, section: query.section || { $in: SECTIONS } };
  if (query.projectId) filter.projectId = new mongoose.Types.ObjectId(query.projectId);
  if (query.userId) {
    const userId = new mongoose.Types.ObjectId(query.userId);
    filter.$or = [{ createdBy: userId }, { updatedBy: userId }];
  }
  if (query.search) filter.title = { $regex: String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const scopeFilter = { ...filter };
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;
  if (query.attention === 'missing-file') filter.$and = [{ $or: [{ storageUrl: { $exists: false } }, { storageUrl: null }, { storageUrl: '' }] }];
  const staleBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (query.attention === 'stale') filter.$and = [...(filter.$and || []), { updatedAt: { $lt: staleBefore }, approvalStatus: { $nin: ['approved', 'rejected'] } }];
  const [projects, creatorIds, editorIds, rawItems, total, counts, summaryRows] = await Promise.all([
    Project.find({}).select('name projectCode teamMembers projectManager').sort({ name: 1 }).lean(),
    Media.distinct('createdBy', { deletedAt: null, section: { $in: SECTIONS } }),
    Media.distinct('updatedBy', { deletedAt: null, section: { $in: SECTIONS } }),
    Media.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('createdBy updatedBy', 'firstName lastName role').lean(),
    Media.countDocuments(filter),
    Media.aggregate([{ $match: { deletedAt: null, section: { $in: SECTIONS }, ...(query.projectId ? { projectId: new mongoose.Types.ObjectId(query.projectId) } : {}) } },
      { $project: { contributors: { $setUnion: [['$createdBy'], ['$updatedBy']] } } },
      { $unwind: '$contributors' },
      { $group: { _id: '$contributors', count: { $sum: 1 } } }]),
    Media.aggregate([{ $match: scopeFilter }, { $group: {
      _id: null, total: { $sum: 1 },
      pending: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] } },
      approved: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] } },
      rejected: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'rejected'] }, 1, 0] } },
      missingFile: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$storageUrl', ''] }, ''] }, 1, 0] } },
      stale: { $sum: { $cond: [{ $and: [{ $lt: ['$updatedAt', staleBefore] }, { $not: [{ $in: ['$approvalStatus', ['approved', 'rejected']] }] }] }, 1, 0] } },
    } }]),
  ]);
  const users = await User.find({ $or: [{ role: { $in: ['media_marketing', 'media_head'] }, isActive: { $ne: false } }, { _id: { $in: [...creatorIds, ...editorIds].filter(Boolean) } }] })
    .select('firstName lastName role isActive').sort({ firstName: 1, lastName: 1 }).lean();
  const projectMap = new Map(projects.map(project => [id(project), project]));
  const allocated = (project, userId) => !!userId && (id(project.projectManager) === userId || project.teamMembers.some(member => id(member.employee) === userId));
  const countMap = new Map(counts.map(row => [id(row._id), row.count]));
  return {
    summary: summaryRows[0] || { total: 0, pending: 0, approved: 0, rejected: 0, missingFile: 0, stale: 0 },
    projects: projects.map(project => ({ id: id(project), name: project.name, code: project.projectCode })),
    contributors: users.map(user => ({ id: id(user), name: name(user), role: user.role, active: user.isActive !== false,
      recordCount: countMap.get(id(user)) || 0,
      allocatedProjects: projects.filter(project => allocated(project, id(user))).map(project => ({ id: id(project), name: project.name })),
    })),
    items: rawItems.map(item => {
      const project = projectMap.get(id(item.projectId)), creatorId = id(item.createdBy);
      return { ...item, projectId: id(item.projectId), projectName: project?.name || item.projectName || 'Unlinked project',
        createdBy: creatorId, creatorName: name(item.createdBy), updatedBy: id(item.updatedBy), updatedByName: name(item.updatedBy),
        creatorCurrentlyAllocated: project ? allocated(project, creatorId) : false,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
module.exports = { getHeadAssets, SECTIONS };
