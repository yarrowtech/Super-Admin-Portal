const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const FeatureFlag = require('../../models/superAdmin/FeatureFlag');

exports.getFeatureFlags = async (req, res) => {
  try {
    const { enabled, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    if (search) {
      query.$or = [
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      FeatureFlag.find(query).sort({ updatedAt: -1 }).skip(skip).limit(safeLimit),
      FeatureFlag.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch feature flags');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags',
      details: error.message,
    });
  }
};

exports.updateFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, rollout, description } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feature flag id',
      });
    }

    const update = {};
    if (enabled !== undefined) update.enabled = Boolean(enabled);
    if (rollout !== undefined) update.rollout = Number(rollout);
    if (description !== undefined) update.description = description;

    const updated = await FeatureFlag.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feature flag updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update feature flag');
    return res.status(500).json({
      success: false,
      error: 'Failed to update feature flag',
      details: error.message,
    });
  }
};
