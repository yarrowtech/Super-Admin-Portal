import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';

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
  const queryClient = useQueryClient();
  const [selectedProjectByUser, setSelectedProjectByUser] = useState({});
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: QK.mediaHead.team({}),
    queryFn: () => departmentApi.getMediaHeadTeam(token),
    enabled: Boolean(token),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: QK.mediaHead.marketingUsers(),
    queryFn: () => departmentApi.getMediaMarketingUsers(token),
    enabled: Boolean(token),
  });

  const { data: projectsData } = useQuery({
    queryKey: QK.mediaHead.projects({ limit: 200 }),
    queryFn: () => departmentApi.getMediaHeadProjects(token, { limit: 200 }),
    enabled: Boolean(token),
  });

  const members = arr(teamData?.data?.members);
  const marketingUsers = arr(usersData?.data);
  const allProjects = arr(projectsData?.data?.items);
  const loading = teamLoading || usersLoading;

  // Connects every Media Marketing user to the roster, even ones with zero
  // project allocations yet — getTeamOverview only knows about users who
  // already appear on a project's teamMembers/projectManager, so a brand-new
  // Media Marketing account would otherwise never show up here at all.
  const roster = useMemo(() => {
    const memberById = new Map(members.map((m) => [m.id, m]));
    return marketingUsers.map((u) => {
      const match = memberById.get(u.id);
      return match || {
        id: u.id, name: u.name, email: u.email,
        roles: [], totalProjects: 0, activeProjects: 0, atRiskProjects: 0, projects: [],
      };
    });
  }, [members, marketingUsers]);

  const totalMembers = roster.length;
  const overloadedCount = roster.filter((m) => m.activeProjects >= 3 || m.atRiskProjects >= 1).length;
  const avgActive = roster.length
    ? Math.round((roster.reduce((sum, m) => sum + (m.activeProjects || 0), 0) / roster.length) * 10) / 10
    : 0;
  const atRiskAssignments = roster.reduce((sum, m) => sum + (m.atRiskProjects || 0), 0);

  const refetchTeam = () => queryClient.invalidateQueries({ queryKey: QK.mediaHead.team({}) });

  const handleAllocate = async (userId) => {
    const projectId = selectedProjectByUser[userId];
    if (!projectId) return;
    setBusyKey(`${userId}:${projectId}`); setError('');
    try {
      await departmentApi.assignMediaProjectMember(token, projectId, userId);
      setSelectedProjectByUser((s) => ({ ...s, [userId]: '' }));
      await refetchTeam();
    } catch (err) {
      setError(err.message || 'Failed to allocate project');
    } finally {
      setBusyKey('');
    }
  };

  const handleRevoke = async (userId, projectId) => {
    setBusyKey(`${userId}:${projectId}`); setError('');
    try {
      await departmentApi.removeMediaProjectMember(token, projectId, userId);
      await refetchTeam();
    } catch (err) {
      setError(err.message || 'Failed to remove allocation');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Team" subtitle="Media Marketing users and their project allocations" icon="groups" />

        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Team Members" value={totalMembers} icon="groups" compact />
          <KPICard title="Overloaded" value={overloadedCount} icon="warning" compact />
          <KPICard title="Avg Active Projects" value={avgActive} icon="trending_up" compact />
          <KPICard title="At-Risk Assignments" value={atRiskAssignments} icon="report" compact />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
          </div>
        ) : roster.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">group_off</span>
            <p className="font-semibold text-neutral-600 dark:text-neutral-300">No Media Marketing users found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roster.map((member) => {
              const overloaded = member.activeProjects >= 3 || member.atRiskProjects >= 1;
              const assignedIds = new Set(member.projects.map((p) => p.id));
              const availableProjects = allProjects.filter((p) => !assignedIds.has(p._id || p.id));
              const selectedProjectId = selectedProjectByUser[member.id] || '';

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

                  {member.roles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.roles.map((role) => (
                        <span key={role} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                    <span><strong className="text-neutral-800 dark:text-neutral-100">{member.activeProjects}</strong> active</span>
                    <span><strong className="text-neutral-800 dark:text-neutral-100">{member.totalProjects}</strong> total</span>
                    {member.atRiskProjects > 0 && <span className="text-rose-500"><strong>{member.atRiskProjects}</strong> at risk</span>}
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    {member.projects.length === 0 ? (
                      <p className="text-xs text-neutral-400">No projects allocated yet.</p>
                    ) : member.projects.map((project) => {
                      const health = HEALTH_TONE[project.health] || HEALTH_TONE.ON_TRACK;
                      const key = `${member.id}:${project.id}`;
                      return (
                        <div key={project.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-400">{project.name}</span>
                          <StatusBadge tone={health.tone} label={health.label} />
                          {project.role !== 'Project Manager' && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(member.id, project.id)}
                              disabled={busyKey === key}
                              title="Remove allocation"
                              className="shrink-0 rounded-full p-1 text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"
                            >
                              <span className="material-symbols-outlined text-[16px]">{busyKey === key ? 'hourglass_top' : 'close'}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectByUser((s) => ({ ...s, [member.id]: e.target.value }))}
                      className="h-8 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2 text-xs text-neutral-900 outline-none focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    >
                      <option value="">Allocate a project…</option>
                      {availableProjects.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAllocate(member.id)}
                      disabled={!selectedProjectId || busyKey === `${member.id}:${selectedProjectId}`}
                    >
                      {busyKey === `${member.id}:${selectedProjectId}` ? '…' : 'Add'}
                    </Button>
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
