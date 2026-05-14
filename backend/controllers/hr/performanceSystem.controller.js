const apiResponse = require('../../utils/apiResponse');
const performanceService = require('../../services/performance/performanceSystem.service');

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

exports.getOverview = async (req, res) => {
  try {
    const data = await performanceService.getOverview({
      page: toPositiveInt(req.query.page, 1),
      limit: toPositiveInt(req.query.limit, 10),
      department: req.query.department,
      search: req.query.search,
      periodType: req.query.periodType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json(apiResponse.success(data, 'Performance overview fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch performance overview'));
  }
};

exports.getEmployeeSummary = async (req, res) => {
  try {
    const data = await performanceService.getEmployeeSummary({
      employeeId: req.params.employeeId,
      periodType: req.query.periodType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    if (!data) {
      return res.status(404).json(apiResponse.error('Employee performance summary not found'));
    }

    return res.status(200).json(apiResponse.success(data, 'Employee performance summary fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch employee performance summary'));
  }
};

exports.recalculateSnapshot = async (req, res) => {
  try {
    const data = await performanceService.upsertSnapshot({
      employeeId: req.params.employeeId,
      periodType: req.body.periodType || req.query.periodType,
      startDate: req.body.startDate || req.query.startDate,
      endDate: req.body.endDate || req.query.endDate,
      generatedBy: req.user?._id,
    });

    if (!data) {
      return res.status(404).json(apiResponse.error('Employee not found for snapshot generation'));
    }

    return res.status(200).json(apiResponse.success(data, 'Performance snapshot generated successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to generate performance snapshot'));
  }
};

exports.listSnapshots = async (req, res) => {
  try {
    const data = await performanceService.listSnapshots({
      page: toPositiveInt(req.query.page, 1),
      limit: toPositiveInt(req.query.limit, 10),
      department: req.query.department,
      rating: req.query.rating,
      periodType: req.query.periodType,
      employeeId: req.query.employeeId,
    });

    return res.status(200).json(apiResponse.success(data, 'Performance snapshots fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch performance snapshots'));
  }
};

exports.listAppraisalCycles = async (req, res) => {
  try {
    const data = await performanceService.listAppraisalCycles({
      status: req.query.status,
      cycleType: req.query.cycleType,
    });

    return res.status(200).json(apiResponse.success(data, 'Performance appraisal cycles fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch appraisal cycles'));
  }
};

exports.createAppraisalCycle = async (req, res) => {
  try {
    const { name, cycleType, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json(apiResponse.error('name, startDate, and endDate are required'));
    }

    const data = await performanceService.createAppraisalCycle({
      payload: {
        name: name.trim(),
        cycleType,
        startDate,
        endDate,
        reviewDeadline: req.body.reviewDeadline,
        status: req.body.status,
        eligibleDepartments: Array.isArray(req.body.eligibleDepartments) ? req.body.eligibleDepartments : [],
        notes: req.body.notes,
        metadata: req.body.metadata,
      },
      createdBy: req.user?._id,
    });

    return res.status(201).json(apiResponse.success(data, 'Performance appraisal cycle created successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to create appraisal cycle'));
  }
};
