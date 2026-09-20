const User = require('../../models/auth/User');
const asyncHandler = require('../../utils/asyncHandler');
const { rolesForDepartment } = require('../../utils/departmentChatScope');

const deriveStatus = (lastLogin) => {
  if (!lastLogin) return 'Offline';
  const diffHours = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
  if (diffHours < 2) return 'Available';
  if (diffHours < 24) return 'Away';
  return 'Offline';
};

// Team directory for a grouped department (law | it | finance | media): only users holding one of
// that department's roles, in the same shape as the employee team directory ({ members }) so
// PortalChat and the shared team page can consume it unchanged. Also the only contacts list the
// department chat offers, so no outsider can be picked.
const buildDepartmentTeam = async (dept) => {
  const members = await User.find({ role: { $in: rolesForDepartment(dept) }, isActive: { $ne: false } })
    .sort({ firstName: 1, lastName: 1 })
    .select('firstName lastName role email phone department lastLogin profileImage metadata');
  return {
    members: members.map((member) => ({
      id: member._id,
      name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email,
      role: member.role,
      title: member.metadata?.title || member.role,
      email: member.email,
      phone: member.phone,
      department: member.department,
      status: deriveStatus(member.lastLogin),
      lastLogin: member.lastLogin,
      avatar: member.profileImage || null,
    })),
    total: members.length,
    updatedAt: new Date().toISOString(),
  };
};

exports.buildDepartmentTeam = buildDepartmentTeam;
exports.getTeamFor = (dept) => asyncHandler(async (req, res) => {
  res.json({ success: true, data: await buildDepartmentTeam(dept) });
});
