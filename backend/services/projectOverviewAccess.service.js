const mongoose = require('mongoose');
const { getAccessibleProjects } = require('../utils/projectAccess');

// Manager Portal specifically must use the exact same "which projects can this
// person see" definition as its own Dashboard/Projects/Tasks/Team pages
// (managerScope.service.js), so Project Overview never shows a different
// project count than the rest of the Manager Portal for the same login.
// Every other portal keeps its existing canonical-registry/assignment-based
// matching below, unchanged.
const projectOverviewScope = async (user = {}, portal = null) => {
  if (portal === 'manager') {
    const { resolveManagerScope } = require('./managerScope.service');
    const scope = await resolveManagerScope(user);
    return scope.projects;
  }

  if (['admin', 'super_admin', 'ceo'].includes(user.role)) return {};
  const id = user._id || user.id;
  const clauses = mongoose.isObjectIdOrHexString(id)
    ? [{ projectManager: id }, { 'teamMembers.employee': id }] : [];
  const accessible = getAccessibleProjects(user).filter((project) => project.accessGranted);
  const names = accessible.flatMap((project) => [project.name, project.code, ...(project.aliases || [])]);
  if (names.length) clauses.push({ name: { $in: names } }, { projectCode: { $in: names } });
  return clauses.length ? { $or: clauses } : { _id: { $in: [] } };
};
module.exports = { projectOverviewScope };
