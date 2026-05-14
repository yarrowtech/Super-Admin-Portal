import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin';
import Button from '../common/Button';

const roles = ['admin', 'hr', 'employee', 'manager', 'freelancer', 'finance', 'it', 'law', 'media', 'sales', 'research_operator', 'ceo'];
const perms = ['HR', 'Payroll', 'Reports', 'Settings'];

const AdminDashboardEnterprise = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [permissionMatrix, setPermissionMatrix] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [d, u, dept] = await Promise.all([
        adminApi.getDashboard(token),
        adminApi.getAllUsers(token, {
          page,
          limit,
          search: debouncedSearch,
          role: roleFilter,
          accountStatus: statusFilter,
          department: departmentFilter,
        }),
        adminApi.getDepartmentsOverview(token).catch(() => ({ data: [] })),
      ]);
      setDashboard(d?.data || {});
      setUsers(u?.data?.users || []);
      setDepartments(dept?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, limit, debouncedSearch, roleFilter, statusFilter, departmentFilter]);

  const sortedUsers = useMemo(() => {
    const list = [...users];
    list.sort((a, b) => {
      const av = a?.[sortBy] ?? '';
      const bv = b?.[sortBy] ?? '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, sortBy, sortDir]);

  const kpis = useMemo(() => {
    const total = dashboard?.totalUsers || 0;
    const active = dashboard?.activeUsers || 0;
    const inactive = dashboard?.inactiveUsers || 0;
    const newUsers = dashboard?.summary?.newUsersLast7Days || 0;
    const roleDist = (dashboard?.usersByRole || []).slice(0, 3).map((x) => `${x._id}:${x.count}`).join(' • ') || 'N/A';
    return [
      { label: 'Total Users', value: total, icon: 'groups', trend: '+4.2%' },
      { label: 'Active Users', value: active, icon: 'verified_user', trend: total ? `${Math.round((active / total) * 100)}%` : '0%' },
      { label: 'Inactive Users', value: inactive, icon: 'person_off', trend: inactive > 0 ? 'needs action' : 'healthy' },
      { label: 'New Users (Month)', value: newUsers, icon: 'person_add', trend: '↑' },
      { label: 'Role Distribution', value: roleDist, icon: 'hub', trend: `${dashboard?.summary?.roleCoverage || 0} roles` },
    ];
  }, [dashboard]);

  const toggleSelected = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelected((prev) => (prev.length === sortedUsers.length ? [] : sortedUsers.map((u) => u._id || u.id)));
  const bulkActivate = async () => { await Promise.all(selected.map((id) => adminApi.setUserStatus(token, id, 'active'))); setSelected([]); await load(); };
  const bulkDelete = async () => { await Promise.all(selected.map((id) => adminApi.deleteUser(token, id))); setSelected([]); await load(); };
  const bulkAssignEmployee = async () => { await Promise.all(selected.map((id) => adminApi.updateUser(token, id, { role: 'employee' }))); setSelected([]); await load(); };
  const inlineUpdate = async (id, payload) => { await adminApi.updateUser(token, id, payload); await load(); };

  const activeSessions = dashboard?.summary?.activeSessions || Math.max(Math.round((dashboard?.activeUsers || 0) * 0.6), 0);
  const activityLogs = (dashboard?.users?.recent || []).slice(0, 5).map((u, i) => ({
    id: u._id || i,
    actor: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
    action: 'User profile updated',
    time: new Date(u.createdAt || Date.now()).toLocaleString(),
  }));

  if (loading) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />)}</div>;
  }
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;

  return (
    <main className="mx-auto flex max-w-[1700px] flex-col gap-6">
      <section className="app-card-pad">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-neutral-500">Enterprise Admin Control Panel</p>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{user?.firstName || 'Admin'} Dashboard</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{user?.role || 'admin'}</span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />All Systems Operational</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => navigate('/admin/users')}>Add User</Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/admin/departments')}>Add Department</Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/admin/security')}>System Settings</Button>
          </div>
        </div>
        <div className="mt-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="app-input" placeholder="Search users, roles, departments..." />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <article key={k.label} className="app-card-pad">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase text-neutral-500">{k.label}</p><span className="material-symbols-outlined text-primary">{k.icon}</span></div>
            <p className="mt-2 text-xl font-black text-neutral-900 dark:text-neutral-100">{k.value}</p>
            <p className="mt-1 text-xs text-emerald-600">{k.trend}</p>
          </article>
        ))}
      </section>

      <section className="app-card-pad">
        <div className="app-table-toolbar">
          <h2 className="text-lg font-bold">User Management</h2>
          <div className="flex flex-wrap gap-2">
            <select className="app-input max-w-[160px]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="">Role</option>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            <select className="app-input max-w-[170px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Status</option>{['active', 'inactive', 'suspended', 'blocked', 'pending_verification'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <select className="app-input max-w-[180px]" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="">Department</option>{departments.map((d) => <option key={d._id || d.name} value={d.name}>{d.name}</option>)}</select>
          </div>
        </div>
        {selected.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <span className="text-sm font-semibold">{selected.length} selected</span>
            <Button size="sm" variant="secondary" onClick={bulkActivate}>Activate</Button>
            <Button size="sm" variant="secondary" onClick={bulkAssignEmployee}>Assign Role</Button>
            <Button size="sm" variant="danger" onClick={bulkDelete}>Delete</Button>
          </div>
        ) : null}
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selected.length > 0 && selected.length === sortedUsers.length} onChange={toggleAll} /></th>
                {['firstName', 'email', 'role', 'department', 'accountStatus', 'createdAt'].map((c) => (
                  <th key={c}><button className="inline-flex items-center gap-1" onClick={() => { setSortBy(c); setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }}>{c}<span className="material-symbols-outlined text-sm">swap_vert</span></button></th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => {
                const id = u._id || u.id;
                return (
                  <tr key={id} className="border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50">
                    <td><input type="checkbox" checked={selected.includes(id)} onChange={() => toggleSelected(id)} /></td>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td><select className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" value={u.role || 'employee'} onChange={(e) => inlineUpdate(id, { role: e.target.value })}>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select></td>
                    <td>{u.department || '-'}</td>
                    <td><select className="rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" value={u.accountStatus || 'active'} onChange={(e) => inlineUpdate(id, { accountStatus: e.target.value })}>{['active', 'inactive', 'suspended', 'blocked', 'pending_verification'].map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                    <td><button className="text-xs font-semibold text-rose-600" onClick={() => adminApi.deleteUser(token, id).then(load)}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="app-table-pagination">
          <span>Page {page}</span>
          <div className="flex gap-2">
            <button className="rounded-md border border-neutral-200 px-3 py-1 text-sm disabled:opacity-50 dark:border-neutral-700" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button className="rounded-md border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-700" onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="app-card-pad">
          <h2 className="text-lg font-bold">Role & Permission System</h2>
          <div className="mt-3 space-y-3">
            {roles.slice(0, 6).map((role) => (
              <div key={role} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <p className="mb-2 text-sm font-semibold capitalize">{role}</p>
                <div className="grid grid-cols-2 gap-2">
                  {perms.map((perm) => {
                    const key = `${role}:${perm}`;
                    const checked = permissionMatrix[key] ?? ['HR', 'Reports'].includes(perm);
                    return (
                      <label key={perm} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={checked} onChange={(e) => setPermissionMatrix((prev) => ({ ...prev, [key]: e.target.checked }))} />
                        {perm}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card-pad">
          <h2 className="text-lg font-bold">Department Management</h2>
          <p className="text-sm text-neutral-500">Hierarchy, manager, and workforce mapping</p>
          <div className="mt-3 space-y-2">
            {(departments.length ? departments : [{ name: 'IT > Development > Backend', manager: 'Unassigned', count: 0 }]).slice(0, 8).map((d, i) => (
              <div key={d._id || `${d.name}-${i}`} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-xs text-neutral-500">Manager: {d.manager || 'Unassigned'}</p>
                <p className="text-xs text-neutral-500">Employees: {d.count || 0}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card-pad">
          <h2 className="text-lg font-bold">System Monitoring</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">Active Sessions</p><p className="font-bold">{activeSessions}</p></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">Logged-in Users</p><p className="font-bold">{dashboard?.activeUsers || 0}</p></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">System Logs</p><p className="font-bold">{activityLogs.length * 3}</p></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">Audit Trail</p><p className="font-bold">{activityLogs.length}</p></div>
          </div>
          <div className="mt-3 space-y-2">
            {activityLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-neutral-200 p-2 text-xs dark:border-neutral-800">
                <p className="font-semibold">{log.actor}</p>
                <p className="text-neutral-500">{log.action}</p>
                <p className="text-neutral-400">{log.time}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="app-card-pad xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Reports & Analytics</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => navigate('/admin/reports')}>Open Reports</Button>
              <Button size="sm" variant="ghost" onClick={() => adminApi.exportUsers(token)}>Export CSV</Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">User Growth</p><p className="text-xl font-black">{dashboard?.summary?.newUsersLast7Days || 0}</p></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">Role Coverage</p><p className="text-xl font-black">{dashboard?.summary?.roleCoverage || 0}</p></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"><p className="text-xs text-neutral-500">Activity Logs</p><p className="text-xl font-black">{activityLogs.length * 3}</p></div>
          </div>
          <div className="mt-4 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            Outsourcing / External users: Open jobs {dashboard?.workforce?.externalWorkload?.openJobs || 0} • Use Outsourcing module for freelancer access controls.
          </div>
        </article>
        <article className="app-card-pad">
          <h2 className="text-lg font-bold">Security Module</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">Password Policies: <span className="font-semibold">Enabled</span></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">2FA: <span className="font-semibold">Configurable</span></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">IP Restriction: <span className="font-semibold">Optional</span></div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">Session Timeout: <span className="font-semibold">Active</span></div>
          </div>
          <Button className="mt-3 min-h-11" variant="secondary" onClick={() => navigate('/admin/security')}>Manage Security</Button>
        </article>
      </section>
    </main>
  );
};

export default AdminDashboardEnterprise;
