import React from 'react';
import PortalHeader from '../common/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { ceoApi } from '../../services/ceo';
import { useQuery } from '@tanstack/react-query';
import { LineChartCard, PieChartCard, BarChartCard } from './charts/ChartCards';

const CEOProductInsights = () => {
  const { token } = useAuth();
  const q = useQuery({
    queryKey: ['ceo-product-analytics', token],
    queryFn: async () => (await ceoApi.getProductAnalytics(token))?.data || {},
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const products = q.data?.products || [];
  const growthLine = products.map((p) => ({ product: p.product, growth: Number((p.growthRate || 0).toFixed(1)) }));

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader title="Product Insights" subtitle="Product usage and growth comparison" icon="insights" showSearch={false} showNotifications showThemeToggle />
        {q.isLoading ? <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" /> : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <BarChartCard title="Active Users per Product" data={products} xKey="product" bars={[{ key: 'activeUsers', color: '#2563eb' }]} />
            <LineChartCard title="Product Growth Rate" data={growthLine} xKey="product" lineKey="growth" formatter={(v) => `${v}%`} />
            <PieChartCard title="Product Revenue Distribution" data={products} nameKey="product" valueKey="revenue" formatter={(v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)} />
          </div>
        )}
      </div>
    </main>
  );
};

export default CEOProductInsights;
