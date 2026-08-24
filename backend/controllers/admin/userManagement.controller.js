const logger = require('../../utils/logger');
// backend/controllers/dept/admin.controller.js
const User = require('../../models/auth/User');
const ActivityLog = require('../../models/auth/ActivityLog');
const logService = require('../../services/log.service');
const { ROLES } = require('../../config/roles');
const { getDepartmentForRole } = require('../../utils/roleAllocation');

const USER_ACCOUNT_STATUSES = ['active', 'inactive', 'suspended', 'blocked', 'pending_verification'];

const ALLOWED_METADATA_FIELDS = [
  'positionFocus',
  'positionLevel',
  'employmentType',
  'workMode',
  'teamName',
  'startDate',
  'skills',
  'accessLevel',
  'projectAssignments',
  'projectAccess',
  'projectRoles',
  'notes'
];

const isLegacyEmployeeUser = (user) => String(user?.role || '').trim().toLowerCase() === 'employee';

const prepareMetadataPayload = (metadata) => {
  const sanitized = {};
  const fieldsToRemove = [];

  if (!metadata || typeof metadata !== 'object') {
    return { sanitized, fieldsToRemove };
  }

  ALLOWED_METADATA_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(metadata, field)) {
      return;
    }

    const rawValue = metadata[field];

    if (rawValue === undefined) {
      return;
    }

    if (rawValue === null || (typeof rawValue === 'string' && rawValue.trim() === '')) {
      fieldsToRemove.push(field);
      return;
    }

    if (field === 'skills') {
      if (Array.isArray(rawValue)) {
        const cleanedSkills = rawValue
          .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
          .filter(Boolean)
          .slice(0, 20);

        if (cleanedSkills.length > 0) {
          sanitized.skills = cleanedSkills;
        } else {
          fieldsToRemove.push(field);
        }
      }
      return;
    }

    if (field === 'projectAssignments' || field === 'projectAccess' || field === 'projectRoles') {
      if (!Array.isArray(rawValue)) {
        fieldsToRemove.push(field);
        return;
      }

      const cleanedAssignments = rawValue
        .map((item) => {
          if (typeof item === 'string') {
            const value = item.trim();
            return value ? value : null;
          }
          if (!item || typeof item !== 'object') return null;
          const cleaned = {};
          if (typeof item.projectId === 'string' && item.projectId.trim()) cleaned.projectId = item.projectId.trim();
          if (typeof item.projectCode === 'string' && item.projectCode.trim()) cleaned.projectCode = item.projectCode.trim();
          if (typeof item.projectName === 'string' && item.projectName.trim()) cleaned.projectName = item.projectName.trim();
          if (typeof item.role === 'string' && item.role.trim()) cleaned.role = item.role.trim();
          if (Array.isArray(item.permissions)) {
            const permissions = item.permissions
              .map((permission) => (typeof permission === 'string' ? permission.trim() : ''))
              .filter(Boolean);
            if (permissions.length > 0) cleaned.permissions = permissions;
          }
          if (Array.isArray(item.modules)) {
            const modules = item.modules
              .map((module) => (typeof module === 'string' ? module.trim() : ''))
              .filter(Boolean);
            if (modules.length > 0) cleaned.modules = modules;
          }
          if (Array.isArray(item.pages)) {
            const pages = item.pages
              .map((page) => (typeof page === 'string' ? page.trim() : ''))
              .filter(Boolean);
            if (pages.length > 0) cleaned.pages = pages;
          }
          if (Array.isArray(item.actions)) {
            const actions = item.actions
              .map((action) => (typeof action === 'string' ? action.trim() : ''))
              .filter(Boolean);
            if (actions.length > 0) cleaned.actions = actions;
          }
          return Object.keys(cleaned).length > 0 ? cleaned : null;
        })
        .filter(Boolean)
        .slice(0, 100);

      if (cleanedAssignments.length > 0) {
        sanitized[field] = cleanedAssignments;
      } else {
        fieldsToRemove.push(field);
      }
      return;
    }

    if (field === 'startDate') {
      const parsedDate = new Date(rawValue);
      if (!Number.isNaN(parsedDate.getTime())) {
        sanitized.startDate = parsedDate;
      } else {
        fieldsToRemove.push(field);
      }
      return;
    }

    sanitized[field] = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  });

  return { sanitized, fieldsToRemove };
};

