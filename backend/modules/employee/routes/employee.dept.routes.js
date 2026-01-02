// backend/routes/dept/employee.routes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');
const { ROLES } = require('../../../config/roles');

// All routes require authentication and Employee role
router.use(authenticate);
router.use(authorize(ROLES.EMPLOYEE, ROLES.ADMIN));

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
router.post('/leave', employeeController.requestLeave);
router.get('/leave', employeeController.getMyLeaves);
router.put('/leave/:id/cancel', employeeController.cancelLeave);

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
