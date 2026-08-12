import React, { useMemo, useState } from 'react';
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

const STATUS_TONE = { planning: 'neutral', 'in-progress': 'info', 'on-hold': 'warning', completed: 'success', cancelled: 'neutral' };

// Health is derived from real status + deadline data only — no invented score.
const computeHealth = (project) => {
  if (project.status === 'completed') return { tone: 'success', label: 'Completed' };
  if (project.status === 'cancelled') return { tone: 'neutral', label: 'Cancelled' };
  if (project.status === 'on-hold') return { tone: 'warning', label: 'On Hold' };
  if (project.deadline) {
    const days = (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days < 0) return { tone: 'danger', label: 'At Risk' };
    if (days <= 7) return { tone: 'warning', label: 'Attention' };
  }
  return { tone: 'info', label: 'On Track' };
};

// mapProjectForHead (backend) returns marketingOwner/salesOwner as distinct
// fields — not the raw Project.projectManager — so both are read directly.
const marketingOwnerName = (project) => {
  const owner = project.marketingOwner;
  if (owner?.name) return owner.name;
  const pm = project.projectManager;
  if (pm && typeof pm === 'object' && (pm.firstName || pm.lastName)) {
    return [pm.firstName, pm.lastName].filter(Boolean).join(' ');
  }
  return '—';
};

const salesOwnerName = (project) => {
  const owner = project.salesOwner;
  return owner?.ownerName || owner?.name || '—';
};

const MediaHeadProjectOverview = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.projects({ limit: 100, status: statusFilter }),
    queryFn: () => departmentApi.getMediaHeadProjects(token, { limit: 100, ...(statusFilter ? { status: statusFilter } : {}) }),
    enabled: Boolean(token),
  });

  const projects = arr(data?.data?.items);

  const filtered = projects;

  const counts = useMemo(() => ({
    total: projects.length,
    planning: projects.filter((p) => p.status === 'planning').length,
    active: projects.filter((p) => p.status === 'in-progress').length,
    atRisk: projects.filter((p) => p.health === 'AT_RISK' || computeHealth(p).label === 'At Risk').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }), [projects]);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Project Overview" subtitle="Department-wide project health, ownership, and deadlines" icon="folder_open" showThemeToggle={false} />

        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <button type="button" onClick={() => setStatusFilter('')} className="text-left">
            <KPICard title="Total" value={counts.total} icon="folder_open" compact className={!statusFilter ? 'ring-2 ring-primary' : ''} />
          </button>
          <button type="button" onClick={() => setStatusFilter('in-progress')} className="text-left">
            <KPICard title="Active" value={counts.active} icon="play_circle" compact className={statusFilter === 'in-progress' ? 'ring-2 ring-primary' : ''} />
          </button>
          <button type="button" onClick={() => setStatusFilter('planning')} className="text-left">
            <KPICard title="Planning" value={counts.planning} icon="draft" compact className={statusFilter === 'planning' ? 'ring-2 ring-primary' : ''} />
          </button>
          <KPICard title="At Risk" value={counts.atRisk} icon="warning" compact />
          <button type="button" onClick={() => setStatusFilter('completed')} className="text-left">
            <KPICard title="Completed" value={counts.completed} icon="check_circle" compact className={statusFilter === 'completed' ? 'ring-2 ring-primary' : ''} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">folder_off</span>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No projects match this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Sales Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Marketing Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Progress</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Health</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Deadline</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filtered.map((project) => {
                    const health = project.health ? {
                      COMPLETED: { tone: 'success', label: 'Completed' },
                      BLOCKED: { tone: 'danger', label: 'Blocked' },
                      AT_RISK: { tone: 'danger', label: 'At Risk' },
                      ATTENTION: { tone: 'warning', label: 'Attention' },
                      ON_TRACK: { tone: 'info', label: 'On Track' },
                    }[project.health] || computeHealth(project) : computeHealth(project);
                    const progress = Number.isFinite(project.progress) ? project.progress : 0;
                    return (
                      <tr key={project._id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{project.name}</p>
                          <p className="text-xs text-neutral-400">{project.projectCode}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{project.client?.name || project.client?.company || '—'}</td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{salesOwnerName(project)}</td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{marketingOwnerName(project)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={STATUS_TONE[project.status] || 'neutral'} label={String(project.status || 'unknown').replace(/-/g, ' ')} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-neutral-500">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge tone={health.tone} label={health.label} /></td>
                        <td className="px-4 py-3 text-xs text-neutral-500">{project.deadline ? new Date(project.deadline).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/media/head/projects/${project._id}`)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MediaHeadProjectOverview;
