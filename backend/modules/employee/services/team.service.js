const User = require('../../shared/models/User');

const deriveStatus = (lastLogin) => {
  if (!lastLogin) {
    return 'Offline';
  }
  const diffHours = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
  if (diffHours < 2) return 'Available';
  if (diffHours < 24) return 'Away';
  return 'Offline';
};

const getTeamDirectory = async (user) => {
  const department = user?.department;
  if (!department) {
    throw new Error('User department is required to fetch the team');
  }

  const members = await User.find({ department, isActive: true })
    .sort({ firstName: 1 })
    .select('firstName lastName role email phone department lastLogin profileImage metadata');

  return {
    members: members.map((member) => ({
      id: member._id,
      name: `${member.firstName} ${member.lastName}`,
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

module.exports = {
  getTeamDirectory,
};
