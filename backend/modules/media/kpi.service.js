const KpiSnapshot = require('../../models/department/KpiSnapshot');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { computeConversionFunnel, computeKpiSeries } = require('./kpiFunnel.service');

const currentPeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const getSnapshot = (projectId, period) => KpiSnapshot.findOne({ projectId, period: period || currentPeriod() }).lean();

const getLatestSnapshot = (projectId) => KpiSnapshot.findOne({ projectId }).sort({ period: -1 }).lean();

const upsertSnapshot = async (projectId, payload = {}, actorId) => {
  const period = String(payload.period || currentPeriod());
  const numericFields = [
    'websiteTraffic', 'registrations', 'leads', 'bookings', 'revenue', 'retention',
    'awareness', 'interest', 'websiteVisit', 'registration', 'lead', 'customer', 'referral',
  ];
  const update = {};
  numericFields.forEach((field) => {
    if (payload[field] !== undefined) update[field] = Number(payload[field]) || 0;
  });
  update.updatedBy = actorId;

  const doc = await KpiSnapshot.findOneAndUpdate(
    { projectId, period },
    { $set: update, $setOnInsert: { projectId, period } },
    { upsert: true, new: true }
  );

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'kpi_snapshot_updated',
    targetType: 'KpiSnapshot',
    targetId: doc._id,
    metadata: { projectId, period },
  });

  return doc;
};

const getFunnel = async (projectId, period) => {
  const snapshot = period ? await getSnapshot(projectId, period) : await getLatestSnapshot(projectId);
  return { period: snapshot?.period || period || currentPeriod(), stages: computeConversionFunnel(snapshot || {}) };
};

const getKpiTrend = async (projectId, period) => {
  const snapshot = period ? await getSnapshot(projectId, period) : await getLatestSnapshot(projectId);
  return { period: snapshot?.period || period || currentPeriod(), stages: computeKpiSeries(snapshot || {}) };
};

module.exports = {
  currentPeriod,
  getSnapshot,
  getLatestSnapshot,
  upsertSnapshot,
  getFunnel,
  getKpiTrend,
};
