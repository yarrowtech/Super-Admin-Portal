import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import { getProjectSlug } from '../../../config/projectNames';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';
import ThemeToggleButton from '../../common/ThemeToggleButton';

// Kept as its own theme constant, matching MediaHeadPortal.jsx. This page
// stays visually decoupled from the Marketing project workspace
// (MediaProjectDetail.jsx), which media_head can also open directly (via the
// "Marketing Plan" button below) since that route already grants full
// visibility + edit rights to media_head, unmodified. The visual language
// (gradient header, numbered sections, icon-chip stats) is deliberately
// matched to MediaProjectDetail.jsx so both pages feel like one product.
const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

const arr = (value) => (Array.isArray(value) ? value : []);

const HEALTH_TONE = {
  COMPLETED: { tone: 'success', label: 'Completed' },
  BLOCKED: { tone: 'danger', label: 'Blocked' },
  AT_RISK: { tone: 'danger', label: 'At Risk' },
  ATTENTION: { tone: 'warning', label: 'Attention' },
  ON_TRACK: { tone: 'info', label: 'On Track' },
};

const STATUS_TONE = { planning: 'neutral', 'in-progress': 'info', 'on-hold': 'warning', completed: 'success', cancelled: 'neutral' };

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');
// Mirrors MediaProjectDetail.jsx's own parseMetric — plan fields are
// free-text strings (e.g. "₹15,000"), so digits are extracted the same way
// here to keep this read-only snapshot numerically consistent with the plan.
const parseMetric = (value) => Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;

const sectionTitle = 'text-[11px] font-black uppercase tracking-[0.14em]';

const SectionHeader = ({ eyebrow, title, subtitle, icon, index }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {index ? (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black"
            style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent-strong)' }}
          >
            {index}
          </span>
        ) : null}
        <p className={sectionTitle} style={{ color: 'var(--portal-accent)' }}>{eyebrow}</p>
      </div>
      {title ? <h3 className="mt-1 text-[15px] font-black tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h3> : null}
      {subtitle ? <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p> : null}
    </div>
    {icon ? (
      <span
        className="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[18px]"
        style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
      >
        {icon}
      </span>
    ) : null}
  </div>
);

const SectionCard = ({ eyebrow, title, subtitle, icon, index, children }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-900">
    {eyebrow && <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} index={index} />}
    {children}
  </div>
);

const StatTile = ({ label, value, icon }) => (
  <div className="flex items-center gap-3">
    {icon ? (
      <span
        className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px]"
        style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
      >
        {icon}
      </span>
    ) : null}
    <div className="min-w-0">
      <p className="truncate text-xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  </div>
);

const EmptyRow = ({ icon, text }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-600">{icon}</span>
    <p className="text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
  </div>
);

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' },
  { key: 'sales', label: 'Sales', icon: 'point_of_sale' },
  { key: 'marketing', label: 'Marketing', icon: 'campaign' },
  { key: 'execution', label: 'Execution', icon: 'checklist' },
  { key: 'budget', label: 'Budget', icon: 'payments' },
  { key: 'team', label: 'Team', icon: 'groups' },
  { key: 'deliverables', label: 'Deliverables', icon: 'inventory_2' },
  { key: 'analytics', label: 'Analytics', icon: 'monitoring' },
  { key: 'activity', label: 'Activity', icon: 'history' },
];

