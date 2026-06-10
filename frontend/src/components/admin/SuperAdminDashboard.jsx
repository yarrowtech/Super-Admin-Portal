import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import PortalHeader from '../common/PortalHeader';
import StatsCard from '../common/StatsCard';
import { superAdminApi } from '../../services/superAdmin';

const tabs = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'sessions', label: 'Sessions', icon: 'schedule' },
  { id: 'audit', label: 'Audit', icon: 'fact_check' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'health', label: 'Health', icon: 'monitor_heart' },
];

const panel = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const unwrap = (value) => value?.data ?? value ?? {};
const toArray = (value, keys = ['items', 'rows', 'records', 'results', 'users', 'sessions', 'events', 'checks', 'audit', 'attempts', 'logs']) => {
  const data = unwrap(value);
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of keys) if (Array.isArray(data[key])) return data[key];
  return [];
};
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};
const formatCompactNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num) : value ?? 0;
};
const formatStatus = (value) => String(value || 'unknown').replaceAll('_', ' ');
const statusTone = {
  healthy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  operational: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  up: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  down: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  blocked: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};
const ToneBadge = ({ value }) => {
  const normalized = String(value || 'unknown').toLowerCase();
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[normalized] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>{formatStatus(value)}</span>;
};
const initialUserDraft = { firstName: '', lastName: '', email: '', role: '', department: '', accountStatus: 'active', phone: '', permissions: '' };
const buildUserDraft = (user) => ({
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  email: user?.email || '',
  role: user?.role || '',
  department: user?.department || '',
  accountStatus: user?.accountStatus || (user?.isActive === false ? 'inactive' : 'active'),
  phone: user?.phone || '',
  permissions: Array.isArray(user?.permissions) ? user.permissions.join(', ') : '',
});
const normalizeUserList = (payload, pageFallback = 1) => {
  const data = unwrap(payload);
  const users = toArray(data, ['users', 'items', 'rows', 'records', 'results']);
  return { users, page: Number(data?.page || data?.currentPage || pageFallback || 1), totalPages: Number(data?.totalPages || data?.pages || 1), total: Number(data?.total || data?.count || users.length) };
};
const normalizeEntity = (payload) => {
  const data = unwrap(payload);
  return data && typeof data === 'object' ? data : {};
};

