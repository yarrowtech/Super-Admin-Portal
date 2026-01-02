const asyncHandler = require('../../../utils/asyncHandler');
const {
  createTaskCompletionNotifications,
} = require('../../manager/services/notification.service');

exports.notifyManagerTaskReview = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const result = await createTaskCompletionNotifications({
    taskId,
    employee: req.user,
    payload: req.body || {},
    io: req.app.get('io'),
  });

  res.status(201).json({
    success: true,
    data: result.notifications,
    meta: result.meta,
  });
});
