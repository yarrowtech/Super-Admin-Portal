import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import { itApi } from '../../services/it';
import { financeApi } from '../../services/finance';
import { mediaCollabApi } from '../../services/departmentModules';
import PortalChat from '../common/PortalChat';
import PortalHeader from '../common/PortalHeader';
import SectionCard from '../ui/SectionCard';

// Per-department config for the shared Team + Messages pages. Each api hits that department's own
// /team and /chat/* endpoints (backend: utils/mountDepartmentCollab.js), which only ever return or
// accept users of the same department.
const DEPARTMENTS = {
  law: { label: 'Law', api: lawApi, homePath: '/law/dashboard' },
  it: { label: 'IT', api: itApi, homePath: '/it/dashboard' },
  finance: { label: 'Finance', api: financeApi, homePath: '/finance/dashboard' },
  media: { label: 'Media', api: mediaCollabApi, homePath: '/media/dashboard' },
};

const humanize = (value) => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const initials = (name = '') => name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const STATUS_DOT = { Available: 'bg-emerald-500', Away: 'bg-amber-400' };

/**
 * Department Team directory (law | it | finance | media). Fed by that department's /team endpoint,
 * which only returns users holding the department's roles.
 */
export const DepartmentTeamPage = ({ dept = 'law' }) => {
  const cfg = DEPARTMENTS[dept] || DEPARTMENTS.law;
  const { user, token } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [dept, 'team'],
    queryFn: () => cfg.api.getTeam(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const members = data?.data?.members || [];

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader
          title={`${cfg.label} Team`}
          subtitle={`Everyone in the ${cfg.label} department`}
          icon="group"
          user={user}
          onRefresh={refetch}
          refreshing={isFetching}
        />
        <SectionCard title="Team" icon="groups" description={`${members.length} member${members.length === 1 ? '' : 's'}`} error={isError ? error : null} onRetry={refetch}>
          {isLoading ? (
            <p className="animate-pulse text-sm text-neutral-500">Loading team...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-neutral-500">No team members found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">{initials(member.name)}</div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{member.name}</p>
                      <p className="truncate text-sm text-neutral-500">{humanize(member.role)}</p>
                    </div>
                    <span title={member.status} className={`ml-auto h-2.5 w-2.5 rounded-full ${STATUS_DOT[member.status] || 'bg-neutral-300'}`} />
                  </div>
                  <p className="mt-4 truncate text-sm text-neutral-500">{member.email}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
};

/** Department Messages: the shared PortalChat wired to the department-only chat endpoints. */
export const DepartmentMessagesPage = ({ dept = 'law', homePath }) => {
  const cfg = DEPARTMENTS[dept] || DEPARTMENTS.law;
  return (
    <PortalChat
      api={cfg.api}
      homePath={homePath || cfg.homePath}
      headerTitle={`${cfg.label} team messages`}
      storageKeyPrefix={dept}
      unreadEventName={`${dept}-chat-unread-changed`}
    />
  );
};

export const LawTeamPage = () => <DepartmentTeamPage dept="law" />;
export const LawMessagesPage = () => <DepartmentMessagesPage dept="law" />;
