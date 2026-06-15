import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ceoApi } from '../../services/ceo';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import { LineChartCard } from './charts/ChartCards';

const fallbackReports = [
  { id: 'growth', title: 'Company Growth Report', category: 'Growth', period: 'Q4', owner: 'Strategy Desk', createdAt: new Date().toISOString(), status: 'ready' },
  { id: 'market', title: 'Market Performance Summary', category: 'Market', period: 'Q4', owner: 'Research', createdAt: new Date().toISOString(), status: 'ready' },
  { id: 'risk', title: 'Risk & Opportunity Analysis', category: 'Risk', period: 'Monthly', owner: 'Compliance', createdAt: new Date().toISOString(), status: 'draft' },
];

const normalizeReports = (payload) => {
  const base =
    payload?.data?.reports ||
    payload?.reports ||
    payload?.data ||
    [];

  if (!Array.isArray(base) || base.length === 0) return fallbackReports;

  return base.map((report, index) => ({
    id: report?._id || report?.id || `report-${index}`,
    title: report?.title || report?.name || `Report ${index + 1}`,
    category: report?.category || report?.type || 'General',
    period: report?.period || report?.window || 'N/A',
    owner: report?.owner || report?.createdBy?.name || 'System',
    createdAt: report?.createdAt || report?.updatedAt || new Date().toISOString(),
    status: report?.status || 'ready',
  }));
};

const downloadCsv = (rows) => {
  const header = ['Title', 'Category', 'Period', 'Owner', 'Status', 'Created At'];
  const lines = rows.map((r) => [r.title, r.category, r.period, r.owner, r.status, new Date(r.createdAt).toLocaleString()]);
  const csv = [header, ...lines]
    .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ceo-reports-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadPdf = (rows) => {
  const htmlRows = rows
    .map(
      (r) =>
        `<tr><td>${r.title}</td><td>${r.category}</td><td>${r.period}</td><td>${r.owner}</td><td>${r.status}</td></tr>`
    )
    .join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>CEO Reports</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 12px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>CEO Reports</h1>
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Period</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};

const CEOReports = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [period, setPeriod] = useState('30d');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [metaOptions, setMetaOptions] = useState({ products: [], departments: [] });
  const [refreshTick, setRefreshTick] = useState(0);
  const revenueQ = useQuery({
    queryKey: ['ceo-revenue-chart', token, period, productFilter, departmentFilter],
    queryFn: async () => (await ceoApi.getRevenueAnalytics(token))?.data || {},
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await ceoApi.getReports(token, {
          period,
          search,
          category: categoryFilter !== 'all' ? categoryFilter : '',
          status: statusFilter !== 'all' ? statusFilter : '',
          product: productFilter !== 'all' ? productFilter : '',
          department: departmentFilter !== 'all' ? departmentFilter : '',
          from: fromDate || '',
          to: toDate || '',
        });
        if (mounted) {
          setReports(normalizeReports(res?.data || res));
          setMetaOptions({
            products: res?.data?.meta?.products || [],
            departments: res?.data?.meta?.departments || [],
          });
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load reports');
        if (mounted) setReports(fallbackReports);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, refreshTick, period, search, categoryFilter, statusFilter, productFilter, departmentFilter, fromDate, toDate]);

  const categories = useMemo(
    () => ['all', ...new Set(reports.map((r) => r.category).filter(Boolean))],
    [reports]
  );

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const searchMatch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      const categoryMatch = categoryFilter === 'all' || r.category === categoryFilter;
      const statusMatch = statusFilter === 'all' || r.status === statusFilter;
      return searchMatch && categoryMatch && statusMatch;
    });
  }, [reports, search, categoryFilter, statusFilter]);

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="CEO Reports"
          subtitle="Filter and export board-level reports"
          icon="assessment"
          showSearch={false}
          showNotifications
          showThemeToggle
        >
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setRefreshTick((x) => x + 1)}>Refresh</Button>
            <Button type="button" variant="secondary" disabled={filteredReports.length === 0} onClick={() => downloadPdf(filteredReports)}>Download PDF</Button>
            <Button type="button" variant="primary" disabled={filteredReports.length === 0} onClick={() => downloadCsv(filteredReports)}>Download CSV</Button>
          </div>
        </PortalHeader>
        {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {error}. Showing fallback report data.
        </div>
        )}

        <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="ytd">Year to date</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search report..."
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Categories' : c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="all">All Status</option>
          <option value="ready">Ready</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="all">All Products</option>
          {metaOptions.products.map((product) => (
            <option key={product} value={product}>
              {product}
            </option>
          ))}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="all">All Departments</option>
          {metaOptions.departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
          </div>
        </section>

        <div className="mb-4">
          <LineChartCard
            title="Filter-based Revenue Trend"
            data={revenueQ.data?.trend || []}
            xKey="month"
            lineKey="revenue"
            formatter={(v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-neutral-500">Loading reports...</td>
              </tr>
            )}
            {!loading && filteredReports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-neutral-500">No reports found.</td>
              </tr>
            )}
            {!loading &&
              filteredReports.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm">{r.title}</td>
                  <td className="px-4 py-3 text-sm">{r.category}</td>
                  <td className="px-4 py-3 text-sm">{r.period}</td>
                  <td className="px-4 py-3 text-sm">{r.owner}</td>
                  <td className="px-4 py-3 text-sm">{r.status}</td>
                </tr>
              ))}
          </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default CEOReports;
