const mongoose = require('mongoose');
const { ROLES } = require('../config/roles');
const User = require('../models/auth/User');
const Project = require('../models/common/Project');
const Team = require('../models/manager/Team');
const employeeRoles = ['employee', 'it_employee', 'finance_employee', 'law_employee', 'media_sales', 'media_marketing', 'freelancer'];
// Same global-access roles projectOverviewAccess.service.js already bypasses scope for.
// Kept in sync here so "which projects can this person see" has one definition
// instead of two independently-maintained ones (Dashboard/Projects/Tasks/Team/Leave
// vs. the shared Project Overview page).
const GLOBAL_SCOPE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, 'superadmin', ROLES.CEO];
const hasGlobalScope = (manager) => GLOBAL_SCOPE_ROLES.includes(String(manager?.role || '').toLowerCase());
const resolveManagerScope = async (manager, session = null) => {
  const id = manager._id || manager.id;
  if (!mongoose.isObjectIdOrHexString(id)) throw Object.assign(new Error('Manager identity required'), { statusCode: 403 });
  const managerId = new mongoose.Types.ObjectId(String(id));
  const global = hasGlobalScope(manager);
  const projects = global ? {} : { projectManager: managerId };
  const projectIds = await Project.find(projects).session(session).distinct('_id');
  const teamIds = await Team.find({ manager: managerId }).session(session).distinct('members.employee');
  const clauses = [{ _id: { $in: teamIds } }];
  // Preserve the established department-management rule; never widen missing departments.
  if (manager.department) clauses.push({ department: manager.department });
  const employees = global
    ? { _id: { $ne: managerId }, role: { $in: employeeRoles } }
    : { _id: { $ne: managerId }, role: { $in: employeeRoles }, $or: clauses };
  const employeeIds = await User.find(employees).session(session).distinct('_id');
  return {
    managerId, projects, projectIds, employees, employeeIds,
    tasks: { $or: [{ assignedBy: managerId }, { project: { $in: projectIds } }, { assignedTo: { $in: employeeIds } }] },
    leaves: { employee: { $in: employeeIds } },
    reports: { employee: { $in: employeeIds } },
  };
};
module.exports = { resolveManagerScope };
