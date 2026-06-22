const hasProjectAccess = (user, projectId) => {
  const allowed = user?.metadata?.projects;
  if (!Array.isArray(allowed) || allowed.length === 0) return true;
  return allowed.map(String).includes(String(projectId));
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
};
