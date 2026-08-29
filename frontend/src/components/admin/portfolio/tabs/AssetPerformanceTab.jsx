import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { LineChartCard } from '../../../ceo/charts/ChartCards';
import EmptyState from '../../../ui/EmptyState';
import Skeleton from '../../../ui/Skeleton';
import { formatMetric } from '../portfolioStatus';

const unwrapArr = (res) => res?.data ?? res ?? [];

// Reuses the same metric definitions/entries as the category Metrics tab,
// scoped down to this one asset (spec §7 "Performance" tab).
const AssetPerformanceTab = ({ categoryId, assetId }) => {
  const { token } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState('');

  const byAssetQuery = useQuery({
    queryKey: QK.portfolioHierarchy.metricsByAsset(categoryId, { range: 'all' }),
    queryFn: () => portfolioHierarchyApi.getMetricsByAsset(token, categoryId, { range: 'all' }),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.metricsByAsset(categoryId, { range: 'all' })),
  });
  // Same key as CategoryMetricsTab's definitions fetch — one shared cache
  // entry for the whole module instead of a per-tab refetch.
  const defsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.metricDefs(),
    queryFn: () => portfolioHierarchyApi.getMetricDefinitions(token),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const definitions = unwrapArr(defsQuery.data);
  const assetRow = unwrapArr(byAssetQuery.data).find((r) => String(r.assetId) === String(assetId));
  const activeMetric = selectedMetric || definitions[0]?.key || '';

  const assetTimeseriesKey = ['portfolioHierarchy', 'assetMetricsTimeseries', assetId, activeMetric];
  const timeseriesQuery = useQuery({
    queryKey: assetTimeseriesKey,
    queryFn: () => portfolioHierarchyApi.getMetricsTimeseries(token, categoryId, { metric: activeMetric, range: 'all', assetId }),
    enabled: Boolean(token && categoryId && activeMetric),
    select: (res) => unwrapArr(res),
    ...cachePolicyFor(assetTimeseriesKey),
  });

  if (byAssetQuery.isLoading || defsQuery.isLoading) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  const hasData = assetRow && Object.values(assetRow.metrics || {}).some((v) => v > 0);
  if (!hasData) {
    return <EmptyState icon="monitoring" title="No performance data yet" description="Record metrics for this asset from the category's Metrics tab." />;
  }

  const series = (timeseriesQuery.data || []).map((r) => ({ date: new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: r.value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {definitions.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setSelectedMetric(d.key)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${activeMetric === d.key ? 'border-primary bg-primary/5' : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{d.label}</p>
            <p className="mt-1 text-xl font-black tracking-tight text-neutral-900 dark:text-white">{formatMetric(assetRow.metrics?.[d.key], d.unit)}</p>
          </button>
        ))}
      </div>
      <LineChartCard title={`Performance Over Time — ${definitions.find((d) => d.key === activeMetric)?.label || ''}`} data={series} xKey="date" lineKey="value" height={240} />
    </div>
  );
};

export default AssetPerformanceTab;
