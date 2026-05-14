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
    if ([ROLES.LAW, ROLES.FINANCE, ROLES.IT].includes(req.user?.role)) return next();
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
router.get('/invoices', outsourcingController.getMyInvoices);
router.get('/profile', outsourcingController.getMyProfile);
router.put('/profile', outsourcingController.updateMyProfile);
router.get('/activity-feed', outsourcingController.getMyActivityFeed);
router.get('/analytics/me', outsourcingController.getMyAnalytics);
router.get('/workflow/me', outsourcingController.getMyWorkflow);
router.get('/sessions/me', outsourcingController.getMySessionStatus);
router.post('/sessions/check-in', outsourcingController.checkIn);
router.post('/sessions/check-out', outsourcingController.checkOut);
router.post('/files/upload', uploadSingle('file'), outsourcingController.uploadFreelancerFile);
router.post('/invoices/generate', outsourcingController.generateInvoice);

router.get('/jobs', outsourcingController.listJobs);
router.put('/jobs/:id/accept', outsourcingController.acceptJob);
router.put('/jobs/:id/status', outsourcingController.updateJobStatus);

router.get('/contracts', outsourcingController.listContracts);
router.put('/contracts/:contractId/law-validate', authorize(ROLES.ADMIN, ROLES.LAW), outsourcingController.validateContractByLaw);
router.post('/time-logs', outsourcingTimeLogValidation, validate, outsourcingController.logTime);
router.get('/time-logs', outsourcingController.listTimeLogs);

router.use(authorize(ROLES.ADMIN));

router.get('/dashboard', outsourcingController.outsourcingDashboard);
router.get('/users', outsourcingController.listFreelancers);
router.post('/users', outsourcingCreateUserValidation, validate, outsourcingController.createOutsourcingUser);
router.post('/jobs', outsourcingCreateJobValidation, validate, outsourcingController.createJob);
router.put('/jobs/:id/assign', outsourcingController.assignJobToFreelancer);
router.post('/contracts', outsourcingCreateContractValidation, validate, outsourcingController.createContract);
router.post('/milestones', outsourcingCreateMilestoneValidation, validate, outsourcingController.createMilestone);
router.put('/milestones/:id/submit', outsourcingController.submitMilestone);
router.put('/milestones/:id/approve', outsourcingController.approveMilestone);
router.post('/payments/milestone', outsourcingController.createMilestonePayment);
router.put('/payments/milestone/:id/release', authorize(ROLES.ADMIN, ROLES.FINANCE), outsourcingController.releaseMilestonePayment);
router.put('/freelancers/:id/complete', outsourcingController.completeFreelancerLifecycle);
router.post('/payments/escrow/create-order', outsourcingController.createEscrowOrder);
router.post('/payments/escrow/verify', outsourcingController.verifyEscrowPayment);
router.put('/time-logs/:id/verify', outsourcingController.verifyTimeLog);
router.put('/time-logs/:id/revision', outsourcingController.requestTimeLogRevision);
router.put('/payments/escrow/:id/approve-release', outsourcingController.approveEscrowRelease);

module.exports = router;
