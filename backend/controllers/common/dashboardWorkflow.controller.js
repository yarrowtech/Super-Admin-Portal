const logger = require('../../utils/logger');
const { ROLES } = require('../../config/roles');
const { getWorkflowByRole, getWorkflowStages, roleWorkflows } = require('../../services/dashboardWorkflow.service');

const ALL_ROLES = Object.values(ROLES);

exports.getMyDashboardWorkflow = async (req, res) => {
  try {
    const role = req.user?.role;
    const workflow = getWorkflowByRole(role);
    const stages = getWorkflowStages(role);
    return res.status(200).json({
      success: true,
      data: {
        role,
        workflow,
        stages,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get my dashboard workflow error');
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard workflow' });
  }
};

exports.getAllDashboardWorkflows = async (req, res) => {
  try {
    const workflows = ALL_ROLES.map((role) => ({
      role,
      workflow: getWorkflowByRole(role),
      stages: getWorkflowStages(role),
    }));
    return res.status(200).json({
      success: true,
      data: {
        workflows,
        registry: roleWorkflows,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get all dashboard workflows error');
    return res.status(500).json({ success: false, error: 'Failed to fetch workflows' });
  }
};

