const asyncHandler = require('../../../utils/asyncHandler');
const projectsService = require('../services/projects.service');

exports.getProjects = asyncHandler(async (req, res) => {
  const data = await projectsService.getProjectBoard(req.user);
  res.json({
    success: true,
    data,
  });
});

exports.createTask = asyncHandler(async (req, res) => {
  const data = await projectsService.createPersonalTask(req.user, req.body);
  res.status(201).json({
    success: true,
    data,
  });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const data = await projectsService.deletePersonalTask(req.user, req.params.taskId);
  res.json({
    success: true,
    data,
  });
});
