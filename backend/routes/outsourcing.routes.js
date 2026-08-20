const express = require('express');
const router = express.Router();
const outsourcingController = require('../controllers/outsourcing/outsourcing.controller');
const efnbmmsAdminManagementController = require('../controllers/outsourcing/efnbmmsAdminManagement.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { requireWorkspaceAccess } = require('../middlewares/workspaceAccess.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const {
  validate,
  outsourcingCreateUserValidation,
  outsourcingCreateJobValidation,
  outsourcingCreateContractValidation,
  outsourcingTimeLogValidation,
  outsourcingCreateMilestoneValidation
} = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/roles');
const User = require('../models/auth/User');

const normalizeOutsourcingType = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) return '';
  if (['third_party_worker', '3rd_party_worker', 'thirdpartyworker', 'third_party'].includes(raw)) {
    return 'third_party_worker';
  }
  if (raw === 'freelancer' || raw === 'freelaner') return 'freelancer';
  return raw;
};

const normalizeDepartment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s&-]+/g, '_');

router.use(authenticate);

router.use(async (req, res, next) => {
  try {
    if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user?.role)) return next();
    if ([
      ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE,
      ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE,
      ROLES.IT_MANAGER, ROLES.IT_ADMIN, ROLES.IT_EMPLOYEE, ROLES.IT_HR,
      ROLES.HR,
    ].includes(req.user?.role)) return next();
    const actor = await User.findById(req.user?._id).select('role department metadata');
    const type = normalizeOutsourcingType(actor?.metadata?.outsourcingType);
    const department = normalizeDepartment(actor?.department);
    if (
      actor?.role === ROLES.FREELANCER ||
      department === 'outsourcing' ||
      department === 'outsource' ||
      department === 'external_workforce' ||
      type === 'third_party_worker' ||
      type === 'freelancer'
    ) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Outsourcing portal access denied'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Access verification failed' });
  }
});

router.get('/notifications', outsourcingController.getMyNotifications);
router.get('/payments', outsourcingController.getMyPayments);
router.get('/profile', outsourcingController.getMyProfile);
router.put('/profile', outsourcingController.updateMyProfile);
router.post('/profile/document', uploadSingle('file'), outsourcingController.uploadProfileDocument);
router.get('/workspace/me', outsourcingController.getMyWorkspace);
router.get('/activity-feed', outsourcingController.getMyActivityFeed);
router.get('/analytics/me', outsourcingController.getMyAnalytics);
router.get('/workflow/me', outsourcingController.getMyWorkflow);
router.get('/sessions/me', outsourcingController.getMySessionStatus);
router.post('/sessions/check-in', outsourcingController.checkIn);
router.post('/sessions/check-out', outsourcingController.checkOut);
router.post('/sessions/pause', outsourcingController.pauseWorkSession);
router.post('/sessions/resume', outsourcingController.resumeWorkSession);
router.post('/sessions/stop', outsourcingController.stopWorkSession);
router.post('/files/upload', uploadSingle('file'), outsourcingController.uploadFreelancerFile);
router.get('/jobs', outsourcingController.listJobs);
router.put('/jobs/:id/accept', outsourcingController.acceptJob);
router.put('/jobs/:id/reject', outsourcingController.rejectJob);
router.put('/jobs/:id/status', outsourcingController.updateJobStatus);

router.get('/contracts', outsourcingController.listContracts);
router.get('/contracts/:contractId/history', outsourcingController.getContractHistory);
router.put('/contracts/:contractId/terms', outsourcingController.updateContractTerms);
router.put('/contracts/:contractId/law-validate', authorize(ROLES.ADMIN, ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE), outsourcingController.validateContractByLaw);
router.post('/time-logs', outsourcingTimeLogValidation, validate, outsourcingController.logTime);
router.put('/time-logs/:id', outsourcingController.updateMyTimeLog);
router.get('/time-logs', outsourcingController.listTimeLogs);

// Support tickets — freelancer
router.post('/support/tickets', outsourcingController.createSupportTicket);
router.get('/support/tickets', outsourcingController.getMyTickets);

// Preferences (notifications + privacy)
router.put('/preferences', outsourcingController.updateMyPreferences);

// HR/Manager can view dashboard, freelancer list, create/assign jobs, manage milestones
router.get('/dashboard', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.outsourcingDashboard);
router.get('/efnbmms/admin-management', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FREELANCER), requireWorkspaceAccess('EFNBMMS'), efnbmmsAdminManagementController.listAdminManagement);
router.get('/efnbmms/admin-management/summary', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FREELANCER), requireWorkspaceAccess('EFNBMMS'), efnbmmsAdminManagementController.getAdminManagementSummary);
router.get('/efnbmms/admin-management/:adminId', authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FREELANCER), requireWorkspaceAccess('EFNBMMS'), efnbmmsAdminManagementController.getAdminManagementDetail);
router.get('/users', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.listFreelancers);
router.post('/jobs', authorize(ROLES.ADMIN, ROLES.HR), outsourcingCreateJobValidation, validate, outsourcingController.createJob);
router.put('/jobs/:id/assign', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.assignJobToFreelancer);
router.post('/milestones', authorize(ROLES.ADMIN, ROLES.HR), outsourcingCreateMilestoneValidation, validate, outsourcingController.createMilestone);
router.put('/milestones/:id/submit', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.submitMilestone);
router.put('/milestones/:id/approve', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.approveMilestone);

// Law creates and validates contracts
router.post('/contracts', authorize(ROLES.ADMIN, ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE), outsourcingCreateContractValidation, validate, outsourcingController.createContract);

// Admin/HR/Manager: all support tickets
router.get('/support/tickets/all', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.getAllSupportTickets);
router.put('/support/tickets/:id', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.updateSupportTicket);

// Admin-only: user creation, payments, lifecycle, escrow
router.post('/users', authorize(ROLES.ADMIN), outsourcingCreateUserValidation, validate, outsourcingController.createOutsourcingUser);
router.post('/payments/milestone', authorize(ROLES.ADMIN), outsourcingController.createMilestonePayment);
router.put('/payments/milestone/:id/release', authorize(ROLES.ADMIN, ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE), outsourcingController.releaseMilestonePayment);
router.put('/freelancers/:id/complete', authorize(ROLES.ADMIN), outsourcingController.completeFreelancerLifecycle);
router.post('/payments/escrow/create-order', authorize(ROLES.ADMIN), outsourcingController.createEscrowOrder);
router.post('/payments/escrow/verify', authorize(ROLES.ADMIN), outsourcingController.verifyEscrowPayment);
router.put('/time-logs/:id/verify', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.verifyTimeLog);
router.put('/time-logs/:id/revision', authorize(ROLES.ADMIN, ROLES.HR), outsourcingController.requestTimeLogRevision);
router.put('/payments/escrow/:id/approve-release', authorize(ROLES.ADMIN), outsourcingController.approveEscrowRelease);

module.exports = router;
