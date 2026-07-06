// Pure funnel/conversion math — no DB access.

const FUNNEL_STAGES = ['awareness', 'interest', 'websiteVisit', 'registration', 'lead', 'customer', 'retention', 'referral'];
const KPI_STAGES = ['websiteTraffic', 'registrations', 'leads', 'bookings', 'revenue', 'retention'];

const conversionRate = (current = 0, previous = 0) => {
  if (!previous) return 0;
  return (Number(current) / Number(previous)) * 100;
};

// Returns [{ stage, count, conversionFromPrevious }] for a given stage list read off a snapshot-shaped object.
const computeStageSeries = (snapshot = {}, stages) =>
  stages.map((stage, index) => {
    const count = Number(snapshot[stage] || 0);
    const previousStage = stages[index - 1];
    const previousCount = previousStage ? Number(snapshot[previousStage] || 0) : null;
    return {
      stage,
      count,
      conversionFromPrevious: previousCount === null ? null : conversionRate(count, previousCount),
    };
  });

const computeConversionFunnel = (snapshot = {}) => computeStageSeries(snapshot, FUNNEL_STAGES);
const computeKpiSeries = (snapshot = {}) => computeStageSeries(snapshot, KPI_STAGES);

module.exports = {
  FUNNEL_STAGES,
  KPI_STAGES,
  conversionRate,
  computeConversionFunnel,
  computeKpiSeries,
};
