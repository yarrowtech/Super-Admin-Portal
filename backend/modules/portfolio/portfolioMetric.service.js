const PortfolioMetricDefinition = require('../../models/portfolio/PortfolioMetricDefinition');
const PortfolioMetricEntry = require('../../models/portfolio/PortfolioMetricEntry');
const { ValidationError, resolveCategoryChain, resolveAssetChain, startOfUTCDay, audit } = require('./portfolioShared');

const listDefinitions = () => PortfolioMetricDefinition.find({ isActive: true }).sort({ order: 1, label: 1 }).lean();

const getMetrics = async (categoryId, { range = '90d' } = {}) => {
  await resolveCategoryChain(categoryId);
  const definitions = await listDefinitions();
  const filter = { categoryId };
  if (range !== 'all') filter.date = { $gte: new Date(Date.now() - (range === '30d' ? 30 : 90) * 864e5) };
  const entries = await PortfolioMetricEntry.find(filter).sort({ date: 1 }).lean();
  const summary = definitions.map((definition) => {
    const rows = entries.filter((entry) => entry.metricKey === definition.key);
    let value = 0;
    if (definition.aggregation === 'latest') value = rows.at(-1)?.value || 0;
    else if (definition.aggregation === 'avg') value = rows.length ? rows.reduce((sum, row) => sum + row.value, 0) / rows.length : 0;
    else value = rows.reduce((sum, row) => sum + row.value, 0);
    return { ...definition, value };
  });
  return { definitions, entries, summary };
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

module.exports = { listDefinitions, getMetrics, upsertMetric };
