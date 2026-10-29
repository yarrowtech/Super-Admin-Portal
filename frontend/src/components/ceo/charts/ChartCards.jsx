import React, { memo, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const shell =
  'rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const chartColors = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0ea5e9', '#dc2626', '#db2777', '#0d9488'];

const axisProps = {
  tick: { fontSize: 11 },
  stroke: 'currentColor',
  className: 'text-neutral-400',
  tickLine: false,
  axisLine: false,
};

const titleCase = (value) =>
  String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const Shell = ({ title, hint, children }) => (
  <article className={shell}>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{title}</h3>
      {hint && <span className="text-[10px] text-neutral-400">{hint}</span>}
    </div>
    <div className="mt-2">{children}</div>
  </article>
);

const EmptyState = ({ text = 'No data recorded yet.', height = 220 }) => (
  <div className="flex items-center justify-center text-center" style={{ height }}>
    <p className="px-4 text-xs text-neutral-400">{text}</p>
  </div>
);

const SeriesTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="font-bold text-neutral-700 dark:text-neutral-200">{titleCase(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}:{' '}
          <strong className="text-neutral-700 dark:text-neutral-200">
            {formatter ? formatter(entry.value) : Number(entry.value || 0).toLocaleString()}
          </strong>
        </p>
      ))}
    </div>
  );
};

const SliceTooltip = ({ active, payload, formatter, total }) => {
  if (!active || !payload?.length) return null;
  const slice = payload[0];
  const value = Number(slice.value) || 0;
  const share = total ? (value / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <p className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-200">
        <span className="h-2 w-2 rounded-full" style={{ background: slice.payload.fill }} />
        {titleCase(slice.name)}
      </p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
        <strong className="text-neutral-700 dark:text-neutral-200">{formatter ? formatter(value) : value.toLocaleString()}</strong>
        <span className="ml-1.5">({share.toFixed(share < 10 ? 1 : 0)}%)</span>
      </p>
    </div>
  );
};

const InlineLegend = ({ series }) => {
  if (!series || series.length < 2) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {series.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
};

/**
 * A donut with a legend beside it. The hole carries the total, so the chart
 * answers "how much in all" as well as "how is it split". Slices are sorted and
 * each legend row carries its own value and share, which keeps small categories
 * readable where on-slice labels would collide.
 */
export const PieChartCard = memo(({ title, hint, data = [], nameKey, valueKey, formatter, height = 240 }) => {
  const rows = useMemo(
    () =>
      (data || [])
        .map((row) => ({ name: titleCase(row?.[nameKey] ?? 'Unassigned'), value: Number(row?.[valueKey]) || 0 }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value),
    [data, nameKey, valueKey]
  );

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (!rows.length) {
    return (
      <Shell title={title} hint={hint}>
        <EmptyState height={height} />
      </Shell>
    );
  }

  return (
    <Shell title={title} hint={hint || `${total.toLocaleString()} total`}>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="relative shrink-0" style={{ width: height, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={rows.length > 1 ? 2 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {rows.map((row, index) => (
                  <Cell key={row.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip content={<SliceTooltip formatter={formatter} total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* The hole is wasted space otherwise, and the total belongs with the split. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black tabular-nums text-neutral-900 dark:text-neutral-50">
              {formatter ? formatter(total) : total.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Total</span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-1">
          {rows.map((row, index) => {
            const share = total ? (row.value / total) * 100 : 0;
            return (
              <li key={row.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                <span className="min-w-0 flex-1 truncate font-semibold text-neutral-700 dark:text-neutral-200" title={row.name}>
                  {row.name}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                  {formatter ? formatter(row.value) : row.value.toLocaleString()}
                </span>
                <span className="w-10 shrink-0 text-right font-mono tabular-nums text-neutral-400">
                  {share.toFixed(share < 10 ? 1 : 0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
});

export const BarChartCard = memo(({ title, hint, data = [], xKey, bars = [], formatter, height = 240 }) => {
  const series = useMemo(
    () =>
      bars.map((bar, index) => ({
        ...bar,
        color: bar.color || chartColors[index % chartColors.length],
        label: bar.label || titleCase(bar.key),
      })),
    [bars]
  );

  const hasValues = useMemo(
    () => (data || []).some((row) => series.some((bar) => Number(row?.[bar.key]) > 0)),
    [data, series]
  );

  if (!data.length || !hasValues) {
    return (
      <Shell title={title} hint={hint}>
        <EmptyState height={height} />
      </Shell>
    );
  }

  return (
    <Shell title={title} hint={hint}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={titleCase} interval={0} {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip content={<SeriesTooltip formatter={formatter} />} cursor={{ fill: 'currentColor', opacity: 0.04 }} />
            {series.map((bar) => (
              <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={bar.color} radius={[4, 4, 0, 0]} maxBarSize={64}>
                <LabelList
                  dataKey={bar.key}
                  position="top"
                  className="fill-neutral-500"
                  fontSize={10}
                  formatter={(value) => (formatter ? formatter(value) : value)}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InlineLegend series={series} />
    </Shell>
  );
});

/**
 * A line chart for ordered data. When the x-axis is categorical, or there are too
 * few points to form a trend, it plots the points without connecting them — the
 * values are still charted, but no trajectory is implied between categories.
 * The zero baseline is always drawn so a negative rate reads as negative.
 */
export const LineChartCard = memo(({ title, hint, data = [], xKey, lineKey, formatter, height = 240, categorical = false }) => {
  const points = useMemo(
    () => (data || []).map((row) => ({ ...row, [lineKey]: Number(row?.[lineKey]) || 0 })),
    [data, lineKey]
  );

  if (!points.length) {
    return (
      <Shell title={title} hint={hint}>
        <EmptyState height={height} />
      </Shell>
    );
  }

  const values = points.map((row) => row[lineKey]);
  const hasNegative = values.some((value) => value < 0);
  const connect = !categorical && points.length >= 3;

  // Padding the domain keeps a flat or single-point series off the axis edge,
  // and including 0 stops a negative-only series from looking positive.
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const pad = Math.max((max - min) * 0.15, 1);

  return (
    <Shell title={title} hint={hint || (connect ? undefined : 'values by category')}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 16, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={titleCase} interval={0} minTickGap={8} {...axisProps} />
            <YAxis domain={[Math.floor(min - pad), Math.ceil(max + pad)]} tickFormatter={(value) => (formatter ? formatter(value) : value)} {...axisProps} />
            <Tooltip content={<SeriesTooltip formatter={formatter} />} />
            {hasNegative && <ReferenceLine y={0} stroke="currentColor" className="text-neutral-400" strokeDasharray="4 4" />}
            <Line
              type="monotone"
              dataKey={lineKey}
              name={titleCase(lineKey)}
              stroke="#2563eb"
              strokeWidth={connect ? 2 : 0}
              dot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={lineKey}
                position="top"
                className="fill-neutral-500"
                fontSize={10}
                formatter={(value) => (formatter ? formatter(value) : value)}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Shell>
  );
});

LineChartCard.displayName = 'LineChartCard';
BarChartCard.displayName = 'BarChartCard';
PieChartCard.displayName = 'PieChartCard';
