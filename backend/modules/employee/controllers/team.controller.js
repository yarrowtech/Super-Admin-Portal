const asyncHandler = require('../../../utils/asyncHandler');
const teamService = require('../services/team.service');

exports.getTeam = asyncHandler(async (req, res) => {
  const data = await teamService.getTeamDirectory(req.user);
  res.json({
    success: true,
    data,
  });
});
