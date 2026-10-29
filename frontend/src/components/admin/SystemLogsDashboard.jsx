import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Shared with the table's colour language: green healthy, amber degraded, red failing.
const BAND_COLORS = {
  '2xx': '#10b981',
  '3xx': '#0ea5e9',
  '4xx': '#f59e0b',
  '5xx': '#ef4444',
};

const LEVEL_COLORS = {
  info: '#10b981',
  warn: '#f59e0b',
  error: '#ef4444',
  fatal: '#b91c1c',
  debug: '#94a3b8',
  trace: '#cbd5e1',
};

const formatDuration = (ms) => {
  if (ms == null || Number.isNaN(Number(ms))) return '—';
  const value = Number(ms);
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
};

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatBucket = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const ChartTooltip = ({ active, payload, label, labelPrefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-bold text-neutral-700 dark:text-neutral-200">{labelPrefix}{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <strong className="text-neutral-700 dark:text-neutral-200">{formatCount(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
};

const StatTile = ({ label, value, sub, tone = 'neutral' }) => {
  const tones = {
    neutral: 'text-neutral-900 dark:text-neutral-50',
    danger: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
};

const Panel = ({ title, hint, children, className = '' }) => (
  <div className={`rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</h3>
      {hint && <span className="text-[10px] text-neutral-400">{hint}</span>}
    </div>
    <div className="mt-2">{children}</div>
  </div>
);

// A compact horizontal ranking reads faster than a pie for "top N" questions.
const RankedList = ({ rows, labelKey, valueKey, onSelect, renderMeta, color = 'var(--portal-accent)' }) => {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  if (!rows.length) return <p className="py-4 text-center text-xs text-neutral-400">No data in range.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((row, index) => {
        const label = row[labelKey];
        const value = Number(row[valueKey]) || 0;
        return (
          <li key={`${label}-${index}`}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(row) : undefined}
              className={`group w-full text-left ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={`min-w-0 truncate font-semibold text-neutral-700 dark:text-neutral-200 ${onSelect ? 'group-hover:text-[var(--portal-accent)]' : ''}`} title={label}>
                  {label}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-neutral-500">{renderMeta ? renderMeta(row) : formatCount(value)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const SystemLogsDashboard = ({ stats, loading, error, onPivot }) => {
  const totals = stats?.totals;

  const errorRate = useMemo(() => {
    if (!totals?.total) return 0;
    return (totals.errors / totals.total) * 100;
  }, [totals]);

  const failureRate = useMemo(() => {
    if (!totals?.total) return 0;
    return (totals.failedRequests / totals.total) * 100;
  }, [totals]);

  const timeline = useMemo(
    () => (stats?.timeline || []).map((point) => ({
      ...point,
      label: formatBucket(point.bucket),
      healthy: Math.max((point.total || 0) - (point.errors || 0) - (point.warnings || 0), 0),
    })),
    [stats]
  );

  if (error) {
    return (
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Analytics unavailable: {error}
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[74px] animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mb-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <StatTile label="Total events" value={formatCount(totals.total)} sub={`${stats.bucket} buckets`} />
        <StatTile
          label="Error rate"
          value={`${errorRate.toFixed(errorRate < 10 ? 1 : 0)}%`}
          sub={`${formatCount(totals.errors)} errors`}
          tone={errorRate >= 5 ? 'danger' : errorRate > 0 ? 'warning' : 'success'}
        />
        <StatTile
          label="Failed requests"
          value={`${failureRate.toFixed(failureRate < 10 ? 1 : 0)}%`}
          sub={`${formatCount(totals.failedRequests)} with 4xx/5xx`}
          tone={failureRate >= 5 ? 'danger' : failureRate > 0 ? 'warning' : 'success'}
        />
        <StatTile
          label="Avg duration"
          value={formatDuration(totals.avgDuration)}
          sub={`peak ${formatDuration(totals.maxDuration)}`}
          tone={Number(totals.avgDuration) >= 1000 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Slow calls"
          value={formatCount(totals.slowRequests)}
          sub={`of ${formatCount(totals.timedRequests)} timed`}
          tone={totals.slowRequests > 0 ? 'warning' : 'success'}
        />
        <StatTile label="Active users" value={formatCount(totals.uniqueUsers)} sub={`${formatCount(totals.uniqueSessions)} sessions`} />
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Event volume" hint={`per ${stats.bucket}`}>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="volumeHealthy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="currentColor" className="text-neutral-400" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-neutral-400" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="healthy" name="Normal" stackId="1" stroke="#10b981" fill="url(#volumeHealthy)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="warnings" name="Warnings" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={1.5} />
                <Area type="monotone" dataKey="errors" name="Errors" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Status mix" hint="HTTP responses">
          {stats.statusMix?.length ? (
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.statusMix} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="band" tick={{ fontSize: 10 }} stroke="currentColor" className="text-neutral-400" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-neutral-400" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                  <Bar dataKey="count" name="Responses" radius={[4, 4, 0, 0]}>
                    {stats.statusMix.map((entry) => (
                      <Cell key={entry.band} fill={BAND_COLORS[entry.band] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-neutral-400">No HTTP responses in range.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Slowest endpoints" hint="by average">
          <RankedList
            rows={stats.slowest || []}
            labelKey="route"
            valueKey="avgDuration"
            color="#f59e0b"
            onSelect={(row) => onPivot?.('search', row.route)}
            renderMeta={(row) => `${formatDuration(row.avgDuration)} · ${formatCount(row.count)}×`}
          />
        </Panel>

        <Panel title="Top events">
          <RankedList
            rows={stats.topEvents || []}
            labelKey="event"
            valueKey="count"
            onSelect={(row) => onPivot?.('event', row.event)}
          />
        </Panel>

        <Panel title="Busiest modules">
          <RankedList
            rows={stats.topModules || []}
            labelKey="module"
            valueKey="count"
            color="#0ea5e9"
            onSelect={(row) => onPivot?.('module', row.module)}
          />
        </Panel>

        <Panel title="Most active users">
          <RankedList
            rows={stats.topActors || []}
            labelKey="name"
            valueKey="count"
            color="#8b5cf6"
            onSelect={(row) => onPivot?.('search', row.name)}
            renderMeta={(row) => (row.errors > 0 ? `${formatCount(row.count)} · ${row.errors} err` : formatCount(row.count))}
          />
        </Panel>
      </div>

      {stats.byLevel?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Levels</span>
          {stats.byLevel.map((entry) => (
            <button
              key={entry.level}
              type="button"
              onClick={() => onPivot?.('level', entry.level)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: LEVEL_COLORS[entry.level] || '#94a3b8' }} />
              {entry.level}
              <span className="font-mono tabular-nums text-neutral-400">{formatCount(entry.count)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemLogsDashboard;
