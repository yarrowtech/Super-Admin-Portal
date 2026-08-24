// backend/routes/dept/employee.routes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee/employeeAttendance.controller');
const employeeLeaveController = require('../controllers/employee/employeeLeave.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication and employee-capable role
router.use(authenticate);
router.use(authorize(
  'employee',
  ROLES.IT_EMPLOYEE,
  ROLES.FINANCE_EMPLOYEE,
  ROLES.LAW_EMPLOYEE,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
));

// Dashboard
router.get('/dashboard', employeeController.getDashboard);

// Task Management
router.get('/tasks', employeeController.getMyTasks);
router.get('/tasks/:id', employeeController.getTaskById);
router.put('/tasks/:id/status', employeeController.updateTaskStatus);
router.post('/tasks/:id/comment', employeeController.addTaskComment);

// Attendance Management
router.post('/attendance/check-in', employeeController.checkIn);
router.put('/attendance/check-out', employeeController.checkOut);
router.get('/attendance', employeeController.getMyAttendance);
router.put('/attendance/location', employeeController.setAttendanceLocation);

// Leave Management
router.post('/leave', employeeLeaveController.requestLeave);
router.get('/leave', employeeLeaveController.getMyLeaves);
router.get('/leave/balance', employeeLeaveController.getMyLeaveBalance);
router.put('/leave/:id/cancel', employeeLeaveController.cancelLeave);

// Work Reports
router.post('/work-reports', employeeController.submitWorkReport);
router.get('/work-reports', employeeController.getMyWorkReports);

// Notices
router.get('/notices', employeeController.getNotices);
router.put('/notices/:id/mark-read', employeeController.markNoticeAsRead);

// Performance
router.get('/performance', employeeController.getMyPerformance);
router.put('/performance/:id/acknowledge', employeeController.acknowledgePerformance);

module.exports = router;
