const User = require('../models/auth/User');
const { ROLES } = require('../config/roles');

// Department-scoped messaging. Users in a grouped department (law, it, finance, media) may only
// chat with users of the SAME department. Membership is decided by ROLE (not by portal), so
// it_manager (Manager portal), it_employee / finance_employee (Employee portal) and it_hr (HR portal)
// are still IT / Finance members. Roles outside every group (hr, manager, admin, super_admin, ceo,
// generic employee, freelancer, outsourcing...) are untouched: chatDepartmentOf(user) returns null.
const DEPARTMENT_CHAT_ROLES = {
  law: [ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE],
  it: [ROLES.IT_MANAGER, ROLES.IT_ADMIN, ROLES.IT_EMPLOYEE, ROLES.IT_HR],
  finance: [ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE],
  media: [ROLES.MEDIA_HEAD, ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING],
};
const DEPARTMENT_LABELS = { law: 'Law', it: 'IT', finance: 'Finance', media: 'Media' };

const roleToDepartment = new Map();
Object.entries(DEPARTMENT_CHAT_ROLES).forEach(([dept, roles]) => roles.forEach((r) => roleToDepartment.set(r, dept)));

// Department key ('law' | 'it' | 'finance' | 'media') for a user/role, or null when ungrouped.
const chatDepartmentOf = (user) => roleToDepartment.get(String(user?.role || '').toLowerCase()) || null;
const isDepartmentChatUser = (user) => Boolean(chatDepartmentOf(user));
const rolesForDepartment = (dept) => DEPARTMENT_CHAT_ROLES[dept] || [];

const forbidden = (dept, message) => {
  const label = DEPARTMENT_LABELS[dept] || 'Department';
  const err = new Error(message || `${label} messaging is limited to ${label} team members`);
  err.statusCode = 403;
  return err;
};

const idOf = (v) => String(v && v._id ? v._id : v);

const getDepartmentUserIds = async (dept) => {
  const users = await User.find({ role: { $in: rolesForDepartment(dept) } }).select('_id').lean();
  return users.map((u) => u._id);
};

// Mongo filter: chat has members and every member belongs to the user's department.
const departmentOnlyThreadFilter = async (user) => {
  const ids = await getDepartmentUserIds(chatDepartmentOf(user));
  return { 'members.0': { $exists: true }, members: { $not: { $elemMatch: { $nin: ids } } } };
};

// Throws 403 unless every id is an active user of the sender's department.
const assertDepartmentRecipients = async (user, ids = []) => {
  const dept = chatDepartmentOf(user);
  const unique = Array.from(new Set(ids.filter(Boolean).map(idOf)));
  if (!unique.length) throw forbidden(dept);
  const count = await User.countDocuments({ _id: { $in: unique }, role: { $in: rolesForDepartment(dept) }, isActive: { $ne: false } });
  if (count !== unique.length) throw forbidden(dept);
};

// Throws 403 unless the given (ids or populated docs) chat members are all in the user's department.
const assertDepartmentThreadMembers = async (user, members = []) => {
  const dept = chatDepartmentOf(user);
  const unique = Array.from(new Set((members || []).map(idOf)));
  if (!unique.length) throw forbidden(dept);
  const count = await User.countDocuments({ _id: { $in: unique }, role: { $in: rolesForDepartment(dept) } });
  if (count !== unique.length) throw forbidden(dept, 'Conversation not found or access denied');
};

module.exports = {
  DEPARTMENT_CHAT_ROLES,
  chatDepartmentOf,
  isDepartmentChatUser,
  rolesForDepartment,
  departmentOnlyThreadFilter,
  assertDepartmentRecipients,
  assertDepartmentThreadMembers,
};
