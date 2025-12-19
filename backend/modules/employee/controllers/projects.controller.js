const asyncHandler = require('../../../utils/asyncHandler');
const projectsService = require('../services/projects.service');

exports.getProjects = asyncHandler(async (req, res) => {
  const data = await projectsService.getProjectBoard(req.user);
  res.json({
    success: true,
    data,
  });
});