// Local segmented tab bar — the shared <Tabs> component's active state is a
// fixed brand blue (--color-primary), not portal-themed, which is why the
// old tab bar didn't match this page's teal accent. Styled to mirror the
// Marketing Command Center / Weekly Execution switcher in MediaProjectDetail.jsx.
const HeadTabs = ({ activeKey, onChange }) => (
  <div role="tablist" className="flex flex-wrap gap-1.5 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-900">
    {TABS.map((tab) => {
      const active = tab.key === activeKey;
      return (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab.key)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all duration-200 ${
            active ? 'text-white shadow-[0_6px_16px_var(--portal-accent-soft)]' : 'text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
          style={active ? { background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' } : undefined}
        >
          <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
          {tab.label}
        </button>
      );
    })}
  </div>
);

const StatusPill = ({ value, tone }) => {
  const dot = { success: 'bg-emerald-400', danger: 'bg-rose-400', warning: 'bg-amber-400', info: 'bg-white/85', neutral: 'bg-white/85' }[tone] || 'bg-white/85';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-[0_6px_14px_rgba(15,118,110,0.25)]"
      style={{ background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {value}
    </span>
  );
};

const MediaHeadProjectDetail = () => {
  const { projectId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [teamError, setTeamError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.mediaHead.projectDetail(projectId),
    queryFn: () => departmentApi.getMediaHeadProjectDetail(token, projectId),
    enabled: Boolean(token && projectId),
  });

  const { data: marketingUsersData } = useQuery({
    queryKey: QK.mediaHead.marketingUsers(),
    queryFn: () => departmentApi.getMediaMarketingUsers(token),
    enabled: Boolean(token),
  });

  // Read-only snapshot of the same Marketing Plan the "Marketing Plan" button
  // opens — lets media_head see Phase/Status/Budget/Leads/Deliverables at a
  // glance without leaving this page. Purely a GET; never touches the plan
  // or MediaProjectDetail.jsx's editor.
  const { data: planData } = useQuery({
    queryKey: QK.mediaHead.projectPlan(projectId),
    queryFn: () => departmentApi.getMediaMarketingPlan(token, projectId),
    enabled: Boolean(token && projectId),
  });

  const payload = data?.data;
  const project = payload?.project;
  const health = HEALTH_TONE[project?.health] || HEALTH_TONE.ON_TRACK;
  const marketingUsers = arr(marketingUsersData?.data);
  const assignedIds = new Set(arr(payload?.team).map((m) => m.id));
  const availableUsers = marketingUsers.filter((u) => !assignedIds.has(u.id));

  const plan = planData?.data;
  const planMonthlyInvestment = arr(plan?.acquisitionBudget).reduce((sum, r) => sum + parseMetric(r.monthlyInvestment), 0);
  const planLeadsEstimate = arr(plan?.acquisitionBudget).reduce((sum, r) => sum + parseMetric(r.leadsEstimate), 0);
  const planDeliverablesDone = arr(plan?.deliverables).filter((d) => d.done).length;
  const planDeliverablesTotal = arr(plan?.deliverables).length;
  const planSnapshot = plan ? [
    { label: 'Phase', value: plan.overview?.currentPhase || 'Foundation', icon: 'rocket_launch' },
    { label: 'Status', value: plan.overview?.overallStatus || 'On Track', icon: 'verified' },
    { label: 'Budget', value: planMonthlyInvestment ? `INR ${planMonthlyInvestment.toLocaleString('en-IN')}` : 'Not budgeted', icon: 'payments' },
    { label: 'Leads Est.', value: planLeadsEstimate ? planLeadsEstimate.toLocaleString('en-IN') : 'No target', icon: 'groups' },
    { label: 'Deliverables', value: `${planDeliverablesDone}/${planDeliverablesTotal}`, icon: 'task_alt' },
  ] : [];

  const refetchDetail = () => queryClient.invalidateQueries({ queryKey: QK.mediaHead.projectDetail(projectId) });

  const handleAssign = async () => {
    if (!selectedMemberId) return;
    setAssigning(true); setTeamError('');
    try {
      await departmentApi.assignMediaProjectMember(token, projectId, selectedMemberId);
      setSelectedMemberId('');
      await refetchDetail();
    } catch (err) {
      setTeamError(err.message || 'Failed to assign project member');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (employeeId) => {
    setRemovingId(employeeId); setTeamError('');
    try {
      await departmentApi.removeMediaProjectMember(token, projectId, employeeId);
      await refetchDetail();
    } catch (err) {
      setTeamError(err.message || 'Failed to remove project member');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f4_45%,#f6f8fb_100%)] font-display text-neutral-800 dark:bg-background-dark dark:text-neutral-100"
      style={MEDIA_THEME}
    >
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-400 dark:text-neutral-500">
          <button type="button" onClick={() => navigate('/media/head/dashboard')} className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300">
            Media Head Portal
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <button type="button" onClick={() => navigate('/media/head/projects')} className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300">
            Projects
          </button>
          {project ? (
            <>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="truncate font-black" style={{ color: 'var(--portal-accent)' }}>{project.name}</span>
            </>
          ) : null}
        </nav>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ) : isError || !project ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white py-20 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">folder_off</span>
            <p className="font-semibold text-neutral-600 dark:text-neutral-300">Project not found or not accessible</p>
          </div>
        ) : (
          <>
            <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
              <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, var(--portal-accent-strong), var(--portal-accent))' }} />
              <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 md:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/media/head/projects')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-all duration-200 hover:border-teal-300 hover:text-teal-700 hover:shadow-md active:scale-95 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                    title="Back to Projects"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[16px] font-black uppercase text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, var(--portal-accent), var(--portal-accent-strong))' }}
                  >
                    {(project.name || '?').trim().charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-[20px] font-black leading-tight tracking-tight text-slate-950 dark:text-neutral-100">{project.name}</h1>
                      <StatusPill value={String(project.status || 'unknown').replace(/-/g, ' ')} tone={STATUS_TONE[project.status] || 'neutral'} />
                      <StatusBadge tone={health.tone} label={health.label} />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {project.projectCode}{project.client?.name ? ` · ${project.client.name}` : ''}{project.client?.company ? ` (${project.client.company})` : ''}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>Deadline: {formatDate(project.deadline || project.endDate)}</span>
                      <span>Progress: {project.progress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/media/dashboard/projects/${getProjectSlug(project)}`)}
                    title="Open the full marketing plan — the same command center and weekly execution view Media Marketing users work in"
                  >
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    Marketing Plan
                  </Button>
                  <ThemeToggleButton />
                </div>
              </div>
            </header>

            {planSnapshot.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                {planSnapshot.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-900">
                    <StatTile icon={stat.icon} label={stat.label} value={stat.value} />
                  </div>
                ))}
              </div>
            )}

            <HeadTabs activeKey={activeTab} onChange={setActiveTab} />

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SectionCard eyebrow="Project" title="Project Details" icon="info" index="01">
                  <div className="space-y-3 text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400">{project.description || 'No description provided.'}</p>
                    <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <div><p className="text-xs text-neutral-400">Priority</p><p className="font-medium capitalize">{project.priority || '—'}</p></div>
                      <div><p className="text-xs text-neutral-400">Start Date</p><p className="font-medium">{formatDate(project.startDate)}</p></div>
                      <div><p className="text-xs text-neutral-400">End Date</p><p className="font-medium">{formatDate(project.endDate)}</p></div>
                      <div><p className="text-xs text-neutral-400">Deadline</p><p className="font-medium">{formatDate(project.deadline)}</p></div>
                    </div>
                  </div>
                </SectionCard>
                <SectionCard eyebrow="At a glance" title="Snapshot" icon="query_stats" index="02">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <StatTile icon="campaign" label="Campaigns" value={payload.marketing.totalCampaigns} />
                    <StatTile icon="inventory_2" label="Deliverables" value={payload.marketing.totalDeliverables} />
                    <StatTile icon="fact_check" label="Pending Approvals" value={payload.marketing.pendingApprovals} />
                    <StatTile icon="point_of_sale" label="Sales Leads" value={payload.sales.totalLeads} />
                    <StatTile icon="groups" label="Team Size" value={payload.team.length} />
                    <StatTile icon="flag" label="Milestones" value={payload.execution.milestones.length} />
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === 'sales' && (
              <SectionCard eyebrow="Sales" title="Sales Leads" subtitle="Leads submitted against this project's code" icon="point_of_sale" index="01">
                {payload.sales.recentLeads.length === 0 ? (
                  <EmptyRow icon="point_of_sale" text="No sales leads recorded for this project" />
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {payload.sales.recentLeads.map((lead) => (
                      <div key={lead._id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{lead.buyerName || lead.businessName || 'Unknown'}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{lead.email || lead.phone || '—'} · {lead.buyerCategory || 'Uncategorized'}</p>
                        </div>
                        <span className="text-xs text-neutral-400">{formatDate(lead.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === 'marketing' && (
              <SectionCard eyebrow="Marketing" title="Marketing Snapshot" icon="campaign" index="01">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <StatTile icon="ads_click" label="Active Campaigns" value={payload.marketing.totalCampaigns} />
                  <StatTile icon="perm_media" label="Content & Assets" value={payload.marketing.totalDeliverables} />
                  <StatTile icon="fact_check" label="Pending Approvals" value={payload.marketing.pendingApprovals} />
                </div>
              </SectionCard>
            )}

            {activeTab === 'execution' && (
              <SectionCard eyebrow="Execution" title="Milestones" subtitle="From the project plan" icon="checklist" index="01">
                {payload.execution.milestones.length === 0 ? (
                  <EmptyRow icon="checklist" text="No milestones defined for this project" />
                ) : (
                  <div className="space-y-2">
                    {payload.execution.milestones.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.title || 'Untitled milestone'}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Due {formatDate(m.deadline)}</p>
                        </div>
                        <StatusBadge tone={m.status === 'completed' ? 'success' : m.status === 'delayed' ? 'danger' : 'info'} label={m.status || 'pending'} />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === 'budget' && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                <SectionCard><StatTile icon="account_balance_wallet" label="Estimated Budget" value={formatCurrency(payload.budget.estimated)} /></SectionCard>
                <SectionCard><StatTile icon="payments" label="Actual Spend" value={formatCurrency(payload.budget.actual)} /></SectionCard>
                <SectionCard><StatTile icon="savings" label="Remaining" value={formatCurrency(payload.budget.remaining)} /></SectionCard>
                <SectionCard><StatTile icon="ads_click" label="Campaign Spend" value={formatCurrency(payload.budget.campaignSpend)} /></SectionCard>
                <SectionCard><StatTile icon="trending_up" label="Avg ROI" value={payload.budget.avgRoi === null ? 'N/A' : `${payload.budget.avgRoi}x`} /></SectionCard>
              </div>
            )}

            {activeTab === 'team' && (
              <SectionCard eyebrow="Team" title="Team" subtitle="Project manager and assigned team members" icon="groups" index="01">
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="h-9 min-w-50 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-(--portal-accent) dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                  >
                    <option value="">Select a Media Marketing user…</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ''}</option>
                    ))}
                  </select>
                  <Button variant="primary" size="sm" onClick={handleAssign} disabled={!selectedMemberId || assigning}>
                    {assigning ? 'Assigning…' : 'Allocate project'}
                  </Button>
                </div>
                {teamError && <p className="mb-3 text-xs font-semibold text-rose-500">{teamError}</p>}
                {payload.team.length === 0 ? (
                  <EmptyRow icon="group_off" text="No team members assigned to this project" />
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {payload.team.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{member.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent-strong)' }}
                          >
                            {member.role}
                          </span>
                          {member.role !== 'Project Manager' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(member.id)}
                              disabled={removingId === member.id}
                            >
                              {removingId === member.id ? 'Removing…' : 'Remove'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === 'deliverables' && (
              <SectionCard eyebrow="Deliverables" title="Deliverables" subtitle="Assets, content, brand, design, video, and social items" icon="inventory_2" index="01">
                {payload.deliverables.length === 0 ? (
                  <EmptyRow icon="inventory_2" text="No deliverables recorded for this project" />
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {payload.deliverables.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{d.title || 'Untitled'}</p>
                          <p className="text-xs capitalize text-neutral-500 dark:text-neutral-400">{d.section}</p>
                        </div>
                        <StatusBadge tone="neutral" label={d.status || 'unknown'} />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <SectionCard><StatTile icon="perm_media" label="Total Media Items" value={payload.analytics.totalMediaItems} /></SectionCard>
                <SectionCard><StatTile icon="check_circle" label="Approved" value={payload.analytics.approvedCount} /></SectionCard>
                <SectionCard><StatTile icon="hourglass_top" label="Pending" value={payload.analytics.pendingCount} /></SectionCard>
                <SectionCard><StatTile icon="cancel" label="Rejected" value={payload.analytics.rejectedCount} /></SectionCard>
              </div>
            )}

            {activeTab === 'activity' && (
              <SectionCard eyebrow="Activity" title="Activity" subtitle="Recent approval requests and decisions for this project's media" icon="history" index="01">
                {payload.activity.length === 0 ? (
                  <EmptyRow icon="history" text="No activity recorded for this project yet" />
                ) : (
                  <div className="space-y-2">
                    {payload.activity.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3 text-sm dark:border-neutral-800">
                        <p className="text-neutral-700 dark:text-neutral-300">{item.text}</p>
                        <span className="shrink-0 text-xs text-neutral-400">{formatDate(item.time)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MediaHeadProjectDetail;
