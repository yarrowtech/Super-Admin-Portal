import React, { useEffect, useState } from 'react';
import PortalHeader from '../common/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { ceoApi } from '../../services/ceo';
import { useQuery } from '@tanstack/react-query';
import { PieChartCard, BarChartCard } from './charts/ChartCards';

const fallbackAlerts = [
  { id: 1, title: 'Revenue threshold crossed', description: 'Monthly revenue crossed planned milestone.', severity: 'medium', time: '2h ago' },
  { id: 2, title: 'System incident resolved', description: 'Core API incident resolved by platform team.', severity: 'low', time: '4h ago' },
];

const CEONotifications = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState(fallbackAlerts);
  const analyticsQ = useQuery({
    queryKey: ['ceo-notification-analytics', token],
    queryFn: async () => (await ceoApi.getNotificationAnalytics(token))?.data || {},
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    (async () => {
      try {
        const res = await ceoApi.getDashboard(token);
        const incoming = res?.data?.alerts || [];
        if (mounted && incoming.length) setAlerts(incoming);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader title="Notifications" subtitle="Executive alerts and system notifications" icon="notifications" showSearch={false} showNotifications showThemeToggle />
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BarChartCard title="Alerts Summary" data={analyticsQ.data?.summary || []} xKey="label" bars={[{ key: 'value', color: '#ea580c' }]} />
          <PieChartCard title="Notification Type Distribution" data={analyticsQ.data?.distribution || []} nameKey="type" valueKey="value" />
        </div>
        <section className="space-y-3">
          {alerts.map((a) => (
            <article key={a.id || a.title} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{a.title}</h3>
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{a.description}</p>
                </div>
                <span className="text-xs font-semibold text-neutral-400">{a.time || 'now'}</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default CEONotifications;
