const asyncHandler = require('../../../utils/asyncHandler');
const { getTaskOverview, getTaskList } = require('../services/tasks.service');

exports.getTasks = asyncHandler(async (req, res) => {
  const view = req.query.view || 'overview';

  if (view === 'list') {
    const data = await getTaskList(req.user, req.query);
    res.json({
      success: true,
      data,
    });
    return;
  }

  const data = await getTaskOverview(req.user, { limit: req.query.limit });
  res.json({
    success: true,
    data,
  });
});
