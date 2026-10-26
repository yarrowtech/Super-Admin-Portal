const { getTeamFor } = require('./departmentTeam.controller');
const logger = require('../../utils/logger').child({ module: 'department.law.team' });

// GET /law/team: the Law portal directory (law_head + law_employee only).
exports.getTeam = getTeamFor('law');
