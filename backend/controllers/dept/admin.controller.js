// backend/controllers/dept/admin.controller.js
const User = require('../../models/User');
const { ROLES } = require('../../config/roles');

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
    console.error('Admin dashboard error:', error);
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
    console.error('Get all users error:', error);
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
    console.error('Get user by ID error:', error);
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
    const { email, password, role, firstName, lastName, phone, department } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
      department
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.toSafeObject()
    });
  } catch (error) {
    console.error('Create user error:', error);
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
    const { firstName, lastName, phone, department, role, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user.toSafeObject()
    });
  } catch (error) {
    console.error('Update user error:', error);
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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle user status',
      details: error.message
    });
  }
};
