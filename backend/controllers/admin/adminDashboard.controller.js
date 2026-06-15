const logger = require('../../utils/logger');
// backend/controllers/dept/admin.controller.js
const User = require('../../models/auth/User');
const OutsourcingJob = require('../../models/outsourcing/OutsourcingJob');
const OutsourcingContract = require('../../models/outsourcing/OutsourcingContract');
const OutsourcingTimeLog = require('../../models/outsourcing/OutsourcingTimeLog');
const { ROLES } = require('../../config/roles');

const ALLOWED_METADATA_FIELDS = [
  'positionFocus',
  'positionLevel',
  'employmentType',
  'workMode',
  'teamName',
  'startDate',
  'skills',
  'accessLevel',
  'notes'
];

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

/**
 * @route   GET /api/dept/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (ADMIN only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      newUsersLast7Days,
      usersByRoleRaw,
      departmentStatsRaw,
      recentUsers,
      employeeCount,
      managerCount,
      outsourcingJobsOpen,
      outsourcingContractsActive,
      outsourcingLogsPending
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { department: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.find()
        .select('firstName lastName email role department isActive createdAt lastLogin')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.countDocuments({ role: ROLES.EMPLOYEE }),
      User.countDocuments({ role: ROLES.MANAGER }),
      OutsourcingJob.countDocuments({ status: { $in: ['pending', 'accepted', 'in_progress'] } }),
      OutsourcingContract.countDocuments({ status: 'active' }),
      OutsourcingTimeLog.countDocuments({ verificationStatus: 'pending' })
    ]);

    const usersByRole = usersByRoleRaw
      .filter((entry) => entry && entry._id)
      .sort((a, b) => b.count - a.count);

    const departmentStats = departmentStatsRaw.map((entry) => ({
      _id: String(entry._id).trim(),
      count: entry.count
    }));

    const inactiveUsers = totalUsers - activeUsers;
    const activeUserRate = totalUsers > 0 ? Number(((activeUsers / totalUsers) * 100).toFixed(2)) : 0;
    const roleCoverage = usersByRole.length;
    const recentLoginCount = recentUsers.filter((user) => Boolean(user.lastLogin)).length;

    const systemHealth = activeUserRate >= 70 ? 'good' : activeUserRate >= 40 ? 'warning' : 'critical';

    const roleCounts = usersByRole.reduce((acc, roleItem) => {
      acc[roleItem._id] = roleItem.count;
      return acc;
    }, {});

    const topDepartment = departmentStats[0] || null;

    const summary = {
      activeUserRate,
      newUsersLast7Days,
      recentLoginCount,
      roleCoverage,
      systemHealth,
      generatedAt: now.toISOString()
    };

    const insights = {
      topDepartment,
      largestRole: usersByRole[0] || null
    };

    const workforce = {
      employees: employeeCount,
      managers: managerCount,
      externalWorkload: {
        openJobs: outsourcingJobsOpen,
        activeContracts: outsourcingContractsActive,
        pendingLogs: outsourcingLogsPending
      }
    };

    const users = {
      byRole: roleCounts,
      recent: recentUsers
    };

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        departmentStats,
        totalDepartments: departmentStats.length,
        summary,
        insights,
        workforce,
        users
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
    const { page = 1, limit = 10, role, isActive, search } = req.query;

    const query = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
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
    const { email, password, role, firstName, lastName, phone, department, metadata } = req.body;

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

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const { sanitized: metadataPayload } = prepareMetadataPayload(metadata);

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      department: department?.trim(),
      metadata: metadataPayload
    });

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
    const { firstName, lastName, phone, department, role, isActive, metadata } = req.body;

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

    // Validate role if provided
    if (role) {
      const validRoles = Object.values(ROLES);
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        });
      }
      user.role = role;
    }

    // Update fields with validation
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone) user.phone = phone.trim();
    if (department) user.department = department.trim();
    if (isActive !== undefined) user.isActive = isActive;

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

    // Prevent deleting yourself
    if (req.user && req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    await user.deleteOne();

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

    // Prevent deactivating yourself
    if (req.user && req.user.id === req.params.id && user.isActive) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

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
