import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';

const arr = (value) => (Array.isArray(value) ? value : []);

const MediaHeadDashboard = ({ onNavigate }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const enabled = Boolean(token);

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.dashboard({}),
    queryFn: () => departmentApi.getMediaHeadDashboard(token, {}),
    enabled,
  });

  const payload = data?.data || {};
  const loading = isLoading;
  const projects = arr(payload.projects?.items);
  const kpis = payload.kpis || {};
  const sales = payload.sales || {};
  const marketing = payload.marketing || {};
  const pendingApprovals = arr(payload.approvals);
  const attentionItems = arr(payload.attention);

  const now = Date.now();
  const overdueProjects = useMemo(
    () => projects.filter((p) => p.deadline && new Date(p.deadline).getTime() < now && p.status !== 'completed' && p.status !== 'cancelled'),
    [projects, now]
  );
  const dueSoonProjects = useMemo(
    () => projects.filter((p) => {
      if (!p.deadline || p.status === 'completed' || p.status === 'cancelled') return false;
      const days = (new Date(p.deadline).getTime() - now) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }),
    [projects, now]
  );

  const activeProjectsCount = kpis.activeProjects ?? projects.filter((p) => p.status === 'in-progress').length;

  const needsAttention = attentionItems.length > 0 ? attentionItems.slice(0, 8).map((item) => ({
    key: item.id,
    priority: item.priority === 'HIGH' ? 'danger' : item.priority === 'MEDIUM' ? 'warning' : 'info',
    label: String(item.type || '').replace(/_/g, ' '),
    title: item.title,
    meta: item.description,
    action: () => {
      if (item.entityType === 'ApprovalWorkflow') onNavigate?.('approvals');
      else if (item.entityType === 'Project') onNavigate?.('projects');
    },
  })) : [
    ...overdueProjects.slice(0, 3).map((p) => ({
      key: `overdue-${p._id}`,
      priority: 'danger',
      label: 'Project overdue',
      title: p.name,
      meta: `Deadline ${new Date(p.deadline).toLocaleDateString()}`,
      action: () => navigate(`/media/dashboard/projects/${p.projectCode || p._id}`),
    })),
    pendingApprovals.length > 0 && {
      key: 'pending-approvals',
      priority: 'warning',
      label: 'Pending approvals',
      title: `${pendingApprovals.length} item${pendingApprovals.length === 1 ? '' : 's'} waiting on a decision`,
      meta: 'Marketing content & assets',
      action: () => onNavigate?.('approvals'),
    },
    dueSoonProjects.length > 0 && {
      key: 'due-soon',
      priority: 'warning',
      label: 'Due this week',
      title: `${dueSoonProjects.length} project${dueSoonProjects.length === 1 ? '' : 's'} deadline within 7 days`,
      meta: 'Project deadlines',
      action: () => onNavigate?.('projects'),
    },
    sales.newThisWeek > 0 && {
      key: 'new-leads',
      priority: 'info',
      label: 'New leads this week',
      title: `${sales.newThisWeek} new lead${sales.newThisWeek === 1 ? '' : 's'}`,
      meta: 'Media Sales',
      action: () => navigate('/media/sales/dashboard'),
    },
  ].filter(Boolean);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader
          title="Media Department Overview"
          subtitle="Monitor performance, projects, sales, marketing, and key actions across the Media Department"
          user={user}
          icon="workspace_premium"
          showThemeToggle
        />

        {/* KPI Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Active Projects" value={activeProjectsCount} icon="folder_open" compact />
          <KPICard title="Pending Approvals" value={pendingApprovals.length || kpis.pendingApprovals || 0} icon="fact_check" compact />
          <KPICard title="Total Leads" value={sales.totalLeads ?? 0} subtitle={sales.newThisWeek ? `+${sales.newThisWeek} this week` : undefined} icon="query_stats" compact />
          <KPICard title="Active Campaigns" value={kpis.activeCampaigns ?? marketing.activeCampaigns ?? 0} icon="ads_click" compact />
        </div>

        {/* Needs Attention */}
        <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Needs Attention</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : needsAttention.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-emerald-400">task_alt</span>
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">All clear</p>
              <p className="text-xs text-neutral-400">Nothing needs your attention right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.map((item) => (
                <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusBadge tone={item.priority} label={item.priority === 'danger' ? 'High' : item.priority === 'warning' ? 'Medium' : 'Info'} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{item.label} · {item.meta}</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={item.action} className="shrink-0">View</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sales Overview */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Sales Overview</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/media/sales/dashboard')} icon={<span className="material-symbols-outlined text-lg">arrow_outward</span>}>
                View Sales
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{sales.totalLeads ?? 0}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Leads</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{sales.newThisWeek ?? 0}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">New This Week</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{arr(sales.leadsByProject).length}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Products</p>
              </div>
            </div>
            {arr(sales.recentLeads).length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {arr(sales.recentLeads).slice(0, 3).map((lead) => (
                  <div key={lead._id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-neutral-600 dark:text-neutral-300">{lead.buyerName || lead.businessName || 'Lead'}</span>
                    <span className="shrink-0 text-neutral-400">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Marketing Overview */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Marketing Overview</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/media/dashboard/projects')} icon={<span className="material-symbols-outlined text-lg">arrow_outward</span>}>
                View Marketing
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{projects.length}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Projects</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{marketing.activeCampaigns ?? 0}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Campaigns</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{kpis.contentProductionStatus?.total ?? 0}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Content Items</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <span className="material-symbols-outlined text-sm">bolt</span>
              {kpis.teamProductivity ?? 0}% of content approved & published
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MediaHeadDashboard;
