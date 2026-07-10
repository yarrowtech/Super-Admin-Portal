import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { departmentApi } from '../../services/departments';
import MobilePortalNav from '../common/MobilePortalNav';
import PortalHeader from '../common/PortalHeader';
import SectionSidebar from '../common/SectionSidebar';
import KPICard from '../common/KPICard';

const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

const SALES_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Sales command view' },
];

const WORKFLOW = [
  { key: 'lead', label: 'Lead captured', icon: 'person_add' },
  { key: 'qualified', label: 'Qualified', icon: 'verified' },
  { key: 'proposal', label: 'Proposal', icon: 'send' },
  { key: 'negotiation', label: 'Negotiation', icon: 'handshake' },
  { key: 'closed', label: 'Closed', icon: 'task_alt' },
];

const cardClass = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const getPayload = (response) => response?.data?.data || response?.data || {};
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const arr = (value) => (Array.isArray(value) ? value : []);

const formatMoney = (value) =>
  `INR ${toNumber(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

const stageLabel = (stage) => String(stage?.stage || stage?.name || stage?._id || 'Unclassified').replace(/_/g, ' ');

const toneForStage = (value = '') => {
  const stage = String(value).toLowerCase();
  if (stage.includes('won') || stage.includes('closed')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (stage.includes('lost')) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (stage.includes('proposal') || stage.includes('negotiat')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (stage.includes('qualified')) return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const EmptyPanel = ({ icon, title, text }) => (
  <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
    <span className="material-symbols-outlined mb-2 text-3xl text-neutral-400">{icon}</span>
    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{title}</p>
    <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">{text}</p>
  </div>
);

const SalesWorkflow = ({ pipeline }) => {
  const normalizedStages = useMemo(
    () => new Set(pipeline.map((stage) => stageLabel(stage).toLowerCase())),
    [pipeline]
  );

  return (
    <section className={cardClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--portal-accent)]">Sales Flow</p>
          <h2 className="mt-1 text-base font-black text-neutral-900 dark:text-neutral-100">Lead to revenue pipeline</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {WORKFLOW.map((step) => {
          const active = Array.from(normalizedStages).some((stage) => stage.includes(step.key));
          return (
            <div
              key={step.key}
              className={`rounded-xl border p-3 ${
                active
                  ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[var(--portal-accent-strong)]'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{step.icon}</span>
              <p className="mt-2 text-xs font-bold">{step.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const PipelinePanel = ({ pipeline }) => {
  const max = Math.max(...pipeline.map((stage) => toNumber(stage.value) || toNumber(stage.count)), 1);

  return (
    <section className={cardClass}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">Pipeline by stage</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Live sales records grouped from MongoDB.</p>
        </div>
        <span className="rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--portal-accent)]">
          {pipeline.length} stages
        </span>
      </div>

      {pipeline.length === 0 ? (
        <EmptyPanel icon="account_tree" title="No pipeline records yet" text="Sales records will appear here after they are created in the sales module." />
      ) : (
        <div className="space-y-3">
          {pipeline.map((stage, index) => {
            const label = stageLabel(stage);
            const count = toNumber(stage.count);
            const value = toNumber(stage.value);
            const current = value || count;
            const percent = Math.max(4, Math.round((current / max) * 100));
            return (
              <div key={`${label}-${index}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${toneForStage(label)}`}>
                      {label}
                    </span>
                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{count} records</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-neutral-800 dark:text-neutral-200">{formatMoney(value)}</span>
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
      <p className="text-xs text-neutral-500 dark:text-neutral-400">Latest sales records from the backend.</p>
    </div>
    {leads.length === 0 ? (
      <EmptyPanel icon="person_search" title="No recent leads" text="New sales records will show here as soon as the team starts entering leads." />
    ) : (
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {leads.slice(0, 8).map((lead, index) => {
          const title = lead.name || lead.companyName || lead.clientName || lead.email || `Lead ${index + 1}`;
          const meta = [lead.email, lead.phone, lead.source].filter(Boolean).join(' | ');
          const status = lead.stage || lead.status || 'New';
          return (
            <div key={lead._id || lead.id || index} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{meta || 'No contact details'}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize ${toneForStage(status)}`}>
                {String(status).replace(/_/g, ' ')}
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
  const { collapsed } = useSidebar();
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

  const pipeline = useMemo(() => arr(data.pipelineByStage), [data.pipelineByStage]);
  const recentLeads = useMemo(() => arr(data.recentLeads), [data.recentLeads]);
  const totalLeads = toNumber(data.totalLeads) || pipeline.reduce((sum, stage) => sum + toNumber(stage.count), 0);
  const pipelineValue = toNumber(data.totalPipelineValue) || pipeline.reduce((sum, stage) => sum + toNumber(stage.value), 0);
  const wonDeals = toNumber(data.wonDeals) || pipeline.reduce((sum, stage) => {
    const label = stageLabel(stage).toLowerCase();
    return label.includes('won') || label.includes('closed') ? sum + toNumber(stage.count) : sum;
  }, 0);
  const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  const mobileItems = SALES_NAV.map((item) => ({
    key: item.id,
    label: item.label,
    icon: item.icon,
    active: item.id === 'dashboard',
  }));

  return (
    <div
      className="portal-shell relative min-h-screen w-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f4_45%,#f6f8fb_100%)] text-neutral-900 dark:bg-background-dark dark:text-neutral-100"
      style={MEDIA_THEME}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(212,138,22,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_26%)]" />
      <MobilePortalNav
        title="Media Portal"
        subtitle="Sales operations"
        icon="point_of_sale"
        items={mobileItems}
      />
      <SectionSidebar
        title="Media Portal"
        subtitle="Sales operations"
        icon="point_of_sale"
        items={SALES_NAV}
        activeId="dashboard"
      />

      <main
        className={`relative min-h-screen transition-[margin] duration-300 ease-out-expo ${
          collapsed ? 'md:ml-16' : 'md:ml-[250px]'
        } pt-16 md:pt-0`}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
          <PortalHeader
            title="Sales Dashboard"
            subtitle="Media sales pipeline, leads, conversion, and revenue visibility"
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
            <KPICard title="Pipeline Value" value={loading ? '...' : formatMoney(pipelineValue)} icon="payments" subtitle="Sales" compact />
            <KPICard title="Won Deals" value={loading ? '...' : wonDeals} icon="task_alt" subtitle="Closed" compact />
            <KPICard title="Conversion" value={loading ? '...' : `${conversionRate}%`} icon="percent" subtitle="Rate" compact />
          </div>

          <div className="mt-4">
            <SalesWorkflow pipeline={pipeline} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <PipelinePanel pipeline={pipeline} />
            <RecentLeadsPanel leads={recentLeads} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MediaSalesPortal;
