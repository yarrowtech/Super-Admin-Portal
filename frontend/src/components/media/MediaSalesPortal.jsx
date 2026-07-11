import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import SalesPortalLayout from './SalesPortalLayout';

const cardClass = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const getPayload = (response) => response?.data?.data || response?.data || {};
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const arr = (value) => (Array.isArray(value) ? value : []);

const groupLabel = (group) => String(group?._id || 'Unspecified').replace(/_/g, ' ');

const EmptyPanel = ({ icon, title, text }) => (
  <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
    <span className="material-symbols-outlined mb-2 text-3xl text-neutral-400">{icon}</span>
    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{title}</p>
    {text && <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">{text}</p>}
  </div>
);

const BreakdownPanel = ({ title, emptyIcon, emptyTitle, groups }) => {
  const max = Math.max(...groups.map((group) => toNumber(group.count)), 1);

  return (
    <section className={cardClass}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">{title}</h2>
        <span className="rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--portal-accent)]">
          {groups.length} groups
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyPanel icon={emptyIcon} title={emptyTitle} />
      ) : (
        <div className="space-y-3">
          {groups.map((group, index) => {
            const label = groupLabel(group);
            const count = toNumber(group.count);
            const percent = Math.max(4, Math.round((count / max) * 100));
            return (
              <div key={`${label}-${index}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-bold capitalize text-neutral-700 dark:text-neutral-300">{label}</span>
                  <span className="shrink-0 text-xs font-bold text-neutral-800 dark:text-neutral-200">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-[var(--portal-accent)]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const RecentLeadsPanel = ({ leads }) => (
  <section className={cardClass}>
    <div className="mb-4">
      <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">Recent leads</h2>
    </div>
    {leads.length === 0 ? (
      <EmptyPanel icon="person_search" title="No recent leads" text="Field questionnaires submitted from Sales Query will appear here." />
    ) : (
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {leads.slice(0, 8).map((lead, index) => {
          const title = lead.businessName || lead.buyerName || lead.email || `Lead ${index + 1}`;
          const meta = [lead.project?.name, lead.location, lead.phone].filter(Boolean).join(' · ');
          const category = lead.buyerCategory || 'Uncategorized';
          return (
            <div key={lead._id || lead.id || index} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{meta || 'No contact details'}</p>
              </div>
              <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold capitalize text-teal-700">
                {category}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const MediaSalesPortal = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!token) return undefined;

    setLoading(true);
    setError('');
    departmentApi
      .getSalesDashboard(token)
      .then((response) => {
        if (alive) setData(getPayload(response));
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Failed to load sales dashboard.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const leadsByCategory = arr(data.leadsByCategory);
  const leadsByProject = arr(data.leadsByProject);
  const recentLeads = arr(data.recentLeads);
  const totalLeads = toNumber(data.totalLeads);
  const newThisWeek = toNumber(data.newThisWeek);
  const projectsCovered = leadsByProject.length;
  const categoriesCovered = leadsByCategory.length;

  return (
    <SalesPortalLayout activeId="dashboard">
      <PortalHeader
        title="Sales Dashboard"
        icon="point_of_sale"
        user={user}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Leads" value={loading ? '...' : totalLeads} icon="groups" subtitle="MongoDB" compact />
        <KPICard title="New This Week" value={loading ? '...' : newThisWeek} icon="trending_up" subtitle="Last 7 days" compact />
        <KPICard title="Projects Covered" value={loading ? '...' : projectsCovered} icon="apartment" subtitle="In-house" compact />
        <KPICard title="Buyer Categories" value={loading ? '...' : categoriesCovered} icon="category" subtitle="Segments" compact />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <BreakdownPanel title="Leads by buyer category" emptyIcon="category" emptyTitle="No leads yet" groups={leadsByCategory} />
        <BreakdownPanel title="Leads by project" emptyIcon="apartment" emptyTitle="No leads yet" groups={leadsByProject} />
      </div>

      <div className="mt-4">
        <RecentLeadsPanel leads={recentLeads} />
      </div>
    </SalesPortalLayout>
  );
};

export default MediaSalesPortal;
