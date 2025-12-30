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

// Task Management
router.get('/tasks', hrController.getTasks);
router.post('/tasks', hrController.createTask);
router.put('/tasks/:id', hrController.updateTask);
router.put('/tasks/:id/close', hrController.closeTask);

// Employees Management
router.get('/employees', hrController.getEmployees);
router.post('/employees', hrController.createEmployee);
router.put('/employees/:id', hrController.updateEmployee);
router.post('/employees/:id/toggle-status', hrController.toggleEmployeeStatus);

// Department Management
router.get('/departments', hrController.getDepartments);
router.post('/departments', hrController.createDepartment);
router.put('/departments/:id', hrController.updateDepartment);
router.delete('/departments/:id', hrController.deleteDepartment);

// Designation Management
router.get('/designations', hrController.getDesignations);
router.post('/designations', hrController.createDesignation);
router.put('/designations/:id', hrController.updateDesignation);
router.delete('/designations/:id', hrController.deleteDesignation);

// Employee Document Management
router.get('/employee-documents', hrController.getEmployeeDocuments);
router.post('/employee-documents', hrController.createEmployeeDocument);
router.put('/employee-documents/:id', hrController.updateEmployeeDocument);
router.delete('/employee-documents/:id', hrController.deleteEmployeeDocument);

// Biometric Enrollment
router.get('/biometrics', hrController.getBiometricEnrollments);
router.post('/biometrics', hrController.createBiometricEnrollment);
router.put('/biometrics/:id', hrController.updateBiometricEnrollment);
router.delete('/biometrics/:id', hrController.deleteBiometricEnrollment);

// Leave Management
router.get('/leave', hrController.getLeaveRequests);
router.post('/leave/request', hrController.requestLeave);
router.put('/leave/:id/approve', hrController.approveLeave);
router.put('/leave/:id/reject', hrController.rejectLeave);
router.get('/leave-policies', hrController.getLeavePolicies);
router.post('/leave-policies', hrController.createLeavePolicy);
router.put('/leave-policies/:id', hrController.updateLeavePolicy);
router.delete('/leave-policies/:id', hrController.deleteLeavePolicy);

// Holidays
router.get('/holidays', hrController.getHolidays);
router.post('/holidays', hrController.createHoliday);
router.put('/holidays/:id', hrController.updateHoliday);
router.delete('/holidays/:id', hrController.deleteHoliday);

// Notices Management
router.get('/notices', hrController.getNotices);
router.post('/notices', hrController.createNotice);
router.put('/notices/:id', hrController.updateNotice);
router.delete('/notices/:id', hrController.deleteNotice);

// Performance Management
router.get('/performance', hrController.getPerformanceReviews);
router.post('/performance', hrController.createPerformanceReview);
router.put('/performance/:id', hrController.updatePerformanceReview);
router.get('/appraisal-cycles', hrController.getAppraisalCycles);
router.post('/appraisal-cycles', hrController.createAppraisalCycle);
router.put('/appraisal-cycles/:id', hrController.updateAppraisalCycle);
router.delete('/appraisal-cycles/:id', hrController.deleteAppraisalCycle);
router.get('/appraisals', hrController.getAppraisalReviews);
router.post('/appraisals', hrController.createAppraisalReview);
router.put('/appraisals/:id', hrController.updateAppraisalReview);
router.delete('/appraisals/:id', hrController.deleteAppraisalReview);

// Work Reports Management
router.get('/work-reports', hrController.getWorkReports);
router.put('/work-reports/:id/review', hrController.reviewWorkReport);

// Complaints & Solutions Management
router.get('/complaints', hrController.getComplaints);
router.get('/complaints/:id', hrController.getComplaintById);
router.put('/complaints/:id/assign', hrController.assignComplaint);
router.put('/complaints/:id/resolve', hrController.resolveComplaint);
router.post('/complaints/:id/comment', hrController.addComplaintComment);

// Recruitment
router.get('/jobs', hrController.getJobPosts);
router.post('/jobs', hrController.createJobPost);
router.put('/jobs/:id', hrController.updateJobPost);
router.delete('/jobs/:id', hrController.deleteJobPost);
router.get('/interviews', hrController.getInterviews);
router.post('/interviews', hrController.createInterview);
router.put('/interviews/:id', hrController.updateInterview);
router.delete('/interviews/:id', hrController.deleteInterview);
router.get('/offers', hrController.getOffers);
router.post('/offers', hrController.createOffer);
router.put('/offers/:id', hrController.updateOffer);
router.delete('/offers/:id', hrController.deleteOffer);

// Policies & Compliance
router.get('/policies', hrController.getPolicies);
router.post('/policies', hrController.createPolicy);
router.put('/policies/:id', hrController.updatePolicy);
router.delete('/policies/:id', hrController.deletePolicy);
router.get('/policy-acknowledgements', hrController.getPolicyAcknowledgements);
router.post('/policy-acknowledgements', hrController.createPolicyAcknowledgement);
router.delete('/policy-acknowledgements/:id', hrController.deletePolicyAcknowledgement);

// HR Support Tickets (Employee Queries)
router.get('/support-tickets', hrController.getSupportTickets);
router.post('/support-tickets', hrController.createSupportTicket);
router.put('/support-tickets/:id', hrController.updateSupportTicket);
router.put('/support-tickets/:id/assign', hrController.assignSupportTicket);
router.put('/support-tickets/:id/resolve', hrController.resolveSupportTicket);
router.put('/support-tickets/:id/close', hrController.closeSupportTicket);
router.post('/support-tickets/:id/comment', hrController.addSupportTicketComment);

// Exit Interviews
router.get('/exit-interviews', hrController.getExitInterviews);
router.post('/exit-interviews', hrController.createExitInterview);
router.put('/exit-interviews/:id', hrController.updateExitInterview);
router.delete('/exit-interviews/:id', hrController.deleteExitInterview);

module.exports = router;
