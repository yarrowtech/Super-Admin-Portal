const mediaService = require('./media.service');

// Dashboard Logic (Section 18): a pure aggregation layer that fans out to
// the overview service so MediaDashboard.jsx's chart/table consumption
// keeps working unchanged.
const getProjectDashboard = async (projectId) => mediaService.getOverview(projectId);

module.exports = { getProjectDashboard };
