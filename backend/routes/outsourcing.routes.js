const express = require('express');
const router = express.Router();
const outsourcingController = require('../controllers/outsourcing/outsourcing.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
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
    if (req.user?.role === ROLES.ADMIN) return next();
    if ([ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.FINANCE, ROLES.IT, ROLES.HR, ROLES.MANAGER].includes(req.user?.role)) return next();
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
router.put('/contracts/:contractId/law-validate', authorize(ROLES.ADMIN, ROLES.LAW), outsourcingController.validateContractByLaw);
router.post('/time-logs', outsourcingTimeLogValidation, validate, outsourcingController.logTime);
router.get('/time-logs', outsourcingController.listTimeLogs);

// HR/Manager can view dashboard, freelancer list, create/assign jobs, manage milestones
router.get('/dashboard', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.outsourcingDashboard);
router.get('/users', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.listFreelancers);
router.post('/jobs', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingCreateJobValidation, validate, outsourcingController.createJob);
router.put('/jobs/:id/assign', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.assignJobToFreelancer);
router.post('/milestones', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingCreateMilestoneValidation, validate, outsourcingController.createMilestone);
router.put('/milestones/:id/submit', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.submitMilestone);
router.put('/milestones/:id/approve', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.approveMilestone);

// Law creates and validates contracts
router.post('/contracts', authorize(ROLES.ADMIN, ROLES.LAW, ROLES.LEGAL_HEAD), outsourcingCreateContractValidation, validate, outsourcingController.createContract);

// Admin-only: user creation, payments, lifecycle, escrow
router.post('/users', authorize(ROLES.ADMIN), outsourcingCreateUserValidation, validate, outsourcingController.createOutsourcingUser);
router.post('/payments/milestone', authorize(ROLES.ADMIN), outsourcingController.createMilestonePayment);
router.put('/payments/milestone/:id/release', authorize(ROLES.ADMIN, ROLES.FINANCE), outsourcingController.releaseMilestonePayment);
router.put('/freelancers/:id/complete', authorize(ROLES.ADMIN), outsourcingController.completeFreelancerLifecycle);
router.post('/payments/escrow/create-order', authorize(ROLES.ADMIN), outsourcingController.createEscrowOrder);
router.post('/payments/escrow/verify', authorize(ROLES.ADMIN), outsourcingController.verifyEscrowPayment);
router.put('/time-logs/:id/verify', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.verifyTimeLog);
router.put('/time-logs/:id/revision', authorize(ROLES.ADMIN, ROLES.HR, ROLES.MANAGER), outsourcingController.requestTimeLogRevision);
router.put('/payments/escrow/:id/approve-release', authorize(ROLES.ADMIN), outsourcingController.approveEscrowRelease);

module.exports = router;
