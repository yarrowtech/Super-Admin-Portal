// backend/controllers/dept/manager.controller.js

const { buildManagerSnapshot } = require('../../modules/manager/services/metrics.service');

/**
 * @route   GET /api/dept/manager/dashboard
 * @desc    Get Manager dashboard snapshot
 * @access  Private (MANAGER only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const snapshot = await buildManagerSnapshot(req.user);
    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Manager dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Manager dashboard',
      details: error.message,
    });
  }
};

/**
 * @route   GET /api/dept/manager/team
 * @desc    Get team members
 * @access  Private (MANAGER only)
 */
exports.getTeam = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Team Management',
        team: []
      }
    });
  } catch (error) {
    console.error('Manager team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/manager/projects
 * @desc    Get projects
 * @access  Private (MANAGER only)
 */
exports.getProjects = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Project Overview',
        projects: []
      }
    });
  } catch (error) {
    console.error('Manager projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      details: error.message
    });
  }
};
