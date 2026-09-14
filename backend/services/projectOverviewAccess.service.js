const mongoose = require('mongoose');
const { getAccessibleProjects, getUserProjectAssignments } = require('../utils/projectAccess');

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

  // No explicit per-project assignment records at all (the common case for
  // department heads like Law/IT/HR/Finance, who aren't individually
  // assigned to projects) — treat as unrestricted, matching hasProjectAccess
  // elsewhere in the app (middlewares/project.middleware.js: "allowed.length
  // === 0 => full access"). Without this, every project lookup 404s with
  // "Project not found" for any such user, since the $or below would have no
  // clauses and fall back to a filter that matches nothing.
  if (getUserProjectAssignments(user).length === 0) return {};

  const id = user._id || user.id;
  const clauses = mongoose.isObjectIdOrHexString(id)
    ? [{ projectManager: id }, { 'teamMembers.employee': id }] : [];
  const accessible = getAccessibleProjects(user).filter((project) => project.accessGranted);
  const names = accessible.flatMap((project) => [project.name, project.code, ...(project.aliases || [])]);
  if (names.length) clauses.push({ name: { $in: names } }, { projectCode: { $in: names } });
  return clauses.length ? { $or: clauses } : { _id: { $in: [] } };
};
module.exports = { projectOverviewScope };
