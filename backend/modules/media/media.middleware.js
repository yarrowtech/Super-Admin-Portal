const { extractProjectId, normalizeProjectId } = require('../../middlewares/project.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const mediaService = require('./media.service');

// Media-specific replacement for the generic requireProjectContext/
// attachOptionalProjectContext middlewares. The generic versions check
// req.user.assignedProjects, which is populated from an unrelated external
// SSO/hosted-system project registry (string codes like "BETTERPASS") and
// never matches the internal Project._id that Media.projectId stores — so
// media_marketing users were being silently denied access to projects they
// were actually assigned to via the media head's team UI. These check real
// Project.teamMembers/projectManager membership instead.
const requireMediaProjectContext = asyncHandler(async (req, res, next) => {
  const projectId = normalizeProjectId(extractProjectId(req));
  if (!projectId) {
    return res.status(400).json({ success: false, error: 'ProjectId required' });
  }
  if (!(await mediaService.hasMediaProjectAccess(req.user, projectId))) {
    return res.status(403).json({ success: false, error: 'No access to requested project' });
  }
  req.projectId = String(projectId);
  req.query = { ...(req.query || {}), projectId: req.projectId };
  next();
});

const attachOptionalMediaProjectContext = asyncHandler(async (req, _res, next) => {
  const projectId = normalizeProjectId(extractProjectId(req));
  if (projectId && (await mediaService.hasMediaProjectAccess(req.user, projectId))) {
    req.projectId = String(projectId);
    req.query = { ...(req.query || {}), projectId: req.projectId };
  }
  next();
});

const canManageMedia = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media_head', 'media_marketing', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot manage media records' });
};

const canViewMediaHead = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media_head', 'ceo', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot access Media Head views' });
};

const canDecideApproval = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media_head', 'ceo', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot decide media approvals' });
};

module.exports = {
  canManageMedia,
  canViewMediaHead,
  canDecideApproval,
  requireMediaProjectContext,
  attachOptionalMediaProjectContext,
};
