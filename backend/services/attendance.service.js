const Attendance = require('../models/hr/Attendance');

const getAttendanceByEmployee = async (employeeId, { from, to } = {}) => {
  const query = { employee: employeeId };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }
  return Attendance.find(query).sort({ date: -1 });
};

module.exports = {
  getAttendanceByEmployee,
};
