const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Portfolio = require('../models/Portfolio');
const PortfolioGroup = require('../models/portfolio/PortfolioGroup');
const PortfolioCategory = require('../models/portfolio/PortfolioCategory');
const PortfolioAsset = require('../models/portfolio/PortfolioAsset');
const MigrationBatch = require('../models/portfolio/MigrationBatch');
const { PROJECT_REGISTRY } = require('../utils/projectAccess');

const TYPE = 'portfolio_hierarchy_v1';
const SOURCE = 'Portfolio.sections.items';
const APPLY = process.argv.includes('--apply');
const rollbackAt = process.argv.indexOf('--rollback');
const ROLLBACK_ID = rollbackAt >= 0 ? process.argv[rollbackAt + 1] : null;
const normalize = (v) => String(v || '').trim().toLowerCase();
const statusMap = { 'not-started': 'backlog', 'in-progress': 'in_progress', done: 'published' };

const brandCode = (portfolio) => {
  const keys = new Set([portfolio.projectName, portfolio.projectCode].map(normalize));
  return PROJECT_REGISTRY.find((p) => [p.code, p.name, ...(p.aliases || [])].map(normalize).some((v) => keys.has(v)))?.brandCode || '';
};

const duplicateKeys = (rows, keyOf) => {
  const counts = new Map();
  rows.forEach((row) => counts.set(keyOf(row), (counts.get(keyOf(row)) || 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
};

const buildPlan = async () => {
  const [portfolios, groups, categories, assets] = await Promise.all([
    Portfolio.find().lean(),
    PortfolioGroup.find({ $or: [{ legacyId: { $ne: null } }, { legacySectionId: { $ne: null } }] }).lean(),
    PortfolioCategory.find({ $or: [{ legacyId: { $ne: null } }, { legacyItemId: { $ne: null } }] }).lean(),
    PortfolioAsset.find({ $or: [{ legacyId: { $ne: null } }, { legacyItemId: { $ne: null } }] }).lean(),
  ]);
  const map = (rows, fallback) => new Map(rows.map((r) => [`${r.portfolioId}:${r.legacyId || r[fallback]}`, r]));
  const groupMap = map(groups, 'legacySectionId'); const categoryMap = map(categories, 'legacyItemId'); const assetMap = map(assets, 'legacyItemId');
  const plan = { portfolios, groups: [], categories: [], assets: [], conflicts: [], duplicates: [] };
  for (const portfolio of portfolios) for (const section of portfolio.sections || []) {
    const sectionId = String(section._id); const group = groupMap.get(`${portfolio._id}:${sectionId}`) || null;
    plan.groups.push({ portfolio, section, legacyId: sectionId, existing: group });
    if (group && group.title !== section.title) plan.conflicts.push({ type: 'group', legacyId: sectionId, existing: group.title, incoming: section.title });
    for (const item of section.items || []) {
      const itemId = String(item._id); const key = `${portfolio._id}:${itemId}`;
      const category = categoryMap.get(key) || null; const asset = assetMap.get(key) || null;
      plan.categories.push({ portfolio, section, item, legacyId: itemId, existing: category });
      plan.assets.push({ portfolio, section, item, legacyId: itemId, existing: asset });
      if (category && category.title !== item.title) plan.conflicts.push({ type: 'category', legacyId: itemId, existing: category.title, incoming: item.title });
      if (asset && asset.title !== item.title) plan.conflicts.push({ type: 'asset', legacyId: itemId, existing: asset.title, incoming: item.title });
    }
  }
  for (const [type, rows] of [['group', plan.groups], ['category', plan.categories], ['asset', plan.assets]]) {
    plan.duplicates.push(...duplicateKeys(rows, (r) => `${r.portfolio._id}:${r.legacyId}`).map((d) => ({ type, ...d })));
  }
  return plan;
};

const report = (plan) => {
  const create = (rows) => rows.filter((r) => !r.existing).length;
  const counts = { groups: create(plan.groups), categories: create(plan.categories), assets: create(plan.assets) };
  const allRows = [...plan.groups, ...plan.categories, ...plan.assets];
  const needsTraceUpdate = (r) => r.existing && (!r.existing.legacyId || !r.existing.legacySource || !r.existing.migratedAt);
  counts.updated = allRows.filter(needsTraceUpdate).length;
  counts.skipped = allRows.filter((r) => r.existing && !needsTraceUpdate(r)).length;
  counts.source = plan.groups.length + plan.categories.length + plan.assets.length;
  const output = {
    'Existing records found': plan.portfolios.length,
    'Brands to create': 0,
    'Groups to create': counts.groups,
    'Categories to create': counts.categories,
    'Assets to create': counts.assets,
    'Records to update': counts.updated,
    'Records to skip': counts.skipped,
    'Potential conflicts': plan.conflicts.length,
    'Potential duplicates': plan.duplicates.length,
    'Source records': counts.source,
    'Counts reconcile': counts.source === counts.groups + counts.categories + counts.assets + counts.updated + counts.skipped,
  };
  console.log(JSON.stringify(output, null, 2));
  if (plan.conflicts.length) console.log('Conflicts:', JSON.stringify(plan.conflicts, null, 2));
  if (plan.duplicates.length) console.log('Duplicates:', JSON.stringify(plan.duplicates, null, 2));
  return { ...counts, valid: output['Counts reconcile'] && !plan.conflicts.length && !plan.duplicates.length };
};

const apply = async (plan, counts) => {
  if (!counts.valid) throw new Error('Refusing apply because dry-run validation is not clean');
  const session = await mongoose.startSession(); let batchId;
  try {
    await session.withTransaction(async () => {
      const [batch] = await MigrationBatch.create([{ type: TYPE, executedBy: process.env.MIGRATION_EXECUTED_BY || 'cli', dryRun: false, sourceCount: counts.source }], { session });
      batchId = batch._id; const migratedAt = new Date(); const groupIds = new Map(); const categoryIds = new Map();
      for (const row of plan.groups) {
        if (row.existing) { groupIds.set(`${row.portfolio._id}:${row.legacyId}`, row.existing._id); await PortfolioGroup.updateOne({ _id: row.existing._id }, { $set: { legacyId: row.legacyId, legacySource: SOURCE, migratedAt: row.existing.migratedAt || migratedAt, migrationBatchId: batchId, migrationCreated: false } }, { session }); continue; }
        const [doc] = await PortfolioGroup.create([{ portfolioId: row.portfolio._id, brandCode: brandCode(row.portfolio), title: row.section.title, description: row.section.description || '', order: row.section.order || 0, legacySectionId: row.legacyId, legacyId: row.legacyId, legacySource: SOURCE, migratedAt, migrationBatchId: batchId, migrationCreated: true }], { session });
        groupIds.set(`${row.portfolio._id}:${row.legacyId}`, doc._id);
      }
      for (const row of plan.categories) {
        if (row.existing) { categoryIds.set(`${row.portfolio._id}:${row.legacyId}`, row.existing._id); await PortfolioCategory.updateOne({ _id: row.existing._id }, { $set: { legacyId: row.legacyId, legacySource: SOURCE, migratedAt: row.existing.migratedAt || migratedAt, migrationBatchId: batchId, migrationCreated: false } }, { session }); continue; }
        const groupId = groupIds.get(`${row.portfolio._id}:${String(row.section._id)}`);
        const [doc] = await PortfolioCategory.create([{ portfolioId: row.portfolio._id, groupId, title: row.item.title, order: row.item.order || 0, legacyItemId: row.legacyId, legacyId: row.legacyId, legacySource: SOURCE, migratedAt, migrationBatchId: batchId, migrationCreated: true }], { session });
        categoryIds.set(`${row.portfolio._id}:${row.legacyId}`, doc._id);
      }
      for (const row of plan.assets) if (row.existing) {
        await PortfolioAsset.updateOne({ _id: row.existing._id }, { $set: { legacyId: row.legacyId, legacySource: SOURCE, migratedAt: row.existing.migratedAt || migratedAt, migrationBatchId: batchId, migrationCreated: false } }, { session });
      } else {
        const groupId = groupIds.get(`${row.portfolio._id}:${String(row.section._id)}`); const categoryId = categoryIds.get(`${row.portfolio._id}:${row.legacyId}`);
        await PortfolioAsset.create([{ portfolioId: row.portfolio._id, groupId, categoryId, title: row.item.title, status: statusMap[row.item.status] || 'backlog', description: row.item.link ? `Link: ${row.item.link}` : '', notes: row.item.notes || '', legacyItemId: row.legacyId, legacyId: row.legacyId, legacySource: SOURCE, migratedAt, migrationBatchId: batchId, migrationCreated: true }], { session });
      }
      await MigrationBatch.updateOne({ _id: batchId }, { $set: { completedAt: new Date(), createdCount: counts.groups + counts.categories + counts.assets, updatedCount: counts.updated, skippedCount: counts.skipped, status: 'completed' } }, { session });
    });
    console.log(`Migration applied atomically. Batch: ${batchId}`);
  } finally { await session.endSession(); }
};

const rollback = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new Error('Valid batch id required after --rollback');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const batch = await MigrationBatch.findOne({ _id: id, type: TYPE, status: 'completed' }).session(session);
      if (!batch) throw new Error('Completed migration batch not found');
      const a = await PortfolioAsset.deleteMany({ migrationBatchId: id, migrationCreated: true }, { session });
      const c = await PortfolioCategory.deleteMany({ migrationBatchId: id, migrationCreated: true }, { session });
      const g = await PortfolioGroup.deleteMany({ migrationBatchId: id, migrationCreated: true }, { session });
      await PortfolioAsset.updateMany({ migrationBatchId: id, migrationCreated: false }, { $unset: { migrationBatchId: 1 } }, { session });
      await PortfolioCategory.updateMany({ migrationBatchId: id, migrationCreated: false }, { $unset: { migrationBatchId: 1 } }, { session });
      await PortfolioGroup.updateMany({ migrationBatchId: id, migrationCreated: false }, { $unset: { migrationBatchId: 1 } }, { session });
      batch.status = 'rolled_back'; batch.completedAt = new Date();
      batch.errors.push({ message: 'Explicit batch rollback', details: { assets: a.deletedCount, categories: c.deletedCount, groups: g.deletedCount } });
      await batch.save({ session });
    });
    console.log(`Rolled back ${id}; legacy records were untouched.`);
  } finally { await session.endSession(); }
};

(async () => {
  await connectDB();
  if (ROLLBACK_ID) return rollback(ROLLBACK_ID);
  const plan = await buildPlan(); const counts = report(plan);
  if (!APPLY) return console.log(`Dry run only. Plan id: ${crypto.randomUUID()}`);
  return apply(plan, counts);
})().catch((err) => { console.error('Migration failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());
