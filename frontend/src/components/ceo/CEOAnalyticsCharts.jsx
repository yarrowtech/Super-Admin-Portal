import React, { memo, useMemo } from 'react';
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

const cardClass = 'min-h-0 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const colors = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0ea5e9'];

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const CEOAnalyticsCharts = memo(({ analytics, compact = false }) => {
  const revenueTrend = analytics?.revenue?.trend || [];
  const productData = analytics?.productPerformance || [];
  const deptData = useMemo(() => {
    const d = analytics?.departmentKpis || {};
    return [
      { name: 'Sales', value: d?.sales?.performanceScore || 0 },
      { name: 'HR', value: d?.hr?.efficiency || 0 },
      { name: 'IT', value: d?.it?.uptime || 0 },
      { name: 'Finance', value: d?.finance?.accuracy || 0 },
    ];
  }, [analytics]);
  const userGrowth = analytics?.userAnalytics?.monthlyNewUsers || [];
  const profitVsExpense = revenueTrend.map((r) => ({
    month: r.month,
    profit: r.profit,
    expense: r.expense,
  }));

  return (
    <section className={`grid grid-cols-1 ${compact ? 'gap-2' : 'gap-4'}`}>
      <article className={cardClass}>
        <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Revenue Trend (Main Chart)</h3>
        <div className={compact ? 'h-[16rem] md:h-[18rem] xl:h-[20rem]' : 'h-[26rem]'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => INR.format(v || 0)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className={`grid grid-cols-1 ${compact ? 'gap-2 xl:grid-cols-2' : 'gap-4 xl:grid-cols-2'}`}>
        <article className={cardClass}>
          <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Product Revenue Split</h3>
          <div className={compact ? 'h-[13rem] md:h-[14rem]' : 'h-72'}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={productData} dataKey="revenue" nameKey="product" outerRadius={compact ? 58 : 90} label={!compact}>
                  {productData.map((entry, index) => (
                    <Cell key={entry.product} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => INR.format(v || 0)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={cardClass}>
          <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Profit vs Expense</h3>
          <div className={compact ? 'h-[13rem] md:h-[14rem]' : 'h-72'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitVsExpense}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => INR.format(v || 0)} />
                <Legend />
                <Bar dataKey="profit" fill="#16a34a" />
                <Bar dataKey="expense" fill="#ea580c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'gap-2 xl:grid-cols-2' : 'gap-4 xl:grid-cols-2'}`}>
        <article className={cardClass}>
          <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">User Growth</h3>
          <div className={compact ? 'h-[12rem] md:h-[13rem]' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={cardClass}>
          <h3 className="mb-1 text-[11px] font-bold uppercase text-neutral-500 dark:text-neutral-400">Department KPI</h3>
          <div className={compact ? 'h-[12rem] md:h-[13rem]' : 'h-64'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
});

CEOAnalyticsCharts.displayName = 'CEOAnalyticsCharts';

export default CEOAnalyticsCharts;
