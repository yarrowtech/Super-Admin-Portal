const { getTeamFor } = require('./departmentTeam.controller');

// GET /law/team: the Law portal directory (law_head + law_employee only).
exports.getTeam = getTeamFor('law');
