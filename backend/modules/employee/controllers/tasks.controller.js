const asyncHandler = require('../../../utils/asyncHandler');
const tasksService = require('../services/tasks.service');

exports.getTasks = asyncHandler(async (req, res) => {
  const data = await tasksService.getTaskBuckets(req.user);
  res.json({
    success: true,
    data,
  });
});
