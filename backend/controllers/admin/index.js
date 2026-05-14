module.exports = {
  dashboard: require("./adminDashboard.controller"),
  users: require("./userManagement.controller"),
  roles: require("./roleManagement.controller"),
  auditLogs: require("./auditLogs.controller"),
  settings: require("./settings.controller"),
  modules: require("./moduleWorkbench.controller"),
};
