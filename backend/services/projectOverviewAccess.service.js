const mongoose = require('mongoose');
const { getAccessibleProjects, getUserProjectAssignments } = require('../utils/projectAccess');
const { ROLE_HIERARCHY } = require('../config/roles');

// Department heads and managers oversee their whole department, so an unassigned head is
// treated as unrestricted (see the comment on the branch below). An individual contributor
// is not: with no assignment records they see the projects they actually work on, not every
// project in the company. 50 is the head/manager floor in ROLE_HIERARCHY (HR and IT-HR sit
// at 50; IT/Finance/Law employees at 40, media sales/marketing at 45, freelancers at 5).
const OVERSIGHT_LEVEL = 50;
const hasOversight = (user = {}) => (ROLE_HIERARCHY[String(user.role || '').toLowerCase()] || 0) >= OVERSIGHT_LEVEL;

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
  //
  // That unrestricted fallback is for oversight roles only. An individual
  // contributor with no assignments previously fell through here and could list
  // every project in the company; they now fall through to the identity clauses
  // below, which match the projects they manage or are a team member of.
  if (getUserProjectAssignments(user).length === 0 && hasOversight(user)) return {};

  const id = user._id || user.id;
  const clauses = mongoose.isObjectIdOrHexString(id)
    ? [{ projectManager: id }, { 'teamMembers.employee': id }] : [];
  const accessible = getAccessibleProjects(user).filter((project) => project.accessGranted);
  const names = accessible.flatMap((project) => [project.name, project.code, ...(project.aliases || [])]);
  if (names.length) clauses.push({ name: { $in: names } }, { projectCode: { $in: names } });
  return clauses.length ? { $or: clauses } : { _id: { $in: [] } };
};
module.exports = { projectOverviewScope };
