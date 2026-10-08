const Project = require('../models/common/Project');
const key = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// Identity comes from Project; portal access and integration configuration remain separate.
async function getGlobalProjectIdentities() {
  const projects = await Project.find({}).select('name projectCode description').lean();
  return new Map(projects.filter(project => project.projectCode).map(project => [key(project.projectCode), {
    projectId: String(project._id), name: project.name, description: project.description,
  }]));
}
const applyGlobalProjectIdentity = (project, identities) => ({ ...project, ...(identities.get(key(project.code || project.projectCode)) || {}) });
module.exports = { getGlobalProjectIdentities, applyGlobalProjectIdentity };