const writeActivity = async (req, action, targetUser, metadata = {}) => {
  try {
    await ActivityLog.create({
      actor: req.user?.id,
      user: targetUser?._id,
      action,
      module: 'users',
      targetType: 'User',
      targetId: targetUser?._id?.toString(),
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    const eventMap = {
      'user.created': 'USER_CREATED',
      'user.updated': metadata.roleChanged ? 'ROLE_CHANGED' : metadata.permissionsChanged ? 'PERMISSION_CHANGED' : 'USER_UPDATED',
      'user.deleted': 'USER_DELETED',
      'user.activated': 'STATUS_CHANGE',
      'user.deactivated': 'STATUS_CHANGE',
      'user.active': 'STATUS_CHANGE',
      'user.inactive': 'STATUS_CHANGE',
      'user.suspended': 'ACCOUNT_LOCKED',
      'user.blocked': 'ACCOUNT_LOCKED',
      'user.pending_verification': 'STATUS_CHANGE',
    };
    logService.fireAndForgetFromRequest(req, {
      level: 'info',
      event: eventMap[action] || action.replace(/[^a-z0-9]+/gi, '_').toUpperCase(),
      emit: false,
      module: 'users',
      action: action.replace(/^user\./, '').toUpperCase(),
      message:
        action === 'user.created'
          ? 'User created successfully'
          : action === 'user.deleted'
            ? 'User deleted successfully'
            : metadata.roleChanged
              ? 'User role updated'
              : metadata.permissionsChanged
                ? 'User permissions updated'
                : action.startsWith('user.')
                  ? 'User updated successfully'
                  : 'User activity recorded',
      statusCode: req.res?.statusCode,
      targetId: targetUser?._id?.toString(),
      metadata: {
        targetUserId: targetUser?._id?.toString(),
        targetUserEmail: targetUser?.email,
        targetUserRole: targetUser?.role,
        ...metadata,
      },
    });
  } catch (error) {
    logger.warn({ err: error, action }, 'Failed to write user activity log');
  }
};

/**
 * @route   GET /api/dept/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (ADMIN only)
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    const [usersByRole, departmentStats] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { department: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        departmentStats,
        totalDepartments: departmentStats.length
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Admin dashboard error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/admin/users
 * @desc    Get all users (with pagination and filtering)
 * @access  Private (ADMIN only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, accountStatus, department, search } = req.query;

    const query = {};
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    if (role) {
      const roleList = String(role).split(',').map((r) => r.trim()).filter(Boolean);
      query.role = roleList.length > 1 ? { $in: roleList } : roleList[0];
    }
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (accountStatus) query.accountStatus = accountStatus;
    if (department) query.department = { $regex: department, $options: 'i' };
    if (search) {
      const searchPattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { firstName: { $regex: searchPattern, $options: 'i' } },
        { lastName: { $regex: searchPattern, $options: 'i' } },
        { email: { $regex: searchPattern, $options: 'i' } },
        { department: { $regex: searchPattern, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / safeLimit),
        currentPage: safePage,
        pageSize: safeLimit,
        totalUsers: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get all users error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (ADMIN only)
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Get user by ID error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/admin/users
 * @desc    Create new user
 * @access  Private (ADMIN only)
 */
exports.createUser = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phone, department, accountStatus, permissions, metadata } = req.body;

    // Validation
    if (!email || !password || !role || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, role, firstName, and lastName are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Validate role
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }
    if (String(role).trim().toLowerCase() === 'employee') {
      return res.status(400).json({
        success: false,
        error: 'Employee role is deprecated. Choose a portal role such as freelancer, manager, hr, it, law, media, finance, sales, or research_operator.'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const { sanitized: metadataPayload } = prepareMetadataPayload(metadata);
    const selectedStatus = USER_ACCOUNT_STATUSES.includes(accountStatus) ? accountStatus : 'active';
    const selectedPermissions = Array.isArray(permissions)
      ? Array.from(new Set(permissions.filter((permission) => typeof permission === 'string' && permission.trim()).map((permission) => permission.trim())))
      : [];

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      department: getDepartmentForRole(role, department),
      isActive: selectedStatus === 'active',
      accountStatus: selectedStatus,
      permissions: selectedPermissions,
      metadata: metadataPayload
    });

    await writeActivity(req, 'user.created', user, { role: user.role, accountStatus: user.accountStatus });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Create user error');

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/admin/users/:id
 * @desc    Update user
 * @access  Private (ADMIN only)
 */
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phone, department, role, isActive, accountStatus, permissions, metadata } = req.body;

    // Validate ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const previousRole = user.role;
    const previousPermissions = Array.isArray(user.permissions) ? [...user.permissions] : [];

    // Validate role if provided
    if (role) {
      const validRoles = Object.values(ROLES);
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        });
      }
      if (String(role).trim().toLowerCase() === 'employee') {
        return res.status(400).json({
          success: false,
          error: 'Employee role is deprecated. Choose a portal role such as freelancer, manager, hr, it, law, media, finance, sales, or research_operator.'
        });
      }
      if (isLegacyEmployeeUser(user)) {
        return res.status(403).json({
          success: false,
          error: 'Legacy employee users are read-only and cannot be re-assigned from the admin portal.'
        });
      }
      user.role = role;
    }

    if (isLegacyEmployeeUser(user)) {
      return res.status(403).json({
        success: false,
        error: 'Legacy employee users are read-only and cannot be updated from the admin portal.'
      });
    }

    // Update fields with validation
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone) user.phone = phone.trim();
    if (role) user.department = getDepartmentForRole(role, department || user.department);
    else if (department) user.department = department.trim();
    if (accountStatus !== undefined) {
      if (!USER_ACCOUNT_STATUSES.includes(accountStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid accountStatus. Valid statuses are: ${USER_ACCOUNT_STATUSES.join(', ')}`
        });
      }
      user.accountStatus = accountStatus;
      user.isActive = accountStatus === 'active';
    } else if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
      user.accountStatus = user.isActive ? 'active' : 'inactive';
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'permissions must be an array'
        });
      }
      user.permissions = Array.from(new Set(
        permissions
          .filter((permission) => typeof permission === 'string' && permission.trim())
          .map((permission) => permission.trim())
      ));
    }

    if (metadata !== undefined) {
      const { sanitized, fieldsToRemove } = prepareMetadataPayload(metadata);
      const currentMetadata = user.metadata || {};

      fieldsToRemove.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(currentMetadata, field)) {
          delete currentMetadata[field];
        }
      });

      user.metadata = {
        ...currentMetadata,
        ...sanitized
      };
      user.markModified('metadata');
    }

    await user.save();
    await writeActivity(req, 'user.updated', user, {
      role: user.role,
      accountStatus: user.accountStatus,
      isActive: user.isActive,
      roleChanged: previousRole !== user.role,
      permissionsChanged: JSON.stringify(previousPermissions.sort()) !== JSON.stringify([...(user.permissions || [])].sort())
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Update user error');

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/dept/admin/users/:id
 * @desc    Delete user
 * @access  Private (ADMIN only)
 */
exports.deleteUser = async (req, res) => {
  try {
    // Validate ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    if (isLegacyEmployeeUser(user)) {
      return res.status(403).json({
        success: false,
        error: 'Legacy employee users are read-only and cannot be deleted from the admin portal.'
      });
    }

    // Prevent deleting yourself
    if (req.user && req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    await user.deleteOne();
    await writeActivity(req, 'user.deleted', user, { email: user.email, role: user.role });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete user error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/admin/users/:id/toggle-status
 * @desc    Toggle user active status
 * @access  Private (ADMIN only)
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    // Validate ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    if (isLegacyEmployeeUser(user)) {
      return res.status(403).json({
        success: false,
        error: 'Legacy employee users are read-only and cannot be changed from the admin portal.'
      });
    }

    // Prevent deactivating yourself
    if (req.user && req.user.id === req.params.id && user.isActive) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    user.isActive = !user.isActive;
    user.accountStatus = user.isActive ? 'active' : 'inactive';
    await user.save();
    await writeActivity(req, user.isActive ? 'user.activated' : 'user.deactivated', user, {
      accountStatus: user.accountStatus
    });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Toggle user status error');
    res.status(500).json({
      success: false,
      error: 'Failed to toggle user status',
      details: error.message
    });
  }
};

/**
 * @route   PATCH /api/dept/admin/users/:id/status
 * @desc    Set user account status
 * @access  Private (ADMIN only)
 */
exports.setUserStatus = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    const { accountStatus } = req.body || {};
    if (!USER_ACCOUNT_STATUSES.includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid accountStatus. Valid statuses are: ${USER_ACCOUNT_STATUSES.join(', ')}`
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (isLegacyEmployeeUser(user)) {
      return res.status(403).json({
        success: false,
        error: 'Legacy employee users are read-only and cannot be changed from the admin portal.'
      });
    }

    if (req.user && req.user.id.toString() === req.params.id && accountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'You cannot restrict your own account'
      });
    }

    user.accountStatus = accountStatus;
    user.isActive = accountStatus === 'active';
    await user.save();

    await writeActivity(req, `user.${accountStatus}`, user, { accountStatus });

    return res.status(200).json({
      success: true,
      message: `User status updated to ${accountStatus}`,
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Set user status error');
    return res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/admin/users/export
 * @desc    Export users as CSV
 * @access  Private (ADMIN only)
 */
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find().select('firstName lastName email role department accountStatus isActive lastLogin createdAt').sort({ createdAt: -1 });
    const headers = ['firstName', 'lastName', 'email', 'role', 'department', 'accountStatus', 'isActive', 'lastLogin', 'createdAt'];
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = users.map((user) => headers.map((header) => escapeCsv(user[header])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    logger.error({ err: error }, 'Export users error');
    return res.status(500).json({
      success: false,
      error: 'Failed to export users',
      details: error.message
    });
  }
};
