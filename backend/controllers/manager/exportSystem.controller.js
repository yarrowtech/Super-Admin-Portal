const apiResponse = require('../../utils/apiResponse');
const exportService = require('../../services/export/exportSystem.service');

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

exports.exportTasksCsv = async (req, res) => {
  const selectedIds = Array.isArray(req.body?.selectedIds) ? req.body.selectedIds.filter(Boolean) : [];

  try {
    const result = await exportService.exportManagerTasksCsv({
      managerId: req.user._id,
      status: typeof req.query.status === 'string' ? req.query.status.trim() : '',
      priority: typeof req.query.priority === 'string' ? req.query.priority.trim() : '',
      assignee: typeof req.query.assignee === 'string' ? req.query.assignee.trim() : '',
      search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
      selectedIds,
      requestedBy: req.user._id,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    await exportService.logFailedExport({
      portal: 'manager',
      module: 'tasks',
      filters: {
        status: typeof req.query.status === 'string' ? req.query.status.trim() : '',
        priority: typeof req.query.priority === 'string' ? req.query.priority.trim() : '',
        assignee: typeof req.query.assignee === 'string' ? req.query.assignee.trim() : '',
        search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
      },
      scope: selectedIds.length > 0 ? 'selected' : ((req.query.status || req.query.priority || req.query.assignee || req.query.search) ? 'filtered' : 'full'),
      selectedIds,
      requestedBy: req.user._id,
      errorMessage: error.message,
      fileName: `manager-team-tasks-export-${new Date().toISOString().slice(0, 10)}.csv`,
    }).catch(() => null);
    return res.status(500).json(apiResponse.error(error.message || 'Failed to export manager tasks'));
  }
};

exports.getTaskExportHistory = async (req, res) => {
  try {
    const data = await exportService.getExportHistory({
      requestedBy: req.user._id,
      portal: 'manager',
      module: 'tasks',
      page: toPositiveInt(req.query.page, 1),
      limit: toPositiveInt(req.query.limit, 10),
    });

    return res.status(200).json(apiResponse.success(data, 'Manager task export history fetched successfully'));
  } catch (error) {
    return res.status(500).json(apiResponse.error(error.message || 'Failed to fetch manager export history'));
  }
};
