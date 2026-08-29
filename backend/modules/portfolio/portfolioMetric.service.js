const mongoose = require('mongoose');
const PortfolioMetricDefinition = require('../../models/portfolio/PortfolioMetricDefinition');
const PortfolioMetricEntry = require('../../models/portfolio/PortfolioMetricEntry');
const PortfolioAsset = require('../../models/portfolio/PortfolioAsset');
const { ValidationError, resolveCategoryChain, resolveAssetChain, startOfUTCDay, audit } = require('./portfolioShared');

const listDefinitions = () => PortfolioMetricDefinition.find({ isActive: true }).sort({ order: 1, label: 1 }).lean();

const rangeToDays = (range) => (range === '30d' ? 30 : range === '7d' ? 7 : range === 'all' ? null : 90);

const aggregate = (rows, aggregation) => {
  if (!rows.length) return 0;
  if (aggregation === 'latest') return rows[rows.length - 1].value;
  if (aggregation === 'avg') return rows.reduce((sum, r) => sum + r.value, 0) / rows.length;
  return rows.reduce((sum, r) => sum + r.value, 0);
};

// Card row per active metric definition, summed/averaged over the range —
// spec §13 "Performance summary".
const getMetrics = async (categoryId, { range = '90d' } = {}) => {
  await resolveCategoryChain(categoryId);
  const definitions = await listDefinitions();
  const filter = { categoryId };
  const days = rangeToDays(range);
  if (days) filter.date = { $gte: new Date(Date.now() - days * 864e5) };
  const entries = await PortfolioMetricEntry.find(filter).sort({ date: 1 }).lean();
  const summary = definitions.map((definition) => {
    const rows = entries.filter((entry) => entry.metricKey === definition.key);
    return { ...definition, value: aggregate(rows, definition.aggregation) };
  });
  return { definitions, entries, summary };
};

// One line series per metric, bucketed by day — spec §13 "Performance over time".
// With `assetId`, scoped to that asset only (used by the asset-level
// Performance tab); without it, summed across the whole category.
const getTimeseries = async (categoryId, { metric, range = '90d', assetId } = {}) => {
  await resolveCategoryChain(categoryId);
  if (!metric) throw new ValidationError('metric is required');
  const match = { categoryId: new mongoose.Types.ObjectId(String(categoryId)), metricKey: String(metric).toLowerCase() };
  if (assetId) match.assetId = new mongoose.Types.ObjectId(String(assetId));
  const days = rangeToDays(range);
  if (days) match.date = { $gte: new Date(Date.now() - days * 864e5) };
  const rows = await PortfolioMetricEntry.aggregate([
    { $match: match },
    { $group: { _id: '$date', value: { $sum: '$value' } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ date: r._id, value: r.value }));
};

// Per-asset rollup (sum over the range per metric) — spec §13 "Asset performance".
const getByAsset = async (categoryId, { range = '90d' } = {}) => {
  await resolveCategoryChain(categoryId);
  const definitions = await listDefinitions();
  const filter = { categoryId, assetId: { $ne: null } };
  const days = rangeToDays(range);
  if (days) filter.date = { $gte: new Date(Date.now() - days * 864e5) };
  const entries = await PortfolioMetricEntry.find(filter).lean();
  const assets = await PortfolioAsset.find({ categoryId, deletedAt: null }).select('title status').lean();

  return assets.map((asset) => {
    const rows = entries.filter((e) => String(e.assetId) === String(asset._id));
    const byMetric = {};
    definitions.forEach((d) => {
      const metricRows = rows.filter((r) => r.metricKey === d.key);
      byMetric[d.key] = aggregate(metricRows, d.aggregation);
    });
    return { assetId: asset._id, title: asset.title, status: asset.status, metrics: byMetric };
  });
};

const upsertMetric = async (categoryId, body, actor) => {
  const category = await resolveCategoryChain(categoryId);
  const definition = await PortfolioMetricDefinition.findOne({ key: String(body.metricKey || '').toLowerCase(), isActive: true });
  if (!definition) throw new ValidationError('Invalid metric');
  const value = Number(body.value);
  if (!Number.isFinite(value)) throw new ValidationError('Metric value must be a number');
  let assetId = null;
  if (body.assetId) assetId = (await resolveAssetChain(body.assetId, { categoryId }))._id;
  const date = startOfUTCDay(body.date || new Date());
  const entry = await PortfolioMetricEntry.findOneAndUpdate(
    { categoryId: category._id, assetId, metricKey: definition.key, date },
    { $set: { value, note: body.note || '', source: 'manual', updatedBy: actor?.id }, $setOnInsert: { portfolioId: category.portfolioId, createdBy: actor?.id } },
    { upsert: true, new: true, runValidators: true }
  );
  await audit(actor, 'METRIC_UPDATED', 'PortfolioMetricEntry', entry._id, { categoryId: String(categoryId), metricKey: definition.key, value });
  return entry;
};

// Small built-in CSV parser — no csv-parsing library in the project's deps.
// Expected header: metricKey,value,date,assetTitle (assetTitle optional — a
// blank assetTitle records a category-level entry). Returns per-row results so
// the UI can show which rows imported and which failed, instead of an
// all-or-nothing import.
const parseCsv = (text) => {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    return row;
  });
};

const importCsv = async (categoryId, buffer, actor) => {
  const category = await resolveCategoryChain(categoryId);
  const definitions = await listDefinitions();
  const defKeys = new Set(definitions.map((d) => d.key));
  const assets = await PortfolioAsset.find({ categoryId, deletedAt: null }).select('title').lean();
  const assetByTitle = new Map(assets.map((a) => [a.title.trim().toLowerCase(), a._id]));

  const rows = parseCsv(buffer.toString('utf8'));
  const results = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-index
    const metricKey = String(row.metrickey || '').toLowerCase();
    const value = Number(row.value);
    try {
      if (!defKeys.has(metricKey)) throw new Error(`Unknown metric "${row.metrickey}"`);
      if (!Number.isFinite(value)) throw new Error('Value must be a number');
      let assetId = null;
      if (row.assettitle) {
        assetId = assetByTitle.get(String(row.assettitle).trim().toLowerCase());
        if (!assetId) throw new Error(`No asset titled "${row.assettitle}" in this category`);
      }
      const date = startOfUTCDay(row.date || new Date());
      await PortfolioMetricEntry.findOneAndUpdate(
        { categoryId: category._id, assetId: assetId || null, metricKey, date },
        { $set: { value, source: 'csv', updatedBy: actor?.id }, $setOnInsert: { portfolioId: category.portfolioId, createdBy: actor?.id } },
        { upsert: true, runValidators: true }
      );
      results.push({ row: rowNum, ok: true });
    } catch (err) {
      results.push({ row: rowNum, ok: false, error: err.message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  await audit(actor, 'METRIC_UPDATED', 'PortfolioCategory', category._id, { csvImport: true, rows: rows.length, imported: okCount });
  return { total: rows.length, imported: okCount, failed: rows.length - okCount, results };
};

module.exports = { listDefinitions, getMetrics, getTimeseries, getByAsset, upsertMetric, importCsv };
