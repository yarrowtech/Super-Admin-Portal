// backend/routes/dept/hr.routes.js
const express = require('express');
const router = express.Router();
const hrController = require('../../controllers/dept/hr.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and HR role
router.use(authenticate);
router.use(authorize(ROLES.HR, ROLES.ADMIN));

// Dashboard
router.get('/dashboard', hrController.getDashboard);

// Applicants Management
router.get('/applicants', hrController.getApplicants);
router.post('/applicants', hrController.createApplicant);
router.get('/applicants/:id', hrController.getApplicantById);
router.put('/applicants/:id', hrController.updateApplicant);
router.delete('/applicants/:id', hrController.deleteApplicant);

// Attendance Management
router.get('/attendance', hrController.getAttendance);
router.post('/attendance', hrController.createAttendance);
router.put('/attendance/:id', hrController.updateAttendance);
router.get('/attendance/employee/:employeeId', hrController.getEmployeeAttendance);

// Employees Management
router.get('/employees', hrController.getEmployees);

// Leave Management
router.get('/leave', hrController.getLeaveRequests);
router.put('/leave/:id/approve', hrController.approveLeave);
router.put('/leave/:id/reject', hrController.rejectLeave);

// Notices Management
router.get('/notices', hrController.getNotices);
router.post('/notices', hrController.createNotice);
router.put('/notices/:id', hrController.updateNotice);
router.delete('/notices/:id', hrController.deleteNotice);

// Performance Management
router.get('/performance', hrController.getPerformanceReviews);
router.post('/performance', hrController.createPerformanceReview);
router.put('/performance/:id', hrController.updatePerformanceReview);

// Work Reports Management
router.get('/work-reports', hrController.getWorkReports);
router.put('/work-reports/:id/review', hrController.reviewWorkReport);

// Complaints & Solutions Management
router.get('/complaints', hrController.getComplaints);
router.get('/complaints/:id', hrController.getComplaintById);
router.put('/complaints/:id/assign', hrController.assignComplaint);
router.put('/complaints/:id/resolve', hrController.resolveComplaint);
router.post('/complaints/:id/comment', hrController.addComplaintComment);

module.exports = router;
