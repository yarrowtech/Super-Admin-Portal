const logger = require('../../utils/logger');
const FeatureFlag = require('../../models/superAdmin/FeatureFlag');
const PortalAccess = require('../../models/superAdmin/PortalAccess');
const SystemHealth = require('../../models/superAdmin/SystemHealth');
const CompanyControl = require('../../models/superAdmin/CompanyControl');
const User = require('../../models/auth/User');
const ActivityLog = require('../../models/auth/ActivityLog');
const Task = require('../../models/common/Task');
const Project = require('../../models/common/Project');

const featureFlagsController = require('./featureFlags.controller');
const portalAccessController = require('./portalAccess.controller');
const systemHealthController = require('./systemHealth.controller');
const companyControlsController = require('./companyControls.controller');
const { ensureSuperAdminDefaults } = require('../../utils/bootstrapSuperAdminData');
const {
  PROJECT_REGISTRY,
  findProjectByCode,
  matchesProject,
  normalizeProjectKey,
} = require('../../utils/projectAccess');

const normalizeProjectAssignments = (input = []) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (typeof entry === 'string') {
        const canonical = findProjectByCode(entry);
        return canonical
          ? { projectCode: canonical.code, projectName: canonical.name }
          : null;
      }
      if (!entry || typeof entry !== 'object') return null;

      const canonical = findProjectByCode(entry.projectCode || entry.projectName || entry.projectId);
      if (!canonical) return null;

      const cleaned = {};
      if (typeof entry.projectId === 'string' && entry.projectId.trim()) cleaned.projectId = entry.projectId.trim();
      cleaned.projectCode = canonical.code;
      cleaned.projectName = canonical.name;
      if (typeof entry.role === 'string' && entry.role.trim()) cleaned.role = entry.role.trim();

      const permissions = Array.isArray(entry.permissions)
        ? entry.permissions.map((permission) => (typeof permission === 'string' ? permission.trim() : '')).filter(Boolean)
        : [];
      if (permissions.length > 0) cleaned.permissions = permissions;

      const modules = Array.isArray(entry.modules)
        ? entry.modules.map((module) => (typeof module === 'string' ? module.trim() : '')).filter(Boolean)
        : [];
      if (modules.length > 0) cleaned.modules = modules;

      const pages = Array.isArray(entry.pages)
        ? entry.pages.map((page) => (typeof page === 'string' ? page.trim() : '')).filter(Boolean)
        : [];
      if (pages.length > 0) cleaned.pages = pages;

      const actions = Array.isArray(entry.actions)
        ? entry.actions.map((action) => (typeof action === 'string' ? action.trim() : '')).filter(Boolean)
        : [];
      if (actions.length > 0) cleaned.actions = actions;

      return Object.keys(cleaned).length > 0 ? cleaned : null;
    })
    .filter(Boolean)
    .slice(0, 100);
};

const extractProjectAssignments = (user = {}) => {
  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  return normalizeProjectAssignments(metadata.projectAssignments || metadata.assignedProjects || user.projectAssignments || []);
};

exports.getDashboard = async (req, res) => {
  try {
    await ensureSuperAdminDefaults();

    const [
      totalUsers,
      activeUsers,
      openTasks,
      enabledFlags,
      totalFlags,
      totalPortalAccessRules,
      totalCompanyControls,
      healthRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Task.countDocuments({ status: { $in: ['pending', 'in-progress', 'review'] } }),
      FeatureFlag.countDocuments({ enabled: true }),
      FeatureFlag.countDocuments(),
      PortalAccess.countDocuments(),
      CompanyControl.countDocuments(),
      SystemHealth.find().sort({ checkedAt: -1 }).limit(50),
    ]);

    const degradedServices = healthRows.filter((item) => item.status === 'degraded').length;
    const downServices = healthRows.filter((item) => item.status === 'down').length;

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: Math.max(totalUsers - activeUsers, 0),
        },
        projects: {
          total: PROJECT_REGISTRY.length,
          active: PROJECT_REGISTRY.length,
        },
        tasks: {
          open: openTasks,
        },
        featureFlags: {
          enabled: enabledFlags,
          total: totalFlags,
        },
        platformControls: {
          portalAccessRules: totalPortalAccessRules,
          companyControls: totalCompanyControls,
        },
        systemHealth: {
          degradedServices,
          downServices,
          overall: downServices > 0 ? 'down' : degradedServices > 0 ? 'degraded' : 'healthy',
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch super admin dashboard');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch super admin dashboard',
      details: error.message,
    });
  }
};

