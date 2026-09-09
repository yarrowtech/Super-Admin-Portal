const mongoose = require('mongoose');
const { getAccessibleProjects } = require('../utils/projectAccess');
const projectOverviewScope = (user = {}) => {
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
