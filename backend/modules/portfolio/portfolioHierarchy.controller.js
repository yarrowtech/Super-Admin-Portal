const service = require('./portfolioHierarchy.service');
const tasks = require('./portfolioTask.service');
const files = require('./portfolioFile.service');
const activity = require('./portfolioActivity.service');
const health = require('./portfolioHealth.service');
const metrics = require('./portfolioMetric.service');

// Thin HTTP layer — all business logic lives in portfolioHierarchy.service.js.
// Response envelope matches the existing backend/controllers/portfolio.controller.js
// convention: { success: true, data } / { success: false, error }.
const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    return res.status(req._successStatus || 200).json({ success: true, data });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message });
  }
};

const actor = (req) => ({ id: req.user?.id, role: req.user?.role });

exports.listBrands = handle(async () => service.listBrands());

// ---- Groups ----
exports.listGroups = handle(async (req) => service.listGroups(req.params.portfolioId, req.query));
exports.createGroup = handle(async (req) => {
  req._successStatus = 201;
  return service.createGroup(req.params.portfolioId, req.body, actor(req));
});
exports.getGroup = handle(async (req) => service.getGroup(req.params.groupId));
exports.updateGroup = handle(async (req) => service.updateGroup(req.params.groupId, req.body, actor(req)));
exports.archiveGroup = handle(async (req) => service.archiveGroup(req.params.groupId, actor(req)));
exports.restoreGroup = handle(async (req) => service.restoreGroupFromArchive(req.params.groupId, actor(req)));
exports.trashGroup = handle(async (req) => service.trashGroup(req.params.groupId, actor(req)));
exports.restoreGroupFromTrash = handle(async (req) => service.restoreGroupFromTrash(req.params.groupId, actor(req)));

// ---- Categories ----
exports.listCategories = handle(async (req) => service.listCategories(req.params.groupId, req.query));
exports.createCategory = handle(async (req) => {
  req._successStatus = 201;
  return service.createCategory(req.params.groupId, req.body, actor(req));
});
exports.getCategory = handle(async (req) => service.getCategory(req.params.categoryId));
exports.updateCategory = handle(async (req) => service.updateCategory(req.params.categoryId, req.body, actor(req)));
exports.archiveCategory = handle(async (req) => service.archiveCategory(req.params.categoryId, actor(req)));
exports.restoreCategory = handle(async (req) => service.restoreCategoryFromArchive(req.params.categoryId, actor(req)));
exports.trashCategory = handle(async (req) => service.trashCategory(req.params.categoryId, actor(req)));
exports.restoreCategoryFromTrash = handle(async (req) => service.restoreCategoryFromTrash(req.params.categoryId, actor(req)));
exports.getCategoryStats = handle(async (req) => service.getCategoryStats(req.params.categoryId));

// ---- Assets ----
exports.listAssets = handle(async (req) => service.listAssets(req.params.categoryId, req.query));
exports.createAsset = handle(async (req) => {
  req._successStatus = 201;
  return service.createAsset(req.params.categoryId, req.body, actor(req));
});
exports.getAsset = handle(async (req) => service.getAsset(req.params.assetId));
exports.updateAsset = handle(async (req) => service.updateAsset(req.params.assetId, req.body, actor(req)));
exports.changeAssetStatus = handle(async (req) => service.changeAssetStatus(req.params.assetId, req.body.status, actor(req)));
exports.deleteAsset = handle(async (req) => service.softDeleteAsset(req.params.assetId, actor(req)));
exports.restoreAsset = handle(async (req) => service.restoreAsset(req.params.assetId, actor(req)));
exports.listAssetVersions = handle(async (req) => service.listAssetVersions(req.params.assetId));
exports.restoreAssetVersion = handle(async (req) => service.restoreAssetVersion(req.params.assetId, req.params.versionId, actor(req)));
exports.listAssetHistory = handle(async (req) => service.listAssetHistory(req.params.assetId, req.query));

// ---- Portfolio rollup ----
exports.getPortfolioTree = handle(async (req) => service.getPortfolioTree(req.params.portfolioId));
exports.listTasks = handle(async (req) => tasks.listTasks(req.params.categoryId, req.query));
exports.createTask = handle(async (req) => { req._successStatus = 201; return tasks.createTask(req.params.categoryId, req.body, actor(req)); });
exports.updateTask = handle(async (req) => tasks.updateTask(req.params.taskId, req.body, actor(req)));
exports.moveTask = handle(async (req) => tasks.moveTask(req.params.taskId, req.body, actor(req)));
exports.archiveTask = handle(async (req) => tasks.archiveTask(req.params.taskId, actor(req)));
exports.categoryActivity = handle(async (req) => activity.listCategoryActivity(req.params.categoryId, req.query));
exports.categoryHealth = handle(async (req) => health.computeCategoryHealth(req.params.categoryId));
exports.portfolioHealth = handle(async (req) => health.computePortfolioHealth(req.params.portfolioId));
exports.listFiles = handle(async (req) => files.listFiles(req.params.categoryId, req.query));
exports.uploadFile = handle(async (req) => { req._successStatus = 201; return files.uploadFile(req.params.categoryId, { file: req.file, body: req.body }, actor(req)); });
exports.replaceFile = handle(async (req) => files.replaceFile(req.params.fileId, { file: req.file, body: req.body }, actor(req)));
exports.fileVersions = handle(async (req) => files.listVersions(req.params.fileId));
exports.archiveFile = handle(async (req) => files.archiveFile(req.params.fileId, actor(req)));
exports.metricDefinitions = handle(async () => metrics.listDefinitions());
exports.categoryMetrics = handle(async (req) => metrics.getMetrics(req.params.categoryId, req.query));
exports.upsertMetric = handle(async (req) => metrics.upsertMetric(req.params.categoryId, req.body, actor(req)));
