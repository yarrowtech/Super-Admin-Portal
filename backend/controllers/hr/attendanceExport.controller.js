const apiResponse = require('../../utils/apiResponse');
const exportService = require('../../services/export/exportSystem.service');

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

exports.exportAttendanceCsv = async (req, res) => {
  const selectedIds = Array.isArray(req.body?.selectedIds) ? req.body.selectedIds.filter(Boolean) : [];

  try {
    const result = await exportService.exportAttendanceCsv({
      status: typeof req.query.status === 'string' ? req.query.status.trim() : '',
      startDate: typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '',
      endDate: typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '',
      selectedIds,
      requestedBy: req.user._id,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    await exportService.logFailedExport({
      portal: 'hr',
      module: 'attendance',
      filters: {
        status: typeof req.query.status === 'string' ? req.query.status.trim() : '',
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '',
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '',
      },
      scope: selectedIds.length > 0 ? 'selected' : ((req.query.status || req.query.startDate || req.query.endDate) ? 'filtered' : 'full'),
      selectedIds,
      requestedBy: req.user._id,
      errorMessage: error.message,
      fileName: `hr-attendance-export-${new Date().toISOString().slice(0, 10)}.csv`,
    }).catch(() => null);
    return res.status(500).json(apiResponse.error(error.message || 'Failed to export attendance'));
  }
};

exports.getAttendanceExportHistory = async (req, res) => {
  try {
    const data = await exportService.getExportHistory({
      requestedBy: req.user._id,
      portal: 'hr',
      module: 'attendance',
      page: toPositiveInt(req.query.page, 1),
      limit: toPositiveInt(req.query.limit, 10),
    });

    return res.status(200).json(apiResponse.success(data, 'Attendance export history fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch attendance export history'));
  }
};
