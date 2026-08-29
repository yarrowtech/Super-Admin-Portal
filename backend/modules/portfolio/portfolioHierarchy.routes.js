const express = require('express');
const router = express.Router();
const ctrl = require('./portfolioHierarchy.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { ADMIN_ROLES } = require('../../controllers/portfolio.controller');
const { uploadSingle, uploadCsv } = require('../../middlewares/upload.middleware');

const requireAdmin = authorize(...ADMIN_ROLES);

router.use(authenticate);

// Reads — any authenticated user, mirroring the legacy /api/portfolios convention.
router.get('/brands', ctrl.listBrands);
router.get('/assignees', ctrl.listAssignees);

router.get('/portfolios/:portfolioId/groups', ctrl.listGroups);
router.get('/portfolios/:portfolioId/stats', ctrl.getPortfolioTree);

router.get('/groups/:groupId', ctrl.getGroup);
router.get('/groups/:groupId/categories', ctrl.listCategories);

router.get('/categories/:categoryId', ctrl.getCategory);
router.get('/categories/:categoryId/stats', ctrl.getCategoryStats);
router.get('/categories/:categoryId/overview', ctrl.getCategoryOverview);
router.get('/categories/:categoryId/assets', ctrl.listAssets);
router.get('/categories/:categoryId/tasks', ctrl.listTasks);
router.get('/categories/:categoryId/activity', ctrl.categoryActivity);
router.get('/categories/:categoryId/files', ctrl.listFiles);
router.get('/categories/:categoryId/metrics', ctrl.categoryMetrics);
router.get('/categories/:categoryId/metrics/timeseries', ctrl.categoryMetricsTimeseries);
router.get('/categories/:categoryId/metrics/by-asset', ctrl.categoryMetricsByAsset);
router.get('/categories/:categoryId/health', ctrl.categoryHealth);
router.get('/metric-definitions', ctrl.metricDefinitions);
router.get('/portfolios/:portfolioId/health', ctrl.portfolioHealth);

router.get('/assets/:assetId', ctrl.getAsset);
router.get('/assets/:assetId/versions', ctrl.listAssetVersions);
router.get('/assets/:assetId/history', ctrl.listAssetHistory);
router.get('/assets/:assetId/transitions', ctrl.getAssetTransitions);
router.get('/assets/:assetId/comments', ctrl.listComments);
router.get('/assets/:assetId/relations', ctrl.listRelations);

// Writes — admin only, same gate as the legacy portfolio controller.
router.post('/portfolios/:portfolioId/groups', requireAdmin, ctrl.createGroup);
router.patch('/groups/:groupId', requireAdmin, ctrl.updateGroup);
router.post('/groups/:groupId/archive', requireAdmin, ctrl.archiveGroup);
router.post('/groups/:groupId/restore', requireAdmin, ctrl.restoreGroup);
router.post('/groups/:groupId/trash', requireAdmin, ctrl.trashGroup);
router.post('/groups/:groupId/restore-from-trash', requireAdmin, ctrl.restoreGroupFromTrash);

router.post('/groups/:groupId/categories', requireAdmin, ctrl.createCategory);
router.patch('/categories/:categoryId', requireAdmin, ctrl.updateCategory);
router.post('/categories/:categoryId/archive', requireAdmin, ctrl.archiveCategory);
router.post('/categories/:categoryId/restore', requireAdmin, ctrl.restoreCategory);
router.post('/categories/:categoryId/trash', requireAdmin, ctrl.trashCategory);
router.post('/categories/:categoryId/restore-from-trash', requireAdmin, ctrl.restoreCategoryFromTrash);

router.post('/categories/:categoryId/assets', requireAdmin, ctrl.createAsset);
router.patch('/assets/:assetId', requireAdmin, ctrl.updateAsset);
router.post('/assets/:assetId/status', requireAdmin, ctrl.changeAssetStatus);
router.delete('/assets/:assetId', requireAdmin, ctrl.deleteAsset);
router.post('/assets/:assetId/restore', requireAdmin, ctrl.restoreAsset);
router.post('/assets/:assetId/restore-version/:versionId', requireAdmin, ctrl.restoreAssetVersion);
router.post('/categories/:categoryId/tasks', requireAdmin, ctrl.createTask);
router.patch('/tasks/:taskId', requireAdmin, ctrl.updateTask);
router.post('/tasks/:taskId/move', requireAdmin, ctrl.moveTask);
router.post('/tasks/:taskId/archive', requireAdmin, ctrl.archiveTask);
router.post('/categories/:categoryId/files', requireAdmin, uploadSingle('file'), ctrl.uploadFile);
router.post('/files/:fileId/replace', requireAdmin, uploadSingle('file'), ctrl.replaceFile);
router.get('/files/:fileId/versions', ctrl.fileVersions);
router.post('/files/:fileId/archive', requireAdmin, ctrl.archiveFile);
router.post('/categories/:categoryId/metrics', requireAdmin, ctrl.upsertMetric);
router.post('/categories/:categoryId/metrics/import', requireAdmin, uploadCsv('file'), ctrl.importMetricsCsv);

router.post('/assets/:assetId/comments', ctrl.createComment);
router.patch('/comments/:commentId', ctrl.updateComment);
router.delete('/comments/:commentId', ctrl.deleteComment);

router.post('/assets/:assetId/relations', requireAdmin, ctrl.createRelation);
router.delete('/relations/:relationId', requireAdmin, ctrl.deleteRelation);

module.exports = router;
