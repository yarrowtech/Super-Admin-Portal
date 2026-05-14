const logger = require('../../utils/logger');
const FeatureFlag = require('../../models/superAdmin/FeatureFlag');
const PortalAccess = require('../../models/superAdmin/PortalAccess');
const SystemHealth = require('../../models/superAdmin/SystemHealth');
const CompanyControl = require('../../models/superAdmin/CompanyControl');
const User = require('../../models/auth/User');
const Task = require('../../models/common/Task');
const Project = require('../../models/common/Project');

const featureFlagsController = require('./featureFlags.controller');
const portalAccessController = require('./portalAccess.controller');
const systemHealthController = require('./systemHealth.controller');
const companyControlsController = require('./companyControls.controller');
const { ensureSuperAdminDefaults } = require('../../utils/bootstrapSuperAdminData');

exports.getDashboard = async (req, res) => {
  try {
    await ensureSuperAdminDefaults();

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      activeProjects,
      openTasks,
      enabledFlags,
      totalFlags,
      totalPortalAccessRules,
      totalCompanyControls,
      healthRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Project.countDocuments(),
      Project.countDocuments({ status: { $in: ['planning', 'in-progress', 'on-hold'] } }),
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
          total: totalProjects,
          active: activeProjects,
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

exports.getFeatureFlags = featureFlagsController.getFeatureFlags;
exports.updateFeatureFlag = featureFlagsController.updateFeatureFlag;
exports.getPortalAccess = portalAccessController.getPortalAccess;
exports.updatePortalAccess = portalAccessController.updatePortalAccess;
exports.getSystemHealth = systemHealthController.getSystemHealth;
exports.getCompanyControls = companyControlsController.getCompanyControls;
exports.updateCompanyControl = companyControlsController.updateCompanyControl;
