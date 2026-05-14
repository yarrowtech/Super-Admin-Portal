const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const CompanyControl = require('../../models/superAdmin/CompanyControl');

exports.getCompanyControls = async (req, res) => {
  try {
    const controls = await CompanyControl.find().sort({ key: 1 });
    return res.status(200).json({
      success: true,
      data: controls,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch company controls');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch company controls',
      details: error.message,
    });
  }
};

exports.updateCompanyControl = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, note } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company control id',
      });
    }

    const updated = await CompanyControl.findByIdAndUpdate(
      id,
      { value, note },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Company control not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Company control updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update company control');
    return res.status(500).json({
      success: false,
      error: 'Failed to update company control',
      details: error.message,
    });
  }
};

exports.updateCompanyControls = exports.updateCompanyControl;
