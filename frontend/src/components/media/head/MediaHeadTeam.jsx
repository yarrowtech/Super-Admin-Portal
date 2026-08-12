import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';

const arr = (value) => (Array.isArray(value) ? value : []);

const HEALTH_TONE = {
  COMPLETED: { tone: 'success', label: 'Completed' },
  BLOCKED: { tone: 'danger', label: 'Blocked' },
  AT_RISK: { tone: 'danger', label: 'At Risk' },
  ATTENTION: { tone: 'warning', label: 'Attention' },
  ON_TRACK: { tone: 'info', label: 'On Track' },
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const MediaHeadTeam = () => {
  const { token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.team({}),
    queryFn: () => departmentApi.getMediaHeadTeam(token),
    enabled: Boolean(token),
  });

  const members = arr(data?.data?.members);
  const totalMembers = data?.data?.totalMembers ?? members.length;
  const overloadedCount = arr(data?.data?.overloaded).length;
  const avgActive = members.length
    ? Math.round((members.reduce((sum, m) => sum + (m.activeProjects || 0), 0) / members.length) * 10) / 10
    : 0;
  const atRiskAssignments = members.reduce((sum, m) => sum + (m.atRiskProjects || 0), 0);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Team" subtitle="Everyone assigned across department projects, by workload" icon="groups" showThemeToggle={false} />

        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Team Members" value={totalMembers} icon="groups" compact />
          <KPICard title="Overloaded" value={overloadedCount} icon="warning" compact />
          <KPICard title="Avg Active Projects" value={avgActive} icon="trending_up" compact />
          <KPICard title="At-Risk Assignments" value={atRiskAssignments} icon="report" compact />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">group_off</span>
            <p className="font-semibold text-neutral-600 dark:text-neutral-300">No team members found on tracked projects</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => {
              const overloaded = member.activeProjects >= 3 || member.atRiskProjects >= 1;
              return (
                <div key={member.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-sm font-bold text-[var(--portal-accent)]">
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{member.name}</p>
                      <p className="truncate text-xs text-neutral-400">{member.email}</p>
                    </div>
                    {overloaded && <StatusBadge tone="warning" label="Overloaded" />}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.roles.map((role) => (
                      <span key={role} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {role}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                    <span><strong className="text-neutral-800 dark:text-neutral-100">{member.activeProjects}</strong> active</span>
                    <span><strong className="text-neutral-800 dark:text-neutral-100">{member.totalProjects}</strong> total</span>
                    {member.atRiskProjects > 0 && <span className="text-rose-500"><strong>{member.atRiskProjects}</strong> at risk</span>}
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    {member.projects.slice(0, 4).map((project) => {
                      const health = HEALTH_TONE[project.health] || HEALTH_TONE.ON_TRACK;
                      return (
                        <div key={project.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-neutral-600 dark:text-neutral-400">{project.name}</span>
                          <StatusBadge tone={health.tone} label={health.label} />
                        </div>
                      );
                    })}
                    {member.projects.length > 4 && (
                      <p className="text-[11px] text-neutral-400">+{member.projects.length - 4} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default MediaHeadTeam;
