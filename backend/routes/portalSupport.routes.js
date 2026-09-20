const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portalSupport.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

const ADMIN_ROLES = [
  ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.IT_MANAGER, ROLES.IT_ADMIN,
];

router.use(authenticate);

// User routes — any authenticated internal employee
router.post('/tickets', ctrl.createTicket);
router.get('/tickets/my', ctrl.getMyTickets);
router.get('/tickets/unread-count', ctrl.getUnreadCount);

// Preferences — any authenticated user
router.patch('/preferences', ctrl.updatePreferences);

// Admin / IT management routes — static must come before :id
router.get('/tickets/all', authorize(...ADMIN_ROLES), ctrl.getAllTickets);
router.put('/tickets/:id', authorize(...ADMIN_ROLES), ctrl.updateTicket);

// Single ticket view / thread / requester close-reopen (ownership enforced in controller)
router.get('/tickets/:id', ctrl.getTicket);
router.post('/tickets/:id/comments', ctrl.addComment);
router.patch('/tickets/:id/status', ctrl.changeOwnTicketStatus);

module.exports = router;
