import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const levelClass = (level) => {
  if (level === 'error' || level === 'fatal') return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900';
  if (level === 'warn') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900';
};

const SystemLogsPage = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ level: '', event: '', module: '', action: '', requestId: '', search: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(pagination.page || 1), limit: String(pagination.limit || 50) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiClient.get(`/api/logs?${queryString}`, token, { cache: false, forceRefresh: true });
        if (!active) return;
        setLogs(res?.data?.logs || []);
        setPagination((current) => ({ ...current, ...(res?.data?.pagination || {}) }));
      } catch (err) {
        if (active) setError(err.message || 'Failed to load system logs');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [token, queryString, refreshTick]);

  const updateFilter = (key, value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="app-container">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="portal-section-title">System Logs</p>
          <h1 className="mt-1 text-2xl font-black text-neutral-950 dark:text-neutral-50">MongoDB Atlas Activity</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Last 7 days are retained automatically by MongoDB TTL.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setRefreshTick((current) => current + 1)} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-6">
        <input className="app-input" placeholder="Search message, event, user" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
        <input className="app-input" placeholder="Event" value={filters.event} onChange={(e) => updateFilter('event', e.target.value)} />
        <input className="app-input" placeholder="Module" value={filters.module} onChange={(e) => updateFilter('module', e.target.value)} />
        <input className="app-input" placeholder="Action" value={filters.action} onChange={(e) => updateFilter('action', e.target.value)} />
        <input className="app-input" placeholder="Request ID" value={filters.requestId} onChange={(e) => updateFilter('requestId', e.target.value)} />
        <select className="app-input" value={filters.level} onChange={(e) => updateFilter('level', e.target.value)}>
          <option value="">All levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="fatal">Fatal</option>
        </select>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">API</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {logs.map((log) => (
                  <tr key={log._id} className="cursor-pointer transition hover:bg-orange-50/60 dark:hover:bg-orange-950/20" onClick={() => setSelected(log)}>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${levelClass(log.level)}`}>{log.level}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-neutral-900 dark:text-neutral-100">{log.event}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{log.module || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{log.userName || log.userEmail || log.userId || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{log.role || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{log.department || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">{[log.method, log.route].filter(Boolean).join(' ') || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{log.statusCode || '-'}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{log.durationMs == null ? '-' : `${Math.round(Number(log.durationMs))}ms`}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{log.requestId || '-'}</td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{log.message}</td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-neutral-500">No logs found.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-neutral-500">Loading logs...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800">
            <span>{pagination.total} logs</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>Next</Button>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-black uppercase tracking-wide text-neutral-700 dark:text-neutral-200">Structured Detail</h2>
          {selected ? (
            <pre className="mt-3 max-h-[620px] overflow-auto rounded-lg bg-neutral-950 p-3 text-xs leading-5 text-neutral-100">
              {JSON.stringify(selected, null, 2)}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">Select a log row to inspect the full MongoDB document.</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default SystemLogsPage;
