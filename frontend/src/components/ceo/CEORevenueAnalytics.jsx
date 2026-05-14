import React, { useMemo, useState } from 'react';
import PortalHeader from '../common/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { ceoApi } from '../../services/ceo';
import { useQuery } from '@tanstack/react-query';
import { LineChartCard, PieChartCard, BarChartCard } from './charts/ChartCards';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const CEORevenueAnalytics = () => {
  const { token } = useAuth();
  const [period] = useState('12m');
  const revenueQuery = useQuery({
    queryKey: ['ceo-revenue-analytics', token, period],
    queryFn: async () => (await ceoApi.getRevenueAnalytics(token))?.data || {},
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const trend = revenueQuery.data?.trend || [];
  const byProduct = revenueQuery.data?.byProduct || [];
  const byDepartment = revenueQuery.data?.byDepartment || [];
  const totals = useMemo(() => {
    const revenue = trend.reduce((s, x) => s + Number(x.revenue || 0), 0);
    return { revenue };
  }, [trend]);

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader title="Revenue Analytics" subtitle="Revenue, expense and profit trends" icon="payments" showSearch={false} showNotifications showThemeToggle />
        <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Total Revenue', INR.format(totals.revenue), 'trending_up'],
            ['Products', byProduct.length.toString(), 'pie_chart'],
            ['Departments', byDepartment.length.toString(), 'bar_chart'],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="mt-2 text-xs font-bold uppercase text-neutral-500">{label}</p>
              <p className="mt-1 text-2xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
            </div>
          ))}
        </section>
        {revenueQuery.isLoading ? (
          <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LineChartCard title="Monthly Revenue Trend" data={trend} xKey="month" lineKey="revenue" formatter={(v) => INR.format(v || 0)} />
            <PieChartCard title="Revenue by Product" data={byProduct} nameKey="product" valueKey="revenue" formatter={(v) => INR.format(v || 0)} />
            <BarChartCard title="Revenue by Department" data={byDepartment} xKey="department" bars={[{ key: 'revenue', color: '#16a34a' }]} formatter={(v) => INR.format(v || 0)} />
          </div>
        )}
      </div>
    </main>
  );
};

export default CEORevenueAnalytics;
