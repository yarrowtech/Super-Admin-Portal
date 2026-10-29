import React, { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const cardClass =
  'min-h-0 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

// One categorical ramp used across every panel so a department keeps its colour.
const SERIES = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0ea5e9', '#db2777'];

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR_COMPACT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Month keys arrive as "2026-03"; axes need something a person can read.
const formatMonth = (key) => {
  if (!key) return '';
  const [year, month] = String(key).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const Panel = ({ title, hint, children, className = '' }) => (
  <article className={`${cardClass} ${className}`}>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</h3>
      {hint && <span className="text-[10px] text-neutral-400">{hint}</span>}
    </div>
    <div className="mt-2">{children}</div>
  </article>
);

// Charts must never imply data exists when it does not: an empty series gets an
// explicit statement rather than blank axes.
const EmptyState = ({ height, message = 'No data recorded for this period.' }) => (
  <div className="flex items-center justify-center text-center" style={{ height }}>
    <p className="px-4 text-xs text-neutral-400">{message}</p>
  </div>
);

const ChartTooltip = ({ active, payload, label, currency = false }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-bold text-neutral-700 dark:text-neutral-200">{formatMonth(label) || label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}:{' '}
          <strong className="text-neutral-700 dark:text-neutral-200">
            {currency ? INR.format(entry.value || 0) : Number(entry.value || 0).toLocaleString()}
          </strong>
        </p>
      ))}
    </div>
  );
};

const axisProps = {
  tick: { fontSize: 10 },
  stroke: 'currentColor',
  className: 'text-neutral-400',
  tickLine: false,
  axisLine: false,
};

const RankedBars = ({ rows, labelKey, valueKey, color, currency = true }) => {
  if (!rows?.length) return <EmptyState height={150} />;
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  return (
    <ul className="space-y-2">
      {rows.slice(0, 6).map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        return (
          <li key={`${row[labelKey]}-${index}`}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-semibold text-neutral-700 dark:text-neutral-200" title={row[labelKey]}>
                {row[labelKey]}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-neutral-500">
                {currency ? INR_COMPACT.format(value) : value.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full"
                style={{ width: `${(value / max) * 100}%`, background: color || SERIES[index % SERIES.length] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const CEOAnalyticsCharts = memo(({ analytics, compact = false }) => {
  const trend = analytics?.revenue?.trend || [];
  const productData = analytics?.productPerformance || [];
  const deptSpend = analytics?.departmentSpend || [];
  const projectStatus = analytics?.projectStatus || [];
  const userGrowth = analytics?.userAnalytics?.monthlyNewUsers || [];

  const mainHeight = compact ? 240 : 320;
  const subHeight = compact ? 170 : 220;

  const cumulative = useMemo(() => {
    let running = 0;
    return trend.map((row) => {
      running += Number(row.profit) || 0;
      return { ...row, cumulativeProfit: running };
    });
  }, [trend]);

  return (
    <section className={`grid grid-cols-1 ${compact ? 'gap-2' : 'gap-4'}`}>
      <Panel title="Revenue, cost and profit" hint={analytics?.months ? `last ${analytics.months} months` : undefined}>
        {trend.length ? (
          <div style={{ height: mainHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cumulative} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="ceoRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={16} {...axisProps} />
                <YAxis tickFormatter={(value) => INR_COMPACT.format(value)} width={62} {...axisProps} />
                <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'currentColor', opacity: 0.04 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} fill="url(#ceoRevenueFill)" />
                <Bar dataKey="expense" name="Cost" fill="#ea580c" fillOpacity={0.75} radius={[3, 3, 0, 0]} barSize={compact ? 10 : 16} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#16a34a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState height={mainHeight} message="No invoices or expenses recorded in this period." />
        )}
      </Panel>

      <div className={`grid grid-cols-1 ${compact ? 'gap-2' : 'gap-4'} xl:grid-cols-2`}>
        <Panel title="Cumulative profit" hint="running total">
          {cumulative.length ? (
            <div style={{ height: subHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="ceoProfitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={16} {...axisProps} />
                  <YAxis tickFormatter={(value) => INR_COMPACT.format(value)} width={62} {...axisProps} />
                  <Tooltip content={<ChartTooltip currency />} />
                  <Area type="monotone" dataKey="cumulativeProfit" name="Cumulative profit" stroke="#16a34a" strokeWidth={2} fill="url(#ceoProfitFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState height={subHeight} />
          )}
        </Panel>

        <Panel title="Collections vs outstanding" hint="invoiced amounts">
          {trend.length ? (
            <div style={{ height: subHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={16} {...axisProps} />
                  <YAxis tickFormatter={(value) => INR_COMPACT.format(value)} width={62} {...axisProps} />
                  <Tooltip content={<ChartTooltip currency />} cursor={{ fill: 'currentColor', opacity: 0.04 }} />
                  <Bar dataKey="collected" name="Collected" stackId="cash" fill="#16a34a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outstanding" name="Outstanding" stackId="cash" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState height={subHeight} />
          )}
        </Panel>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'gap-2' : 'gap-4'} md:grid-cols-2 xl:grid-cols-4`}>
        <Panel title="Revenue by product">
          <RankedBars rows={productData} labelKey="product" valueKey="revenue" />
        </Panel>

        <Panel title="Spend by department">
          <RankedBars rows={deptSpend} labelKey="department" valueKey="spend" color="#ea580c" />
        </Panel>

        <Panel title="Projects by status">
          {projectStatus.length ? (
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStatus} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="status" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'currentColor', opacity: 0.04 }} />
                  <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                    {projectStatus.map((entry, index) => (
                      <Cell key={entry.status} fill={SERIES[index % SERIES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState height={150} />
          )}
        </Panel>

        <Panel title="Headcount growth" hint="new users / month">
          {userGrowth.length ? (
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="ceoUserFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={16} {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="users" name="New users" stroke="#7c3aed" strokeWidth={2} fill="url(#ceoUserFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState height={150} />
          )}
        </Panel>
      </div>
    </section>
  );
});

CEOAnalyticsCharts.displayName = 'CEOAnalyticsCharts';

export default CEOAnalyticsCharts;
