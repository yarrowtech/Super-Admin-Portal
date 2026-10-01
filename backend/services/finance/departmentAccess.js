'use strict';
// Departmental silos for finance approvals: a department head may only act on their own
// department's records. Finance (and above) sees everything, because finance is the
// cross-departmental control function.
const Department = require('../../models/department/Department');

// Role -> the department CODE it owns. Codes come from the Department collection.
const ROLE_DEPARTMENT = {
  it_manager: 'IT',
  it_admin: 'IT',
  media_head: 'MEDIA',
  law_head: 'LAW',
  hr: 'HR',
  it_hr: 'HR',
};

// Roles that may act on every department's finances. Deliberately heads-only: a finance
// employee prepares and verifies but never approves, so they are not listed here (they
// read across departments, which is enforced by the read routes, not by this guard).
const CROSS_DEPARTMENT = new Set(['finance_manager', 'admin', 'super_admin']);

const roleOf = (user) => String(user?.role || '').toLowerCase();

const seesAllDepartments = (user) => CROSS_DEPARTMENT.has(roleOf(user));

// The department id this user is confined to, or null when they see everything.
// Returns undefined when the role maps to a department that does not exist, which the
// caller must treat as "no access" rather than "all access".
async function scopeFor(user, session = null) {
  if (seesAllDepartments(user)) return null;
  const code = ROLE_DEPARTMENT[roleOf(user)];
  if (!code) return undefined;
  const query = Department.findOne({ code }, '_id');
  const dept = await (session ? query.session(session) : query).lean();
  return dept ? dept._id : undefined;
}

// Throws unless `user` may act on a record belonging to `departmentId`.
async function assertDepartmentAccess(user, departmentId, session = null) {
  const scope = await scopeFor(user, session);
  if (scope === null) return;
  const fail = (message) => { throw Object.assign(new Error(message), { statusCode: 403 }); };
  if (scope === undefined) fail('Your role is not assigned to a department that can approve finance records');
  if (!departmentId || String(scope) !== String(departmentId)) {
    fail('This record belongs to another department; only its own head or Finance can act on it');
  }
}

module.exports = { assertDepartmentAccess, scopeFor, seesAllDepartments, ROLE_DEPARTMENT };
