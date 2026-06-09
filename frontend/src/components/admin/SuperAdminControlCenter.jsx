import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import { superAdminApi } from '../../services/superAdmin';

const card = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5';

const statusTone = {
  healthy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  down: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
};

const StatusBadge = ({ value }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[String(value || '').toLowerCase()] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
    {String(value || 'unknown').replaceAll('_', ' ')}
  </span>
);

export default function SuperAdminControlCenter() {
  const { token, user } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [portalAccess, setPortalAccess] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ summary: {}, checks: [] });
  const [companyControls, setCompanyControls] = useState([]);
  const [projectAllocations, setProjectAllocations] = useState({ projects: [], users: [], summary: {} });
  const [allocationDrafts, setAllocationDrafts] = useState({});
  const [savingControlId, setSavingControlId] = useState('');
  const [savingAllocationId, setSavingAllocationId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [d, f, p, s, c, a] = await Promise.allSettled([
        superAdminApi.getDashboard(token, { from, to }),
        superAdminApi.getFeatureFlags(token),
        superAdminApi.getPortalAccess(token),
        superAdminApi.getSystemHealth(token),
        superAdminApi.getCompanyControls(token),
        superAdminApi.getProjectAllocations(token),
      ]);
      setDashboard(d.status === 'fulfilled' ? d.value?.data || {} : {});
      setFeatureFlags(f.status === 'fulfilled' ? f.value?.data || [] : []);
      setPortalAccess(p.status === 'fulfilled' ? p.value?.data || [] : []);
      setSystemHealth(s.status === 'fulfilled' ? s.value?.data || { summary: {}, checks: [] } : { summary: {}, checks: [] });
      setCompanyControls(c.status === 'fulfilled' ? c.value?.data || [] : []);
      const allocations = a.status === 'fulfilled' ? a.value?.data || {} : {};
      setProjectAllocations(allocations);
      const nextDrafts = {};
      (allocations.users || []).forEach((item) => {
        nextDrafts[item._id] = Array.isArray(item.assignedProjects)
          ? item.assignedProjects.map((assignment) => {
              if (typeof assignment === 'string') return assignment;
              if (!assignment || typeof assignment !== 'object') return '';
              return assignment.projectName || assignment.projectCode || assignment.projectId || '';
            }).filter(Boolean).join(', ')
          : '';
      });
      setAllocationDrafts(nextDrafts);
    } catch (e) {
      setError(e.message || 'Failed to load super admin controls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  const kpis = useMemo(() => [
    { label: 'Users', value: dashboard?.users?.total ?? 0 },
    { label: 'Active Users', value: dashboard?.users?.active ?? 0 },
    { label: 'Projects', value: dashboard?.projects?.total ?? 0 },
    { label: 'Open Tasks', value: dashboard?.tasks?.open ?? 0 },
    { label: 'Enabled Flags', value: dashboard?.featureFlags?.enabled ?? 0 },
    { label: 'Health', value: dashboard?.systemHealth?.overall ?? 'healthy' }
  ], [dashboard]);

  const toggleFlag = async (item) => {
    await superAdminApi.updateFeatureFlag(token, item._id, { enabled: !item.enabled });
    load();
  };
  const toggleAccess = async (item) => {
    await superAdminApi.updatePortalAccess(token, item._id, { canAccess: !item.canAccess });
    load();
  };
  const updateControl = async (item, value) => {
    try {
      setSavingControlId(item._id);
      await superAdminApi.updateCompanyControl(token, item._id, { value });
      await load();
    } finally {
      setSavingControlId('');
    }
  };

  const updateAllocation = async (userId) => {
    if (!token || !userId) return;
    try {
      setSavingAllocationId(userId);
      const raw = allocationDrafts[userId] || '';
      const projectAssignments = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => ({ projectName: value }));
      await superAdminApi.updateProjectAllocations(token, userId, { projectAssignments });
      await load();
    } finally {
      setSavingAllocationId('');
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-100 p-4 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900 md:p-5">
      <div className="mx-auto w-full max-w-[1500px]">
        <PortalHeader title="Super Admin Control Center" user={user} icon="admin_panel_settings" />
        {error ? <p className="mt-3 rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Dashboard Filters</h2>
            {loading ? <span className="text-xs text-neutral-500">Refreshing...</span> : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-neutral-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-neutral-300 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-950" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-neutral-300 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-950" />
          </div>
          <button onClick={load} disabled={loading} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">Apply</button>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className={`${card} min-h-[120px]`}>
              <p className="text-xs text-neutral-500">{k.label}</p>
              <p className="mt-2 break-words text-2xl font-bold text-neutral-900 dark:text-white">{loading ? '...' : k.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className={`${card} min-h-[360px]`}>
            <h2 className="mb-3 text-lg font-semibold">Feature Flags</h2>
            <div className="space-y-2">
              {featureFlags.length === 0 ? <p className="text-sm text-neutral-500">No feature flags found.</p> : null}
              {featureFlags.map((f) => (
                <div key={f._id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700">
                  <div><p className="font-medium">{f.key}</p><p className="text-neutral-500">{f.description || '-'}</p></div>
                  <button onClick={() => toggleFlag(f)} className={`rounded px-2 py-1 text-xs font-semibold ${f.enabled ? 'bg-emerald-600 text-white' : 'bg-neutral-300 text-neutral-800'}`}>{f.enabled ? 'Enabled' : 'Disabled'}</button>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} min-h-[360px]`}>
            <h2 className="mb-3 text-lg font-semibold">Portal Access</h2>
            <div className="space-y-2">
              {portalAccess.length === 0 ? <p className="text-sm text-neutral-500">No portal access rules found.</p> : null}
              {portalAccess.map((a) => (
                <div key={a._id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700">
                  <div><p className="font-medium">{a.role} → {a.portal}</p></div>
                  <button onClick={() => toggleAccess(a)} className={`rounded px-2 py-1 text-xs font-semibold ${a.canAccess ? 'bg-emerald-600 text-white' : 'bg-neutral-300 text-neutral-800'}`}>{a.canAccess ? 'Allowed' : 'Blocked'}</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className={`${card} min-h-[380px]`}>
            <h2 className="mb-3 text-lg font-semibold">System Health</h2>
            <div className="mb-2 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">Healthy: {systemHealth?.summary?.healthy ?? 0}</div>
              <div className="rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">Degraded: {systemHealth?.summary?.degraded ?? 0}</div>
              <div className="rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">Down: {systemHealth?.summary?.down ?? 0}</div>
            </div>
            <div className="space-y-2">
              {(systemHealth?.checks || []).length === 0 ? <p className="text-sm text-neutral-500">No system checks available.</p> : null}
              {(systemHealth?.checks || []).slice(0, 8).map((c) => (
                <div key={c._id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700">
                  <span>{c.service}</span>
                  <StatusBadge value={c.status} />
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} min-h-[380px]`}>
            <h2 className="mb-3 text-lg font-semibold">Company Controls</h2>
            <div className="space-y-2">
              {companyControls.length === 0 ? <p className="text-sm text-neutral-500">No company controls configured.</p> : null}
              {companyControls.map((c) => (
                <div key={c._id} className="rounded-xl border border-neutral-200 p-2.5 text-sm dark:border-neutral-700">
                  <p className="mb-1 font-medium">{c.key}</p>
                  <input
                    defaultValue={typeof c.value === 'string' ? c.value : JSON.stringify(c.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white p-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                    onBlur={(e) => updateControl(c, e.target.value)}
                    disabled={savingControlId === c._id}
                  />
                  {savingControlId === c._id ? <p className="mt-1 text-xs text-neutral-500">Saving...</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Project Allocations</h2>
              <p className="text-sm text-neutral-500">Assign users to specific project workspaces and centralize access scope.</p>
            </div>
            <div className="text-xs text-neutral-500">
              {projectAllocations?.summary?.allocatedUsers ?? 0} allocated / {projectAllocations?.summary?.unallocatedUsers ?? 0} unallocated
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {(projectAllocations.users || []).slice(0, 8).map((item) => (
              <div key={item._id} className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.firstName} {item.lastName}</p>
                    <p className="text-xs text-neutral-500">{item.email}</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {item.assignedProjectCount || 0} projects
                  </span>
                </div>
                <textarea
                  value={allocationDrafts[item._id] || ''}
                  onChange={(e) => setAllocationDrafts((prev) => ({ ...prev, [item._id]: e.target.value }))}
                  className="mt-3 min-h-20 w-full rounded-lg border border-neutral-200 bg-white p-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  placeholder="EEC LMS, EHC, Media Portal"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500">Comma-separated project names or codes.</p>
                  <button
                    type="button"
                    onClick={() => updateAllocation(item._id)}
                    disabled={savingAllocationId === item._id}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {savingAllocationId === item._id ? 'Saving...' : 'Save Allocation'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