export default function SuperAdminDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [overview, setOverview] = useState({});
  const [metrics, setMetrics] = useState({});
  const [activeSessionCount, setActiveSessionCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userDraft, setUserDraft] = useState(initialUserDraft);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [userSessions, setUserSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionUserId, setSessionUserId] = useState('');
  const [sessionBusy, setSessionBusy] = useState('');
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [replayAttempts, setReplayAttempts] = useState([]);
  const [failedLogins, setFailedLogins] = useState([]);
  const [activeSecuritySessions, setActiveSecuritySessions] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [health, setHealth] = useState({});
  const [databaseHealth, setDatabaseHealth] = useState({});
  const [ssoHealth, setSsoHealth] = useState({});
  const [permissionsHealth, setPermissionsHealth] = useState({});
  const [sessionsHealth, setSessionsHealth] = useState({});
  const [healthLoading, setHealthLoading] = useState(false);
  const selectedUserKey = selectedUserId || selectedUser?._id || selectedUser?.id || '';

  const loadOverview = useCallback(async () => {
    if (!token) return;
    try {
      const [overviewRes, metricsRes, countRes] = await Promise.allSettled([
        superAdminApi.getOverview(token),
        superAdminApi.getMetrics(token),
        superAdminApi.getActiveSessionCount(token),
      ]);
      if (overviewRes.status === 'fulfilled') setOverview(normalizeEntity(overviewRes.value));
      if (metricsRes.status === 'fulfilled') setMetrics(normalizeEntity(metricsRes.value));
      if (countRes.status === 'fulfilled') {
        const payload = normalizeEntity(countRes.value);
        setActiveSessionCount(Number(payload.count ?? payload.activeCount ?? payload.value ?? 0));
      }
    } catch (err) {
      setError(err.message || 'Failed to load overview');
    }
  }, [token]);

  const loadUsers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    try {
      setUsersLoading(true);
      const payload = normalizeUserList(await superAdminApi.getUsers(token, { page, limit: 10, search: search || undefined }), page);
      setUsers(payload.users);
      setUsersPage(payload.page);
      setUsersTotalPages(payload.totalPages || 1);
      setUsersTotal(payload.total || 0);
      if (!selectedUserKey && payload.users[0]) {
        const first = payload.users[0];
        setSelectedUser(first);
        setSelectedUserId(first._id || first.id || '');
        setUserDraft(buildUserDraft(first));
      }
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [token, selectedUserKey]);

  const loadUserDetail = useCallback(async (userId) => {
    if (!token || !userId) return;
    try {
      setDetailLoading(true);
      const payload = normalizeEntity(await superAdminApi.getUser(token, userId));
      setUserDetail(payload);
      setUserDraft(buildUserDraft(payload));
      setSelectedUser(payload);
    } catch (err) {
      setError(err.message || 'Failed to load user detail');
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  const loadUserSessions = useCallback(async (userId) => {
    if (!token || !userId) return;
    try {
      setSessionsLoading(true);
      const payload = normalizeEntity(await superAdminApi.getUserSessions(token, userId));
      setUserSessions(toArray(payload, ['sessions', 'items', 'results', 'records']));
    } catch (err) {
      setError(err.message || 'Failed to load user sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [token]);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      setSessionsLoading(true);
      const [sessionsRes, countRes] = await Promise.allSettled([superAdminApi.getSessions(token, { limit: 50 }), superAdminApi.getActiveSessionCount(token)]);
      if (sessionsRes.status === 'fulfilled') setSessions(toArray(sessionsRes.value, ['sessions', 'items', 'results', 'records']));
      if (countRes.status === 'fulfilled') {
        const payload = normalizeEntity(countRes.value);
        setActiveSessionCount(Number(payload.count ?? payload.activeCount ?? payload.value ?? 0));
      }
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [token]);

  const loadAudit = useCallback(async () => {
    if (!token) return;
    try {
      setAuditLoading(true);
      const payload = normalizeEntity(await superAdminApi.getAudit(token, { limit: 50 }));
      setAudit(toArray(payload, ['audit', 'items', 'records', 'results', 'logs']));
    } catch (err) {
      setError(err.message || 'Failed to load audit');
    } finally {
      setAuditLoading(false);
    }
  }, [token]);

  const loadSecurity = useCallback(async () => {
    if (!token) return;
    try {
      setSecurityLoading(true);
      const [eventsRes, replayRes, failedRes, activeRes] = await Promise.allSettled([
        superAdminApi.getSecurityEvents(token, { limit: 50 }),
        superAdminApi.getReplayAttempts(token, { limit: 50 }),
        superAdminApi.getFailedLogins(token, { limit: 50 }),
        superAdminApi.getActiveSessions(token, { limit: 50 }),
      ]);
      if (eventsRes.status === 'fulfilled') setSecurityEvents(toArray(eventsRes.value, ['events', 'items', 'records', 'results', 'logs']));
      if (replayRes.status === 'fulfilled') setReplayAttempts(toArray(replayRes.value, ['attempts', 'items', 'records', 'results', 'logs']));
      if (failedRes.status === 'fulfilled') setFailedLogins(toArray(failedRes.value, ['failedLogins', 'items', 'records', 'results', 'logs']));
      if (activeRes.status === 'fulfilled') setActiveSecuritySessions(toArray(activeRes.value, ['sessions', 'items', 'records', 'results', 'logs']));
    } catch (err) {
      setError(err.message || 'Failed to load security telemetry');
    } finally {
      setSecurityLoading(false);
    }
  }, [token]);

  const loadHealth = useCallback(async () => {
    if (!token) return;
    try {
      setHealthLoading(true);
      const [healthRes, dbRes, ssoRes, permissionsRes, sessionsRes] = await Promise.allSettled([
        superAdminApi.getHealth(token),
        superAdminApi.getDatabaseHealth(token),
        superAdminApi.getSsoHealth(token),
        superAdminApi.getPermissionsHealth(token),
        superAdminApi.getSessionsHealth(token),
      ]);
      if (healthRes.status === 'fulfilled') setHealth(normalizeEntity(healthRes.value));
      if (dbRes.status === 'fulfilled') setDatabaseHealth(normalizeEntity(dbRes.value));
      if (ssoRes.status === 'fulfilled') setSsoHealth(normalizeEntity(ssoRes.value));
      if (permissionsRes.status === 'fulfilled') setPermissionsHealth(normalizeEntity(permissionsRes.value));
      if (sessionsRes.status === 'fulfilled') setSessionsHealth(normalizeEntity(sessionsRes.value));
    } catch (err) {
      setError(err.message || 'Failed to load health checks');
    } finally {
      setHealthLoading(false);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    setError('');
    setNotice('');
    await Promise.allSettled([loadOverview(), loadUsers(1, usersSearch), loadSessions(), loadAudit(), loadSecurity(), loadHealth()]);
  }, [loadAudit, loadHealth, loadOverview, loadSecurity, loadSessions, loadUsers, usersSearch]);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  const refreshUserList = async (page = usersPage, search = usersSearch) => loadUsers(page, search);
  const selectUser = async (userRow) => {
    const userId = userRow?._id || userRow?.id || '';
    if (!userId) return;
    setSelectedUserId(userId);
    setSelectedUser(userRow);
    setSessionUserId(userId);
    await Promise.allSettled([loadUserDetail(userId), loadUserSessions(userId)]);
  };
  const saveUser = async () => {
    if (!token || !selectedUserKey) return;
    try {
      setSavingUser(true);
      setError('');
      const payload = {
        firstName: userDraft.firstName.trim(),
        lastName: userDraft.lastName.trim(),
        email: userDraft.email.trim(),
        role: userDraft.role.trim(),
        department: userDraft.department.trim(),
        phone: userDraft.phone.trim(),
        accountStatus: userDraft.accountStatus,
        isActive: userDraft.accountStatus === 'active',
        permissions: userDraft.permissions ? userDraft.permissions.split(',').map((item) => item.trim()).filter(Boolean) : [],
      };
      const response = await superAdminApi.updateUser(token, selectedUserKey, payload);
      const updated = normalizeEntity(response);
      setNotice('User profile updated.');
      setUserDetail(updated);
      setSelectedUser(updated);
      setUserDraft(buildUserDraft(updated));
      await refreshUserList(usersPage, usersSearch);
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };
  const syncUser = async () => {
    if (!token || !selectedUserKey) return;
    try {
      setNotice('');
      setSessionBusy('sync');
      await superAdminApi.syncUser(token, selectedUserKey);
      setNotice('User sync started.');
      await Promise.allSettled([loadUserDetail(selectedUserKey), refreshUserList(usersPage, usersSearch)]);
    } catch (err) {
      setError(err.message || 'Failed to sync user');
    } finally {
      setSessionBusy('');
    }
  };
  const revokeSession = async (sessionRow) => {
    if (!token) return;
    const sessionId = sessionRow?.sessionId || sessionRow?._id || sessionRow?.id;
    if (!sessionId) return;
    try {
      setSessionBusy(sessionId);
      await superAdminApi.revokeSession(token, { sessionId, userId: sessionRow?.userId || sessionUserId || selectedUserKey || undefined });
      setNotice('Session revoked.');
      await Promise.allSettled([loadSessions(), sessionUserId ? loadUserSessions(sessionUserId) : Promise.resolve()]);
    } catch (err) {
      setError(err.message || 'Failed to revoke session');
    } finally {
      setSessionBusy('');
    }
  };
  const revokeAll = async () => {
    if (!token) return;
    const userId = sessionUserId || selectedUserKey;
    if (!userId) {
      setError('Pick a user ID before revoking all sessions.');
      return;
    }
    try {
      setSessionBusy('all');
      await superAdminApi.revokeAllSessions(token, { userId });
      setNotice('All sessions revoked for the selected user.');
      await Promise.allSettled([loadSessions(), loadUserSessions(userId)]);
    } catch (err) {
      setError(err.message || 'Failed to revoke sessions');
    } finally {
      setSessionBusy('');
    }
  };

  const overviewStats = useMemo(() => {
    const metricsObject = normalizeEntity(metrics);
    const overviewObject = normalizeEntity(overview);
    return [
      { label: 'Users', value: metricsObject.totalUsers ?? overviewObject.users?.total ?? overviewObject.totalUsers ?? usersTotal, icon: 'group', colorScheme: 'blue' },
      { label: 'Active', value: metricsObject.activeUsers ?? overviewObject.users?.active ?? overviewObject.activeUsers ?? 0, icon: 'verified', colorScheme: 'green' },
      { label: 'Sessions', value: metricsObject.activeSessions ?? overviewObject.sessions?.active ?? activeSessionCount, icon: 'schedule', colorScheme: 'purple' },
      { label: 'Audit', value: metricsObject.auditEvents ?? overviewObject.audit?.total ?? audit.length, icon: 'fact_check', colorScheme: 'orange' },
      { label: 'Health', value: metricsObject.systemHealth ?? overviewObject.health?.status ?? health?.status ?? 'ok', icon: 'monitor_heart', colorScheme: 'indigo' },
    ];
  }, [activeSessionCount, audit.length, health, metrics, overview, usersTotal]);

  const healthRows = useMemo(() => [
    { label: 'Portal', value: health?.status || health?.overall || 'unknown', detail: health?.message || health?.summary || '' },
    { label: 'Database', value: databaseHealth?.status || databaseHealth?.state || 'unknown', detail: databaseHealth?.message || databaseHealth?.details || '' },
    { label: 'SSO', value: ssoHealth?.status || ssoHealth?.state || 'unknown', detail: ssoHealth?.message || ssoHealth?.details || '' },
    { label: 'Permissions', value: permissionsHealth?.status || permissionsHealth?.state || 'unknown', detail: permissionsHealth?.message || permissionsHealth?.details || '' },
    { label: 'Sessions', value: sessionsHealth?.status || sessionsHealth?.state || 'unknown', detail: sessionsHealth?.message || sessionsHealth?.details || '' },
  ], [databaseHealth, health, permissionsHealth, sessionsHealth, ssoHealth]);

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100 p-4 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900 md:p-5">
      <div className="mx-auto w-full max-w-[1680px]">
        <PortalHeader
          title="Super Admin"
          subtitle="Portal oversight, user operations, session control, and security telemetry."
          user={user}
          icon="admin_panel_settings"
          showSearch={false}
          showNotifications={false}
          showThemeToggle={false}
        >
          <StatsCard label="Active Sessions" value={activeSessionCount} icon="schedule" colorScheme="green" />
          <StatsCard label="Users" value={usersTotal} icon="group" colorScheme="blue" />
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAll}
            loading={usersLoading || sessionsLoading || auditLoading || securityLoading || healthLoading}
            icon={<span className="material-symbols-outlined text-lg">refresh</span>}
          >
            Refresh
          </Button>
        </PortalHeader>

        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-200">{error}</div> : null}
        {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">{notice}</div> : null}

        <section className={`${panel} mb-4 p-3 md:p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {overviewStats.map((stat) => (
            <StatsCard key={stat.label} {...stat} size="lg" className="justify-between" />
          ))}
        </section>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${panel} p-4`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Snapshot</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">High-level portal state and recent activity.</p>
                </div>
                <ToneBadge value={health?.status || health?.overall || 'unknown'} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Latest update</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatDateTime(overview?.updatedAt || overview?.timestamp || metrics?.updatedAt)}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Role</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user?.role || 'admin'}</p>
                </div>
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Portal</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Super Admin</p>
                </div>
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">Audit events</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{audit.length}</p>
                </div>
              </div>
            </section>

            <section className={`${panel} p-4`}>
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Health</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Service and subsystem status.</p>
              </div>
              <div className="space-y-2">
                {healthRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2 dark:border-neutral-800">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{row.label}</p>
                      {row.detail ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.detail}</p> : null}
                    </div>
                    <ToneBadge value={row.value} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'users' ? (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <section className={`${panel} p-4`}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Users</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Search, inspect, update, and sync user records.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)} placeholder="Search name or email" className="h-11 min-w-[16rem] rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950" />
                  <Button variant="secondary" size="sm" onClick={() => refreshUserList(1, usersSearch)} loading={usersLoading} icon={<span className="material-symbols-outlined text-lg">search</span>}>Search</Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-950"><tr className="text-left text-xs uppercase tracking-wide text-neutral-500"><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th></tr></thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {usersLoading ? <tr><td className="px-4 py-6 text-neutral-500" colSpan={4}>Loading users...</td></tr> : null}
                    {!usersLoading && users.length === 0 ? <tr><td className="px-4 py-6 text-neutral-500" colSpan={4}>No users found.</td></tr> : null}
                    {users.map((item) => {
                      const id = item._id || item.id;
                      const active = id === selectedUserKey;
                      return (
                        <tr key={id} className={`cursor-pointer transition hover:bg-neutral-50 dark:hover:bg-neutral-950 ${active ? 'bg-primary/5 dark:bg-primary/10' : ''}`} onClick={() => selectUser(item)}>
                          <td className="px-4 py-3"><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.firstName} {item.lastName}</p><p className="text-xs text-neutral-500">{item.email}</p></td>
                          <td className="px-4 py-3">{item.role || '-'}</td>
                          <td className="px-4 py-3"><ToneBadge value={item.accountStatus || (item.isActive === false ? 'inactive' : 'active')} /></td>
                          <td className="px-4 py-3 text-neutral-500">{formatDateTime(item.updatedAt || item.lastUpdated || item.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-neutral-500">{formatCompactNumber(usersTotal)} total users</p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" disabled={usersPage <= 1} onClick={() => refreshUserList(usersPage - 1, usersSearch)}>Prev</Button>
                  <span className="text-sm text-neutral-500">Page {usersPage} of {usersTotalPages || 1}</span>
                  <Button variant="secondary" size="sm" disabled={usersPage >= usersTotalPages} onClick={() => refreshUserList(usersPage + 1, usersSearch)}>Next</Button>
                </div>
              </div>
            </section>

            <section className={`${panel} p-4`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">User detail</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Edit the selected user and trigger a sync.</p>
                </div>
                {detailLoading ? <span className="text-xs text-neutral-500">Loading...</span> : null}
              </div>
              {selectedUserKey ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Selected user</p>
                    <p className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">{userDetail?.firstName || selectedUser?.firstName || ''} {userDetail?.lastName || selectedUser?.lastName || ''}</p>
                    <p className="text-sm text-neutral-500">{userDetail?.email || selectedUser?.email || selectedUserKey}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm"><span className="text-xs uppercase tracking-wide text-neutral-500">First name</span><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.firstName} onChange={(e) => setUserDraft((prev) => ({ ...prev, firstName: e.target.value }))} /></label>
                    <label className="space-y-1 text-sm"><span className="text-xs uppercase tracking-wide text-neutral-500">Last name</span><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.lastName} onChange={(e) => setUserDraft((prev) => ({ ...prev, lastName: e.target.value }))} /></label>
                    <label className="space-y-1 text-sm sm:col-span-2"><span className="text-xs uppercase tracking-wide text-neutral-500">Email</span><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.email} onChange={(e) => setUserDraft((prev) => ({ ...prev, email: e.target.value }))} /></label>
                    <label className="space-y-1 text-sm"><span className="text-xs uppercase tracking-wide text-neutral-500">Role</span><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.role} onChange={(e) => setUserDraft((prev) => ({ ...prev, role: e.target.value }))} /></label>
                    <label className="space-y-1 text-sm"><span className="text-xs uppercase tracking-wide text-neutral-500">Status</span><select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.accountStatus} onChange={(e) => setUserDraft((prev) => ({ ...prev, accountStatus: e.target.value }))}><option value="active">active</option><option value="inactive">inactive</option><option value="suspended">suspended</option></select></label>
                    <label className="space-y-1 text-sm sm:col-span-2"><span className="text-xs uppercase tracking-wide text-neutral-500">Department</span><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.department} onChange={(e) => setUserDraft((prev) => ({ ...prev, department: e.target.value }))} /></label>
                    <label className="space-y-1 text-sm sm:col-span-2"><span className="text-xs uppercase tracking-wide text-neutral-500">Phone</span><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.phone} onChange={(e) => setUserDraft((prev) => ({ ...prev, phone: e.target.value }))} /></label>
                    <label className="space-y-1 text-sm sm:col-span-2"><span className="text-xs uppercase tracking-wide text-neutral-500">Permissions</span><textarea rows={3} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" value={userDraft.permissions} onChange={(e) => setUserDraft((prev) => ({ ...prev, permissions: e.target.value }))} placeholder="comma,separated,permissions" /></label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={saveUser} loading={savingUser} icon={<span className="material-symbols-outlined text-lg">save</span>}>Save changes</Button>
                    <Button variant="secondary" onClick={syncUser} loading={sessionBusy === 'sync'} icon={<span className="material-symbols-outlined text-lg">sync</span>}>Sync user</Button>
                  </div>
                </div>
              ) : <p className="text-sm text-neutral-500">Select a user from the table to view details and edit fields.</p>}
            </section>
          </div>
        ) : null}

        {activeTab === 'sessions' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${panel} p-4`}>
              <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Active sessions</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">Global session inventory and revoke actions.</p></div><ToneBadge value={sessionBusy === 'all' ? 'working' : 'healthy'} /></div>
              <div className="space-y-2">
                {sessionsLoading ? <p className="text-sm text-neutral-500">Loading sessions...</p> : null}
                {!sessionsLoading && sessions.length === 0 ? <p className="text-sm text-neutral-500">No sessions returned.</p> : null}
                {sessions.map((item) => {
                  const id = item.sessionId || item._id || item.id;
                  return <div key={id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.userName || item.email || item.userId || 'Session'}</p><p className="text-xs text-neutral-500">{item.ip || item.ipAddress || 'unknown IP'} · {formatDateTime(item.lastSeenAt || item.updatedAt || item.createdAt)}</p></div><ToneBadge value={item.status || item.state || 'active'} /></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-neutral-500 break-all">{id}</p><Button variant="danger" size="sm" onClick={() => revokeSession(item)} loading={sessionBusy === id}>Revoke</Button></div></div>;
                })}
              </div>
            </section>
            <section className={`${panel} p-4`}>
              <div className="mb-3"><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Per-user sessions</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">List and revoke sessions for a specific user.</p></div>
              <div className="flex flex-wrap gap-2">
                <input value={sessionUserId} onChange={(e) => setSessionUserId(e.target.value)} placeholder={selectedUserKey || 'User ID'} className="h-11 min-w-[18rem] flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-950" />
                <Button variant="secondary" size="sm" onClick={() => loadUserSessions(sessionUserId || selectedUserKey)} loading={sessionsLoading} icon={<span className="material-symbols-outlined text-lg">search</span>}>Load</Button>
                <Button variant="warning" size="sm" onClick={revokeAll} loading={sessionBusy === 'all'} icon={<span className="material-symbols-outlined text-lg">block</span>}>Revoke all</Button>
              </div>
              <div className="mt-4 space-y-2">
                {userSessions.length === 0 ? <p className="text-sm text-neutral-500">No user sessions loaded.</p> : null}
                {userSessions.map((item) => {
                  const id = item.sessionId || item._id || item.id;
                  return <div key={id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.device || item.agent || item.platform || 'Session'}</p><p className="text-xs text-neutral-500">{formatDateTime(item.lastSeenAt || item.updatedAt || item.createdAt)}</p></div><Button variant="danger" size="sm" onClick={() => revokeSession(item)} loading={sessionBusy === id}>Revoke</Button></div><p className="mt-2 break-all text-xs text-neutral-500">{id}</p></div>;
                })}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'audit' ? (
          <section className={`${panel} p-4`}>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Audit trail</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">Recent portal events and administrative actions.</p></div><Button variant="secondary" size="sm" onClick={loadAudit} loading={auditLoading}>Refresh</Button></div>
            <div className="space-y-2">
              {auditLoading ? <p className="text-sm text-neutral-500">Loading audit trail...</p> : null}
              {!auditLoading && audit.length === 0 ? <p className="text-sm text-neutral-500">No audit records found.</p> : null}
              {audit.map((item, index) => <div key={item._id || item.id || `${item.action || 'audit'}-${index}`} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.action || item.event || item.type || 'Audit event'}</p><p className="text-xs text-neutral-500">{item.actor?.email || item.userEmail || item.userName || 'system'} · {formatDateTime(item.createdAt || item.timestamp)}</p></div><ToneBadge value={item.status || item.outcome || 'logged'} /></div><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{item.description || item.message || item.target || item.module || '-'}</p></div>)}
            </div>
          </section>
        ) : null}

        {activeTab === 'security' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${panel} p-4`}>
              <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Security events</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">Monitoring, replay attempts, and failed logins.</p></div><Button variant="secondary" size="sm" onClick={loadSecurity} loading={securityLoading}>Refresh</Button></div>
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs uppercase tracking-wide text-neutral-500">Security events</p><p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{securityEvents.length}</p></div>
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs uppercase tracking-wide text-neutral-500">Replay attempts</p><p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{replayAttempts.length}</p></div>
                <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs uppercase tracking-wide text-neutral-500">Failed logins</p><p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{failedLogins.length}</p></div>
              </div>
            </section>
            <section className={`${panel} p-4`}>
              <div className="mb-3"><h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Active security sessions</h3><p className="text-sm text-neutral-500 dark:text-neutral-400">Live sessions observed by security monitoring.</p></div>
              <div className="space-y-2">
                {activeSecuritySessions.length === 0 ? <p className="text-sm text-neutral-500">No monitored sessions.</p> : null}
                {activeSecuritySessions.map((item, index) => <div key={item._id || item.id || `active-${index}`} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.userName || item.email || item.userId || 'Session'}</p><p className="text-xs text-neutral-500">{item.ip || item.ipAddress || 'unknown'} · {formatDateTime(item.lastSeenAt || item.updatedAt || item.createdAt)}</p></div><ToneBadge value={item.status || item.state || 'active'} /></div></div>)}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'health' ? (
          <section className={`${panel} p-4`}>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Portal health</h2><p className="text-sm text-neutral-500 dark:text-neutral-400">Endpoint-level health checks for the super-admin portal.</p></div><Button variant="secondary" size="sm" onClick={loadHealth} loading={healthLoading}>Refresh</Button></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {healthRows.map((row) => <div key={row.label} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-neutral-900 dark:text-neutral-100">{row.label}</p><ToneBadge value={row.value} /></div>{row.detail ? <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{row.detail}</p> : null}</div>)}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
