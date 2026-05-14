const logger = require('../../utils/logger');
const Role = require('../../models/auth/Role');
const RolePermission = require('../../models/admin/RolePermission');
const { ROLES, ROLE_PERMISSIONS } = require('../../config/roles');

exports.createRole = async (req, res) => {
  try {
    const { roleName, description, permissions = [] } = req.body || {};

    if (!roleName || typeof roleName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'roleName is required',
      });
    }

    const normalizedRoleName = roleName.trim().toLowerCase();
    const existing = await Role.findOne({ name: normalizedRoleName });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Role already exists',
      });
    }

    const uniquePermissions = Array.from(new Set((Array.isArray(permissions) ? permissions : []).filter(Boolean)));

    const roleDoc = await Role.create({
      name: normalizedRoleName,
      description: typeof description === 'string' ? description.trim() : undefined,
      permissions: uniquePermissions,
      isActive: true,
    });

    if (uniquePermissions.length) {
      await RolePermission.insertMany(
        uniquePermissions.map((permission) => ({
          role: roleDoc._id,
          permission,
          granted: true,
        }))
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: roleDoc,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create role');
    return res.status(500).json({
      success: false,
      error: 'Failed to create role',
      details: error.message,
    });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    const rolePermissions = await RolePermission.find()
      .populate('role', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        builtInRoles: Object.values(ROLES),
        builtInPermissions: ROLE_PERMISSIONS,
        roles,
        rolePermissions,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch roles');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
      details: error.message,
    });
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const { roleName, permissions } = req.body || {};
    if (!roleName || typeof roleName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'roleName is required',
      });
    }

    const normalizedRoleName = roleName.trim().toLowerCase();
    const roleDoc = await Role.findOne({ name: normalizedRoleName });
    if (!roleDoc) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(200).json({
        success: true,
        message: 'Role updated without permission mapping changes',
        data: roleDoc,
      });
    }

    const uniquePermissions = Array.from(new Set(permissions.filter(Boolean)));
    roleDoc.permissions = uniquePermissions;
    await roleDoc.save();

    await RolePermission.deleteMany({ role: roleDoc._id });
    if (uniquePermissions.length) {
      await RolePermission.insertMany(
        uniquePermissions.map((permission) => ({
          role: roleDoc._id,
          permission,
          granted: true,
        }))
      );
    }

    const permissionRows = await RolePermission.find({ role: roleDoc._id }).sort({ permission: 1 });
    return res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        role: roleDoc,
        permissions: permissionRows,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update role permissions');
    return res.status(500).json({
      success: false,
      error: 'Failed to update role permissions',
      details: error.message,
    });
  }
};
