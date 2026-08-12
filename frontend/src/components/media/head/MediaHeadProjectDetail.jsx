import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import StatusBadge from '../../common/StatusBadge';
import Tabs from '../../common/Tabs';
import Button from '../../common/Button';

// Kept as its own theme constant, matching MediaHeadPortal.jsx — this page is
// reachable only from the Media Head portal and stays fully decoupled from
// the Marketing project workspace (MediaProjectDetail.jsx), which is untouched.
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

const SectionCard = ({ title, subtitle, children }) => (
  <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    {title && (
      <div className="mb-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const Stat = ({ label, value }) => (
  <div>
    <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
    <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
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

const MediaHeadProjectDetail = () => {
  const { projectId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.mediaHead.projectDetail(projectId),
    queryFn: () => departmentApi.getMediaHeadProjectDetail(token, projectId),
    enabled: Boolean(token && projectId),
  });

  const payload = data?.data;
  const project = payload?.project;
  const health = HEALTH_TONE[project?.health] || HEALTH_TONE.ON_TRACK;

  return (
    <div
      className="min-h-screen w-full bg-background-light font-display text-neutral-800 dark:bg-background-dark dark:text-neutral-100"
      style={MEDIA_THEME}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/media/head/projects')} className="mb-4">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Projects
        </Button>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-64 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ) : isError || !project ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white py-20 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">folder_off</span>
            <p className="font-semibold text-neutral-600 dark:text-neutral-300">Project not found or not accessible</p>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black text-neutral-900 dark:text-neutral-100">{project.name}</h1>
                    <StatusBadge tone={STATUS_TONE[project.status] || 'neutral'} label={String(project.status || 'unknown').replace(/-/g, ' ')} />
                    <StatusBadge tone={health.tone} label={health.label} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {project.projectCode}{project.client?.name ? ` · ${project.client.name}` : ''}{project.client?.company ? ` (${project.client.company})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Deadline: {formatDate(project.deadline || project.endDate)}</span>
                  <span>Progress: {project.progress}%</span>
                </div>
              </div>
            </div>

            <Tabs items={TABS} activeKey={activeTab} onChange={setActiveTab} className="mb-5" />

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SectionCard title="Project Details">
                  <div className="space-y-2 text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400">{project.description || 'No description provided.'}</p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div><p className="text-xs text-neutral-400">Priority</p><p className="font-medium capitalize">{project.priority || '—'}</p></div>
                      <div><p className="text-xs text-neutral-400">Start Date</p><p className="font-medium">{formatDate(project.startDate)}</p></div>
                      <div><p className="text-xs text-neutral-400">End Date</p><p className="font-medium">{formatDate(project.endDate)}</p></div>
                      <div><p className="text-xs text-neutral-400">Deadline</p><p className="font-medium">{formatDate(project.deadline)}</p></div>
                    </div>
                  </div>
                </SectionCard>
                <SectionCard title="Snapshot">
                  <div className="grid grid-cols-3 gap-4">
                    <Stat label="Campaigns" value={payload.marketing.totalCampaigns} />
                    <Stat label="Deliverables" value={payload.marketing.totalDeliverables} />
                    <Stat label="Pending Approvals" value={payload.marketing.pendingApprovals} />
                    <Stat label="Sales Leads" value={payload.sales.totalLeads} />
                    <Stat label="Team Size" value={payload.team.length} />
                    <Stat label="Milestones" value={payload.execution.milestones.length} />
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === 'sales' && (
              <SectionCard title="Sales Leads" subtitle="Leads submitted against this project's code">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Stat label="Active Campaigns" value={payload.marketing.totalCampaigns} />
                <Stat label="Content & Assets" value={payload.marketing.totalDeliverables} />
                <Stat label="Pending Approvals" value={payload.marketing.pendingApprovals} />
              </div>
            )}

            {activeTab === 'execution' && (
              <SectionCard title="Milestones" subtitle="From the project plan">
                {payload.execution.milestones.length === 0 ? (
                  <EmptyRow icon="checklist" text="No milestones defined for this project" />
                ) : (
                  <div className="space-y-2">
                    {payload.execution.milestones.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800">
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
                <SectionCard><Stat label="Estimated Budget" value={formatCurrency(payload.budget.estimated)} /></SectionCard>
                <SectionCard><Stat label="Actual Spend" value={formatCurrency(payload.budget.actual)} /></SectionCard>
                <SectionCard><Stat label="Remaining" value={formatCurrency(payload.budget.remaining)} /></SectionCard>
                <SectionCard><Stat label="Campaign Spend" value={formatCurrency(payload.budget.campaignSpend)} /></SectionCard>
                <SectionCard><Stat label="Avg ROI" value={payload.budget.avgRoi === null ? 'N/A' : `${payload.budget.avgRoi}x`} /></SectionCard>
              </div>
            )}

            {activeTab === 'team' && (
              <SectionCard title="Team" subtitle="Project manager and assigned team members">
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
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{member.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {activeTab === 'deliverables' && (
              <SectionCard title="Deliverables" subtitle="Assets, content, brand, design, video, and social items">
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
                <SectionCard><Stat label="Total Media Items" value={payload.analytics.totalMediaItems} /></SectionCard>
                <SectionCard><Stat label="Approved" value={payload.analytics.approvedCount} /></SectionCard>
                <SectionCard><Stat label="Pending" value={payload.analytics.pendingCount} /></SectionCard>
                <SectionCard><Stat label="Rejected" value={payload.analytics.rejectedCount} /></SectionCard>
              </div>
            )}

            {activeTab === 'activity' && (
              <SectionCard title="Activity" subtitle="Recent approval requests and decisions for this project's media">
                {payload.activity.length === 0 ? (
                  <EmptyRow icon="history" text="No activity recorded for this project yet" />
                ) : (
                  <div className="space-y-2">
                    {payload.activity.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3 text-sm dark:border-neutral-800">
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
