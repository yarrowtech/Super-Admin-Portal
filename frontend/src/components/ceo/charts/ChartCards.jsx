import React, { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const shell = 'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const chartColors = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0ea5e9', '#dc2626'];

const EmptyState = ({ text = 'No data available' }) => (
  <div className="flex h-56 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">{text}</div>
);

export const LineChartCard = memo(({ title, data = [], xKey, lineKey, formatter, height = 280 }) => (
  <article className={shell}>
    <h3 className="mb-3 text-sm font-bold uppercase text-neutral-500 dark:text-neutral-400">{title}</h3>
    {data.length === 0 ? <EmptyState /> : (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={formatter} />
            <Line type="monotone" dataKey={lineKey} stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </article>
));

export const BarChartCard = memo(({ title, data = [], xKey, bars = [], formatter, height = 280 }) => (
  <article className={shell}>
    <h3 className="mb-3 text-sm font-bold uppercase text-neutral-500 dark:text-neutral-400">{title}</h3>
    {data.length === 0 ? <EmptyState /> : (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip formatter={formatter} />
            <Legend />
            {bars.map((bar, idx) => (
              <Bar key={bar.key} dataKey={bar.key} fill={bar.color || chartColors[idx % chartColors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </article>
));

export const PieChartCard = memo(({ title, data = [], nameKey, valueKey, formatter, height = 280 }) => (
  <article className={shell}>
    <h3 className="mb-3 text-sm font-bold uppercase text-neutral-500 dark:text-neutral-400">{title}</h3>
    {data.length === 0 ? <EmptyState /> : (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} outerRadius={88} label>
              {data.map((entry, idx) => (
                <Cell key={`${entry[nameKey]}-${idx}`} fill={chartColors[idx % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatter} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </article>
));

LineChartCard.displayName = 'LineChartCard';
BarChartCard.displayName = 'BarChartCard';
PieChartCard.displayName = 'PieChartCard';
