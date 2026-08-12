import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const MediaHeadRevenue = () => {
  const { token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.revenue({}),
    queryFn: () => departmentApi.getMediaHeadRevenue(token),
    enabled: Boolean(token),
  });

  const revenue = data?.data || {};
  const budget = revenue.budget || { estimated: 0, actual: 0, remaining: 0, projectCount: 0 };
  const spend = revenue.mediaSpend || { total: 0, avgRoi: null };

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Revenue & Budget" subtitle="Project budgets and campaign spend across the department" icon="payments" showThemeToggle={false} />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
          </div>
        ) : (
          <>
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Project Budget <span className="font-normal normal-case text-neutral-400">— from tracked project budgets</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <KPICard title="Estimated Budget" value={formatCurrency(budget.estimated)} icon="account_balance_wallet" compact />
                <KPICard title="Actual Spend" value={formatCurrency(budget.actual)} icon="payments" compact />
                <KPICard title="Remaining" value={formatCurrency(budget.remaining)} icon="savings" compact />
                <KPICard title="Budgeted Projects" value={budget.projectCount} icon="folder_open" compact />
              </div>
            </section>

            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Campaign Spend <span className="font-normal normal-case text-neutral-400">— from tracked campaign records</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <KPICard title="Total Campaign Spend" value={formatCurrency(spend.total)} icon="ads_click" compact />
                <KPICard title="Average ROI" value={spend.avgRoi === null ? 'N/A' : `${spend.avgRoi}x`} icon="trending_up" compact />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Sales Revenue</h2>
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-neutral-400">info</span>
                <div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Deal value and revenue are not tracked yet</p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Media Sales currently records leads only — there is no deal/opportunity value field in the schema, so pipeline
                    value, won deals, and revenue cannot be shown honestly. This will populate once a Deal/Opportunity data model
                    is added to Media Sales.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default MediaHeadRevenue;
