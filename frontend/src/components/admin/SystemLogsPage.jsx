import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import ThemeToggleButton from '../common/ThemeToggleButton';
import SystemLogsDashboard from './SystemLogsDashboard';

const RANGE_PRESETS = [
  { key: '15m', label: '15m', ms: 15 * 60 * 1000 },
  { key: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { key: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'All', ms: null },
];

const EMPTY_FILTERS = {
  level: '',
  event: '',
  module: '',
  action: '',
  requestId: '',
  search: '',
  statusCode: '',
  role: '',
  department: '',
  sessionId: '',
};

const pad = (value) => String(value).padStart(2, '0');

// Log timestamps are read in sequence, so lead with the clock and keep the
// date secondary. Millisecond precision matters when ordering a single trace.
const formatClock = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return { time: '-', date: '', iso: '' };
  return {
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}`,
    date: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    iso: date.toISOString(),
  };
};

const formatRelative = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const formatDuration = (ms) => {
  if (ms == null || Number.isNaN(Number(ms))) return null;
  const value = Number(ms);
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
};

const levelClass = (level) => {
  if (level === 'error' || level === 'fatal') return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900';
  if (level === 'warn') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900';
  if (level === 'debug' || level === 'trace') return 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900';
};

// The left rule on each row carries the severity at a glance while scanning.
const levelRule = (level) => {
  if (level === 'error' || level === 'fatal') return 'before:bg-red-500';
  if (level === 'warn') return 'before:bg-amber-500';
  if (level === 'debug' || level === 'trace') return 'before:bg-neutral-300 dark:before:bg-neutral-600';
  return 'before:bg-emerald-500';
};

const statusClass = (code) => {
  const value = Number(code);
  if (!Number.isFinite(value)) return 'text-neutral-400';
  if (value >= 500) return 'text-red-600 dark:text-red-400';
  if (value >= 400) return 'text-amber-600 dark:text-amber-400';
  if (value >= 300) return 'text-sky-600 dark:text-sky-400';
  return 'text-emerald-600 dark:text-emerald-400';
};

// Slow requests should be obvious without reading the number.
const durationClass = (ms) => {
  const value = Number(ms);
  if (!Number.isFinite(value)) return 'text-neutral-400';
  if (value >= 3000) return 'text-red-600 dark:text-red-400 font-bold';
  if (value >= 1000) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-neutral-500 dark:text-neutral-400';
};

const methodClass = (method) => {
  if (method === 'GET') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  if (method === 'POST') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (method === 'PUT' || method === 'PATCH') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  if (method === 'DELETE') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
};

const initials = (name) => String(name || '?')
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || '?';

const isEmptyValue = (value) =>
  value == null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);

const CopyButton = ({ value, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard?.writeText(String(value)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }).catch(() => {});
      }}
      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
    >
      {copied ? 'Copied' : label}
    </button>
  );
};

const DetailRow = ({ label, value, mono = false, className = '', onPivot }) => {
  if (isEmptyValue(value)) return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-neutral-100 py-1.5 last:border-0 dark:border-neutral-800">
      <span className="shrink-0 pt-px text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</span>
      <span className={`min-w-0 break-words text-right text-xs ${mono ? 'font-mono' : ''} ${className || 'text-neutral-700 dark:text-neutral-200'}`}>
        {onPivot ? (
          <button type="button" onClick={onPivot} className="underline decoration-dotted underline-offset-2 hover:text-[var(--portal-accent)]">
            {String(value)}
          </button>
        ) : String(value)}
      </span>
    </div>
  );
};

const DetailSection = ({ title, children, action }) => {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  if (!hasContent) return null;
  return (
    <section className="mt-4 first:mt-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</h3>
        {action}
      </div>
      <div className="mt-1.5">{children}</div>
    </section>
  );
};

const SystemLogsPage = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [showDashboard, setShowDashboard] = useState(true);

  // Filters without pagination — the stats endpoint describes the whole
  // matching set, so it must not inherit page/limit.
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const preset = RANGE_PRESETS.find((item) => item.key === range);
    if (preset?.ms) params.set('startDate', new Date(Date.now() - preset.ms).toISOString());
    return params.toString();
  }, [filters, range]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filterQuery);
    params.set('page', String(pagination.page || 1));
    params.set('limit', String(pagination.limit || 50));
    return params.toString();
  }, [filterQuery, pagination.page, pagination.limit]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiClient.get(`/api/logs?${queryString}`, token, { cache: false, forceRefresh: true });
        if (!active) return;
        setLogs(res?.data?.logs || []);
        setPagination((current) => ({ ...current, ...(res?.data?.pagination || {}) }));
        setLastLoadedAt(new Date());
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

  useEffect(() => {
    if (!token || !showDashboard) return undefined;
    let active = true;
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError('');
        const res = await apiClient.get(`/api/logs/stats?${filterQuery}`, token, { cache: false, forceRefresh: true });
        if (active) setStats(res?.data || null);
      } catch (err) {
        if (active) setStatsError(err.message || 'Failed to load analytics');
      } finally {
        if (active) setStatsLoading(false);
      }
    };
    loadStats();
    return () => {
      active = false;
    };
  }, [token, filterQuery, refreshTick, showDashboard]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => setRefreshTick((current) => current + 1), 10000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const updateFilter = useCallback((key, value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  // Pivoting replaces the whole filter set so the view shows exactly one trace.
  const pivotTo = useCallback((key, value) => {
    if (!value) return;
    setPagination((current) => ({ ...current, page: 1 }));
    setRange('all');
    setFilters({ ...EMPTY_FILTERS, [key]: String(value) });
  }, []);

  const resetFilters = useCallback(() => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters(EMPTY_FILTERS);
    setRange('24h');
  }, []);

  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([, value]) => Boolean(value)),
    [filters]
  );

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const rangeStart = (pagination.total === 0) ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="app-container">
      <div className="mb-4 flex flex-col gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="portal-section-title">System Logs</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">Activity &amp; Audit Trail</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
            Every API call, page view and database event recorded across the portal. Select a row to inspect its full record, or pivot on a request to follow one trace end to end.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
              {loading ? 'Loading' : autoRefresh ? 'Streaming' : 'Live'}
            </span>
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {Number(pagination.total || 0).toLocaleString()} matching
            </span>
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              7-day retention
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-xs font-bold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--portal-accent)]" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto 10s
          </label>
          <Button variant="secondary" size="sm" onClick={() => setShowDashboard((current) => !current)}>
            {showDashboard ? 'Hide analytics' : 'Show analytics'}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportJson} disabled={logs.length === 0}>Export</Button>
          <Button variant="secondary" size="sm" onClick={() => setRefreshTick((current) => current + 1)} loading={loading}>
            Refresh
          </Button>
          <ThemeToggleButton />
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setRange(preset.key);
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                  range === preset.key
                    ? 'bg-[var(--portal-accent)] text-white'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input className="app-input min-w-[220px] flex-1" placeholder="Search message, event, user, route…" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
          <select className="app-input w-auto" value={filters.level} onChange={(e) => updateFilter('level', e.target.value)}>
            <option value="">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="fatal">Fatal</option>
            <option value="debug">Debug</option>
            <option value="trace">Trace</option>
          </select>
          <select className="app-input w-auto" value={pagination.limit} onChange={(e) => setPagination((current) => ({ ...current, limit: Number(e.target.value), page: 1 }))}>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
          </select>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input className="app-input" placeholder="Event" value={filters.event} onChange={(e) => updateFilter('event', e.target.value)} />
          <input className="app-input" placeholder="Module" value={filters.module} onChange={(e) => updateFilter('module', e.target.value)} />
          <input className="app-input" placeholder="Action" value={filters.action} onChange={(e) => updateFilter('action', e.target.value)} />
          <input className="app-input" placeholder="Status code" value={filters.statusCode} onChange={(e) => updateFilter('statusCode', e.target.value)} />
          <input className="app-input" placeholder="Role" value={filters.role} onChange={(e) => updateFilter('role', e.target.value)} />
          <input className="app-input" placeholder="Department" value={filters.department} onChange={(e) => updateFilter('department', e.target.value)} />
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Filters</span>
            {activeFilters.map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => updateFilter(key, '')}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--portal-accent)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/20"
              >
                {key}: {String(value).slice(0, 28)}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" onClick={resetFilters} className="ml-1 text-[11px] font-bold text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200">
              Clear all
            </button>
          </div>
        )}
      </div>

      {showDashboard && (
        <SystemLogsDashboard
          stats={stats}
          loading={statsLoading}
          error={statsError}
          onPivot={(key, value) => updateFilter(key, value)}
        />
      )}

      {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className={`grid gap-3 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-1'}`}>
        <div className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="max-h-[70dvh] overflow-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-500 shadow-sm dark:bg-neutral-950 dark:text-neutral-400">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Time</th>
                  <th className="px-3 py-2.5 font-bold">Event</th>
                  <th className="px-3 py-2.5 font-bold">Actor</th>
                  <th className="px-3 py-2.5 font-bold">Request</th>
                  <th className="px-3 py-2.5 text-right font-bold">Status</th>
                  <th className="px-3 py-2.5 text-right font-bold">Duration</th>
                  <th className="px-3 py-2.5 font-bold">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {logs.map((log) => {
                  const clock = formatClock(log.createdAt);
                  const isSelected = selected?._id === log._id;
                  return (
                    <tr
                      key={log._id}
                      onClick={() => setSelected(log)}
                      className={`relative cursor-pointer align-top transition before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] ${levelRule(log.level)} ${
                        isSelected ? 'bg-[var(--portal-accent)]/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 pl-4">
                        <div className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-100">{clock.time}</div>
                        <div className="text-[11px] text-neutral-400">{clock.date} · {formatRelative(log.createdAt)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ring-1 ${levelClass(log.level)}`}>{log.level}</span>
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">{log.event}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-neutral-400">
                          {[log.module, log.action].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {(log.userName || log.userEmail) ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-black text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
                              {initials(log.userName || log.userEmail)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100">{log.userName || log.userEmail}</div>
                              <div className="truncate text-[11px] text-neutral-400">{[log.role, log.department].filter(Boolean).join(' · ') || '—'}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">System</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {log.route ? (
                          <div className="flex items-center gap-1.5">
                            {log.method && <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-black ${methodClass(log.method)}`}>{log.method}</span>}
                            <span className="truncate font-mono text-[11px] text-neutral-600 dark:text-neutral-300">{log.route}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                        {log.requestId && (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); pivotTo('requestId', log.requestId); }}
                            className="mt-0.5 block truncate font-mono text-[10px] text-neutral-400 underline decoration-dotted underline-offset-2 hover:text-[var(--portal-accent)]"
                            title="Show every log line for this request"
                          >
                            {log.requestId}
                          </button>
                        )}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-mono text-xs font-bold ${statusClass(log.statusCode)}`}>
                        {log.statusCode || '—'}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-mono text-xs ${durationClass(log.durationMs)}`}>
                        {formatDuration(log.durationMs) || '—'}
                      </td>
                      <td className="max-w-[320px] px-3 py-2">
                        <div className="truncate text-xs text-neutral-700 dark:text-neutral-200" title={log.message}>{log.message}</div>
                        {log.error && (
                          <div className="mt-0.5 truncate font-mono text-[11px] text-red-600 dark:text-red-400">
                            {log.error.message || log.error.name || 'error attached'}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No logs match these filters.</p>
                      <p className="mt-1 text-xs text-neutral-400">Try widening the time range or clearing filters.</p>
                      {(activeFilters.length > 0 || range !== 'all') && (
                        <button type="button" onClick={resetFilters} className="mt-3 text-xs font-bold text-[var(--portal-accent)] underline underline-offset-2">
                          Reset to defaults
                        </button>
                      )}
                    </td>
                  </tr>
                )}
                {loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-neutral-500">Loading logs…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-3 py-2.5 text-xs text-neutral-500 dark:border-neutral-800">
            <span>
              {pagination.total > 0
                ? <>Showing <strong className="text-neutral-700 dark:text-neutral-200">{rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}</strong> of {Number(pagination.total).toLocaleString()}</>
                : 'No results'}
              {lastLoadedAt && <span className="ml-2 text-neutral-400">· updated {lastLoadedAt.toLocaleTimeString()}</span>}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Page {pagination.page} / {Math.max(pagination.totalPages, 1)}</span>
              <Button variant="secondary" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>Next</Button>
            </div>
          </div>
        </div>

        {selected && (
          <aside className="min-w-0 self-start rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between gap-2 border-b border-neutral-200 p-4 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ring-1 ${levelClass(selected.level)}`}>{selected.level}</span>
                    <h2 className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{selected.event}</h2>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-neutral-600 dark:text-neutral-300">{selected.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                  aria-label="Close detail"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">close</span>
                </button>
              </div>

              <div className="max-h-[calc(70dvh-80px)] overflow-auto p-4">
                <DetailSection title="Timing">
                  <DetailRow label="Timestamp" value={formatClock(selected.createdAt).iso} mono />
                  <DetailRow label="Local" value={new Date(selected.createdAt).toLocaleString()} />
                  <DetailRow label="Age" value={formatRelative(selected.createdAt)} />
                  <DetailRow label="Duration" value={formatDuration(selected.durationMs)} mono className={durationClass(selected.durationMs)} />
                  <DetailRow label="Threshold" value={formatDuration(selected.thresholdMs)} mono />
                </DetailSection>

                <DetailSection title="Request">
                  <DetailRow label="Method" value={selected.method} mono />
                  <DetailRow label="Route" value={selected.route} mono />
                  <DetailRow label="Status" value={selected.statusCode} mono className={statusClass(selected.statusCode)} />
                  <DetailRow label="Request ID" value={selected.requestId} mono onPivot={() => pivotTo('requestId', selected.requestId)} />
                  <DetailRow label="Session" value={selected.sessionId} mono onPivot={() => pivotTo('sessionId', selected.sessionId)} />
                  <DetailRow label="Source" value={selected.source} />
                </DetailSection>

                <DetailSection title="Actor">
                  <DetailRow label="Name" value={selected.userName} />
                  <DetailRow label="Email" value={selected.userEmail} />
                  <DetailRow label="User ID" value={selected.userId} mono />
                  <DetailRow label="Role" value={selected.role} />
                  <DetailRow label="Department" value={selected.department} />
                </DetailSection>

                <DetailSection title="Context">
                  <DetailRow label="Module" value={selected.module} onPivot={() => pivotTo('module', selected.module)} />
                  <DetailRow label="Action" value={selected.action} onPivot={() => pivotTo('action', selected.action)} />
                  <DetailRow label="Status" value={selected.status} />
                  <DetailRow label="Portal" value={selected.portal} />
                  <DetailRow label="Page" value={selected.page} />
                  <DetailRow label="Frontend route" value={selected.frontendRoute} mono />
                </DetailSection>

                <DetailSection title="Entity">
                  <DetailRow label="Type" value={selected.entityType} />
                  <DetailRow label="Entity ID" value={selected.entityId} mono />
                  <DetailRow label="Target ID" value={selected.targetId} mono />
                  <DetailRow label="Collection" value={selected.collection} mono />
                  <DetailRow label="Operation" value={selected.operation} mono />
                </DetailSection>

                <DetailSection title="Client">
                  <DetailRow label="IP" value={selected.ip} mono />
                  <DetailRow label="User agent" value={selected.userAgent} />
                </DetailSection>

                {!isEmptyValue(selected.error) && (
                  <DetailSection title="Error">
                    <pre className="overflow-auto rounded-lg border border-red-200 bg-red-50 p-2.5 font-mono text-[11px] leading-5 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                      {typeof selected.error === 'string' ? selected.error : JSON.stringify(selected.error, null, 2)}
                    </pre>
                  </DetailSection>
                )}

                {!isEmptyValue(selected.metadata) && (
                  <DetailSection title="Metadata">
                    <pre className="overflow-auto rounded-lg bg-neutral-950 p-2.5 font-mono text-[11px] leading-5 text-neutral-100">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </DetailSection>
                )}

                <DetailSection
                  title="Raw document"
                  action={
                    <div className="flex items-center gap-1">
                      <CopyButton value={JSON.stringify(selected, null, 2)} label="Copy JSON" />
                      <button
                        type="button"
                        onClick={() => setShowRaw((current) => !current)}
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                      >
                        {showRaw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  }
                >
                  {showRaw ? (
                    <pre className="overflow-auto rounded-lg bg-neutral-950 p-2.5 font-mono text-[11px] leading-5 text-neutral-100">
                      {JSON.stringify(selected, null, 2)}
                    </pre>
                  ) : <span className="text-[11px] text-neutral-400">Hidden</span>}
                </DetailSection>
              </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default SystemLogsPage;
