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
  req.query?.projectId ||
  req.headers["x-project-id"] ||
  req.body?.projectId ||
  req.params?.projectId ||
  null;

const normalizeProjectId = (projectId) => {
  if (!projectId) return null;
  const normalized = String(projectId).trim();
  if (!normalized || normalized.toLowerCase() === 'all') return null;
  return normalized;
};

const requireProjectContext = (req, res, next) => {
  const projectId = normalizeProjectId(extractProjectId(req));
  if (!projectId) {
    const baseUrl = String(req.baseUrl || '');
    if (baseUrl.startsWith('/api/dept/hr') || baseUrl.startsWith('/api/dashboard')) {
      return next();
    }
    return res.status(400).json({ success: false, error: "ProjectId required" });
  }
  if (!hasProjectAccess(req.user, projectId)) {
    return res.status(403).json({ success: false, error: "No access to requested project" });
  }
  req.projectId = String(projectId);
  req.query = { ...(req.query || {}), projectId: req.projectId };
  next();
};

const attachOptionalProjectContext = (req, _res, next) => {
  const projectId = normalizeProjectId(extractProjectId(req));
  if (projectId && hasProjectAccess(req.user, projectId)) {
    req.projectId = String(projectId);
    req.query = { ...(req.query || {}), projectId: req.projectId };
  }
  next();
};

module.exports = {
  requireProjectContext,
  attachOptionalProjectContext,
  extractProjectId,
  normalizeProjectId,
};
