import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import { LineChartCard } from '../../../ceo/charts/ChartCards';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import Skeleton from '../../../ui/Skeleton';
import Button from '../../../common/Button';
import { formatMetric } from '../portfolioStatus';
import MetricEntryModal from './MetricEntryModal';

const unwrap = (res) => res?.data ?? res ?? {};
const unwrapArr = (res) => res?.data ?? res ?? [];

const RANGE_OPTIONS = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const CategoryMetricsTab = ({ portfolioId, categoryId }) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [range, setRange] = useState('90d');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const summaryQuery = useQuery({
    queryKey: QK.portfolioHierarchy.metrics(categoryId, { range }),
    queryFn: () => portfolioHierarchyApi.getMetrics(token, categoryId, { range }),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.metrics(categoryId, { range })),
  });
  const summary = unwrap(summaryQuery.data);
  const definitions = summary.definitions || [];
  const activeMetric = selectedMetric || definitions[0]?.key || '';

  const timeseriesQuery = useQuery({
    queryKey: QK.portfolioHierarchy.metricsTimeseries(categoryId, { metric: activeMetric, range }),
    queryFn: () => portfolioHierarchyApi.getMetricsTimeseries(token, categoryId, { metric: activeMetric, range }),
    enabled: Boolean(token && categoryId && activeMetric),
    ...cachePolicyFor(QK.portfolioHierarchy.metricsTimeseries(categoryId, { metric: activeMetric, range })),
  });
  const series = (unwrapArr(timeseriesQuery.data) || []).map((r) => ({ date: new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: r.value }));

  const byAssetQuery = useQuery({
    queryKey: QK.portfolioHierarchy.metricsByAsset(categoryId, { range }),
    queryFn: () => portfolioHierarchyApi.getMetricsByAsset(token, categoryId, { range }),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.metricsByAsset(categoryId, { range })),
  });
  const byAsset = unwrapArr(byAssetQuery.data);

  const invalidateMetrics = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metrics', categoryId] });
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metricsTimeseries', categoryId] });
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metricsByAsset', categoryId] });
    invalidate({ portfolioId, categoryId });
  };

  const importMutation = useMutation({
    mutationFn: (file) => { const fd = new FormData(); fd.append('file', file); return portfolioHierarchyApi.importMetricsCsv(token, categoryId, fd); },
    onSuccess: (res) => {
      const result = unwrap(res);
      setImportResult(result);
      toast[result.failed ? 'error' : 'success'](`Imported ${result.imported}/${result.total} rows${result.failed ? `, ${result.failed} failed` : ''}.`);
      invalidateMetrics();
    },
    onError: (err) => toast.error(err?.message || 'CSV import failed'),
  });

  if (summaryQuery.isError) return <ErrorState title="Could not load metrics" description={summaryQuery.error?.message} onRetry={() => summaryQuery.refetch()} />;

  const hasAnyData = (summary.summary || []).some((s) => s.value > 0) || byAsset.some((a) => Object.values(a.metrics || {}).some((v) => v > 0));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importMutation.mutate(f); e.target.value = ''; }} />
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} loading={importMutation.isPending} icon={<span className="material-symbols-outlined text-lg">upload_file</span>}>Import CSV</Button>
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setEntryOpen(true)} icon={<span className="material-symbols-outlined text-lg">add</span>}>Add Metric</Button>
      </div>

      {importResult ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${importResult.failed ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
          Imported {importResult.imported} of {importResult.total} rows.
          {importResult.failed ? ` ${importResult.failed} row(s) failed: ${importResult.results.filter((r) => !r.ok).slice(0, 3).map((r) => `row ${r.row} (${r.error})`).join('; ')}${importResult.failed > 3 ? '…' : ''}` : ''}
        </div>
      ) : null}

      {!hasAnyData && !summaryQuery.isLoading ? (
        <EmptyState icon="bar_chart" title="No performance data yet" description="Track performance for this category." actionLabel="Add Metric" onAction={() => setEntryOpen(true)} />
      ) : (
        <>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-neutral-400">Performance Summary</p>
            {summaryQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(summary.summary || []).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMetric(m.key)}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${activeMetric === m.key ? 'border-primary bg-primary/5' : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{m.label}</p>
                    <p className="mt-1 text-xl font-black tracking-tight text-neutral-900 dark:text-white">{formatMetric(m.value, m.unit)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <LineChartCard title={`Performance Over Time — ${definitions.find((d) => d.key === activeMetric)?.label || ''}`} data={series} xKey="date" lineKey="value" height={260} />

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-neutral-400">Asset Performance</p>
            {byAsset.length === 0 ? (
              <EmptyState icon="table_chart" title="No assets yet" />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      <th className="px-4 py-3">Title</th>
                      {definitions.slice(0, 5).map((d) => <th key={d.key} className="px-4 py-3">{d.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {byAsset.map((row) => (
                      <tr key={row.assetId}>
                        <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{row.title}</td>
                        {definitions.slice(0, 5).map((d) => <td key={d.key} className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatMetric(row.metrics?.[d.key], d.unit)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <MetricEntryModal open={entryOpen} onClose={() => setEntryOpen(false)} portfolioId={portfolioId} categoryId={categoryId} definitions={definitions} />
    </section>
  );
};

export default CategoryMetricsTab;
