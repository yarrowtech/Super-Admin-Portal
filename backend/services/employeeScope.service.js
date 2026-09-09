const { ROLES } = require('../config/roles');

// Existing HR workforce scope includes contractor/freelancer accounts.
// Platform administration accounts and applicants are not workforce members.
const PLATFORM_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO];
const employeeScope = ({ activeOnly = false } = {}) => ({
  role: { $nin: PLATFORM_ROLES },
  ...(activeOnly ? { isActive: true, accountStatus: { $nin: ['inactive', 'suspended', 'blocked', 'pending_verification'] } } : {}),
});
module.exports = { employeeScope, PLATFORM_ROLES };
