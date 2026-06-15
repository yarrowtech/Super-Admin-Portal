const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const PortalAccess = require('../../models/superAdmin/PortalAccess');

exports.getPortalAccess = async (req, res) => {
  try {
    const { role, portal } = req.query;
    const query = {};

    if (role) query.role = role;
    if (portal) query.portal = portal;

    const accessRules = await PortalAccess.find(query).sort({ role: 1, portal: 1 });

    return res.status(200).json({
      success: true,
      data: accessRules,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch portal access rules');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch portal access rules',
      details: error.message,
    });
  }
};

exports.updatePortalAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { canAccess, role, portal } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portal access id',
      });
    }

    const update = {};
    if (canAccess !== undefined) update.canAccess = Boolean(canAccess);
    if (role !== undefined) update.role = role;
    if (portal !== undefined) update.portal = portal;

    const updated = await PortalAccess.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Portal access rule not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Portal access rule updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update portal access rule');
    return res.status(500).json({
      success: false,
      error: 'Failed to update portal access rule',
      details: error.message,
    });
  }
};