exports.getProjectAllocations = async (req, res) => {
  try {
    const [projectDocs, users] = await Promise.all([
      Project.find({}, 'name projectCode status progress deadline projectManager teamMembers updatedAt').sort({ updatedAt: -1 }).lean(),
      User.find({}, 'firstName lastName email role department metadata isActive accountStatus lastLogin createdAt').sort({ createdAt: -1 }).lean(),
    ]);

    const docByProject = new Map();
    projectDocs.forEach((project) => {
      const canonical = findProjectByCode(project.projectCode || project.name);
      if (!canonical) return;
      const key = normalizeProjectKey(canonical.code);
      if (!docByProject.has(key)) docByProject.set(key, project);
    });

    const projectRows = PROJECT_REGISTRY.map((project) => {
      const linkedDoc = docByProject.get(normalizeProjectKey(project.code)) || {};
      const assignments = users.filter((user) =>
        extractProjectAssignments(user).some((assignment) => matchesProject(assignment, project))
      );
      return {
        ...linkedDoc,
        _id: linkedDoc._id || project.code,
        name: project.name,
        projectCode: project.code,
        description: project.description,
        status: linkedDoc.status || 'active',
        progress: linkedDoc.progress ?? 100,
        deadline: linkedDoc.deadline || null,
        launchUrl: project.launchUrl,
        ssoPath: project.ssoPath,
        apiOnly: Boolean(project.apiOnly),
        assignedUsers: assignments.length,
      };
    });

    const userRows = users.map((user) => {
      const assignedProjects = extractProjectAssignments(user);
      return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        department: user.department,
        accountStatus: user.accountStatus,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        assignedProjects,
        assignedProjectCount: assignedProjects.length,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        projects: projectRows,
        users: userRows,
        summary: {
          totalProjects: projectRows.length,
          totalUsers: userRows.length,
          allocatedUsers: userRows.filter((user) => user.assignedProjectCount > 0).length,
          unallocatedUsers: userRows.filter((user) => user.assignedProjectCount === 0).length,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch project allocations');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch project allocations',
      details: error.message,
    });
  }
};

exports.updateProjectAllocations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { projectAssignments = [], projectAccess = [] } = req.body || {};

    if (!userId || !String(userId).match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user id',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const sanitizedAssignments = normalizeProjectAssignments(projectAssignments);
    const sanitizedAccess = normalizeProjectAssignments(projectAccess);

    user.metadata = {
      ...metadata,
      projectAssignments: sanitizedAssignments,
    };
    if (sanitizedAccess.length > 0) {
      user.metadata.projectAccess = sanitizedAccess;
    } else if (metadata.projectAccess) {
      delete user.metadata.projectAccess;
    }
    user.markModified('metadata');
    await user.save();

    await ActivityLog.create({
      actor: req.user?.id,
      user: user._id,
      action: 'super_admin.project_allocated',
      module: 'super-admin',
      targetType: 'User',
      targetId: user._id.toString(),
      metadata: {
        projectAssignments: sanitizedAssignments,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(200).json({
      success: true,
      message: 'Project allocations updated successfully',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          metadata: user.metadata,
          assignedProjects: sanitizedAssignments,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update project allocations');
    return res.status(500).json({
      success: false,
      error: 'Failed to update project allocations',
      details: error.message,
    });
  }
};

exports.getFeatureFlags = featureFlagsController.getFeatureFlags;
exports.updateFeatureFlag = featureFlagsController.updateFeatureFlag;
exports.getPortalAccess = portalAccessController.getPortalAccess;
exports.updatePortalAccess = portalAccessController.updatePortalAccess;
exports.getSystemHealth = systemHealthController.getSystemHealth;
exports.getCompanyControls = companyControlsController.getCompanyControls;
exports.updateCompanyControl = companyControlsController.updateCompanyControl;
