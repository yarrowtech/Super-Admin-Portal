const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portfolio.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const requireAdmin = authorize(...ctrl.ADMIN_ROLES);
const requireSuperAdmin = authorize(...ctrl.SUPER_ADMIN_ROLES);

router.use(authenticate);

// Read access — every authenticated user, across every portal
router.get('/', ctrl.listPortfolios);
router.get('/projects', requireAdmin, ctrl.listPortfolioProjects);
router.get('/playbook-templates', requireAdmin, ctrl.listPlaybookTemplates);
router.get('/:id', ctrl.getPortfolio);
router.get('/:id/overview', ctrl.getPortfolioOverview);

// Write access — admin only
router.post('/', requireAdmin, ctrl.createPortfolio);
router.put('/:id', requireAdmin, ctrl.updatePortfolio);
router.delete('/:id', requireSuperAdmin, ctrl.deletePortfolio);

router.post('/:id/sections', requireAdmin, ctrl.addSection);
router.put('/:id/sections/:sectionId', requireAdmin, ctrl.updateSection);
router.delete('/:id/sections/:sectionId', requireAdmin, ctrl.deleteSection);

router.post('/:id/sections/:sectionId/items', requireAdmin, ctrl.addItem);
router.put('/:id/sections/:sectionId/items/:itemId', requireAdmin, ctrl.updateItem);
router.delete('/:id/sections/:sectionId/items/:itemId', requireAdmin, ctrl.deleteItem);

router.post('/:id/playbook/sync-marketing-plan', requireAdmin, ctrl.syncFromMarketingPlan);
router.post('/:id/playbook/slides/from-template', requireAdmin, ctrl.addPlaybookSlideFromTemplate);
router.post('/:id/playbook/slides', requireAdmin, ctrl.addPlaybookSlide);
router.put('/:id/playbook/slides/:slideId', requireAdmin, ctrl.updatePlaybookSlide);
router.delete('/:id/playbook/slides/:slideId', requireAdmin, ctrl.deletePlaybookSlide);

router.post('/:id/playbook/slides/:slideId/blocks', requireAdmin, ctrl.addPlaybookBlock);
router.put('/:id/playbook/slides/:slideId/blocks/:blockId', requireAdmin, ctrl.updatePlaybookBlock);
router.delete('/:id/playbook/slides/:slideId/blocks/:blockId', requireAdmin, ctrl.deletePlaybookBlock);

module.exports = router;
