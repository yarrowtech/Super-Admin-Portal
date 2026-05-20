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

const requireProjectContext = (req, res, next) => {
  const projectId = extractProjectId(req);
  if (!projectId) {
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
  const projectId = extractProjectId(req);
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

