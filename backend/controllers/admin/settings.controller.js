const logger = require('../../utils/logger');
const Setting = require('../../models/admin/Setting');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.find().sort({ key: 1 });
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch settings');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      details: error.message,
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const payload = req.body || {};
    const actorId = req.user?.id || req.user?._id;

    if (Array.isArray(payload.settings)) {
      const operations = payload.settings
        .filter((item) => item && typeof item.key === 'string' && item.key.trim())
        .map((item) =>
          Setting.findOneAndUpdate(
            { key: item.key.trim() },
            { value: item.value, updatedBy: actorId },
            { new: true, upsert: true, runValidators: true }
          )
        );

      const updated = await Promise.all(operations);
      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: updated,
      });
    }

    const { key, value } = payload;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Setting key is required',
      });
    }

    const updated = await Setting.findOneAndUpdate(
      { key: key.trim() },
      { value, updatedBy: actorId },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update settings');
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message,
    });
  }
};
