const mongoose = require('mongoose');
const Project = require('../models/common/Project');

const getAssignedProjectTokens = (user) => {
  const legacyProjects = Array.isArray(user?.metadata?.projects) ? user.metadata.projects : [];
  const normalizedAssignments = Array.isArray(user?.assignedProjects) ? user.assignedProjects : [];
  const metadataAssignments = Array.isArray(user?.metadata?.projectAssignments)
    ? user.metadata.projectAssignments
    : Array.isArray(user?.metadata?.assignedProjects)
      ? user.metadata.assignedProjects
      : [];

  return [...legacyProjects, ...normalizedAssignments, ...metadataAssignments]
    .flatMap((entry) => {
      if (!entry) return [];
      if (typeof entry === "string") return [entry];
      if (typeof entry !== "object") return [];
      return [entry.projectId, entry._id, entry.id, entry.projectCode, entry.code, entry.projectName, entry.name];
    })
    .map((value) => String(value || "").trim())
    .filter(Boolean);
};

const hasProjectAccess = (user, projectId) => {
  const allowed = getAssignedProjectTokens(user);
  if (allowed.length === 0) return true;
  const requested = String(projectId || "").trim().toLowerCase();
  return allowed.some((token) => token.toLowerCase() === requested);
};

const extractProjectId = (req) =>
  req.params?.projectId ||
  req.query?.projectId ||
  req.headers["x-project-id"] ||
  req.body?.projectId ||
  null;

const normalizeProjectId = (projectId) => {
  if (!projectId) return null;
  const normalized = String(projectId).trim();
  if (!normalized || normalized.toLowerCase() === 'all') return null;
  return normalized;
};

const resolveProjectContext = async (req, res, next, required) => {
  const projectId = normalizeProjectId(extractProjectId(req));
  if (!projectId) {
    if (!required) return next();
    return res.status(400).json({ success: false, error: "ProjectId required" });
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ success: false, error: 'Invalid projectId' });
  }
  const project = await Project.findById(projectId).select('name projectCode status archivedAt').lean();
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  if (project.archivedAt) return res.status(410).json({ success: false, error: 'Project archived' });
  if (!hasResolvedProjectAccess(req.user, project)) {
    return res.status(403).json({ success: false, error: "No access to requested project" });
  }
  req.projectId = String(project._id);
  req.project = project;
  req.query = { ...(req.query || {}), projectId: req.projectId };
  return next();
};

const requireProjectContext = (req, res, next) => resolveProjectContext(req, res, next, true).catch(next);

const attachOptionalProjectContext = (req, res, next) => resolveProjectContext(req, res, next, false).catch(next);

const hasResolvedProjectAccess = (user, project) => {
  const allowed = getAssignedProjectTokens(user);
  if (allowed.length === 0) return true;
  const identities = [project?._id, project?.projectCode, project?.name]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  return allowed.some((token) => identities.includes(token.toLowerCase()));
};

module.exports = {
  requireProjectContext,
  attachOptionalProjectContext,
  extractProjectId,
  normalizeProjectId,
  hasProjectAccess,
  hasResolvedProjectAccess,
};
