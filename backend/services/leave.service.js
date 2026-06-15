const Leave = require('../models/hr/Leave');

const getLeavesByEmployee = async (employeeId, { status } = {}) => {
  const query = { employee: employeeId };
  if (status) query.status = status;
  return Leave.find(query).sort({ createdAt: -1 });
};

module.exports = {
  getLeavesByEmployee,
};
