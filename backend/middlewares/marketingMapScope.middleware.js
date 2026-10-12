const Project = require('../models/common/Project');

const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isEecB2b = project => normalize(project.projectCode || project.code || project.name) === 'EECB2B';

async function resolveMapProject() {
  const projects = await Project.find({ $or: [
    { projectCode: /^EEC[-_ ]?B2B$/i }, { name: /^EEC[-_ ]?B2B$/i },
  ] }).select('name projectCode status').lean();
  const matches = projects.filter(isEecB2b);
  if (matches.length !== 1) throw Object.assign(new Error(matches.length ? 'EEC-B2B project is ambiguous. Resolve duplicate project identities.' : 'The EEC-B2B project is not configured.'), { statusCode: 422 });
  return { id: String(matches[0]._id), name: matches[0].name, code: matches[0].projectCode || null, status: matches[0].status };
}

async function marketingMapScope(req, res, next) {
  try {
    const project = await resolveMapProject();
    const requested = req.query.projectId;
    if (requested && String(requested) !== project.id) return res.status(403).json({ success: false, error: 'This marketing map is scoped to EEC-B2B.' });
    req.marketingMapProject = project;
    // Keep the existing controllers and APIs, but never widen the map to all projects.
    req.query.projectId = project.id;
    const json = res.json.bind(res);
    res.json = body => {
      if (body?.success && body.data && !Array.isArray(body.data)) {
        if (body.data.projectId && body.data.projectId !== project.id) return res.status(500) && json({ success: false, error: 'Unexpected marketing project relationship.' });
        const data = { ...body.data, projectId: project.id };
        if (data.map?.points) data.map = { ...data.map, points: data.map.points.map(point => ({ ...point, projectId: project.id })) };
        body = { ...body, data };
      }
      return json(body);
    };
    next();
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Unable to resolve the marketing map project.' });
  }
}

module.exports = { marketingMapScope, resolveMapProject, isEecB2b };
