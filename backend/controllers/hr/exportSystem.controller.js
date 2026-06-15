const apiResponse = require('../../utils/apiResponse');
const exportService = require('../../services/export/exportSystem.service');

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

exports.exportEmployeesCsv = async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const selectedIds = Array.isArray(req.body?.selectedIds)
    ? req.body.selectedIds.filter(Boolean)
    : [];

  try {
    const result = await exportService.exportEmployeesCsv({
      search,
      selectedIds,
      requestedBy: req.user._id,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    await exportService.logFailedExport({
      portal: 'hr',
      module: 'employees',
      filters: { search: search || '' },
      scope: selectedIds.length > 0 ? 'selected' : (search ? 'filtered' : 'full'),
      selectedIds,
      requestedBy: req.user._id,
      errorMessage: error.message,
      fileName: `hr-employees-export-${new Date().toISOString().slice(0, 10)}.csv`,
    }).catch(() => null);

    return res.status(500).json(apiResponse.error(error.message || 'Failed to export employees'));
  }
};

exports.getExportHistory = async (req, res) => {
  try {
    const data = await exportService.getExportHistory({
      requestedBy: req.user._id,
      portal: 'hr',
      module: 'employees',
      page: toPositiveInt(req.query.page, 1),
      limit: toPositiveInt(req.query.limit, 10),
    });

    return res.status(200).json(apiResponse.success(data, 'Export history fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch export history'));
  }
};
