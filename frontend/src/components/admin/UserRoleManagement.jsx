import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';

const roleOptions = [
  'admin',
  'ceo',
  'it',
  'law',
  'hr',
  'media',
  'finance',
  'manager',
  'sales',
  'research_operator',
  'employee',
];

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'employee',
  department: '',
  phone: '',
};

const UserRoleManagement = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState({ saving: false, deletingId: null, togglingId: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAllUsers(token, {
        page,
        limit: 10,
        role: filters.role || undefined,
        isActive: filters.isActive !== '' ? filters.isActive : undefined,
        search: filters.search || undefined,
      });

      const payload = res?.data || {};
      const fetchedUsers = payload.users || [];
      setUsers(fetchedUsers);
      setStats({
        totalUsers: payload.totalUsers || 0,
        activeUsers: fetchedUsers.filter((u) => u.isActive).length,
        inactiveUsers: fetchedUsers.filter((u) => !u.isActive).length,
      });
      setTotalPages(payload.totalPages || 1);

      if (fetchedUsers.length > 0) {
        const existingId = selectedUser?._id || selectedUser?.id;
        const match = fetchedUsers.find((u) => (u._id || u.id) === existingId);

        if (!existingId && fetchedUsers[0]) {
          setSelectedUser(fetchedUsers[0]);
        } else if (existingId && !match && fetchedUsers[0]) {
          setSelectedUser(fetchedUsers[0]);
        }
      } else {
        setSelectedUser(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token, page, filters, selectedUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const roleCounts = useMemo(() => {
    return users.reduce((acc, user) => {
      const role = user.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      role: user.role || 'employee',
      department: user.department || '',
      phone: user.phone || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setForm(initialForm);
    setEditingUser(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setActionState((prev) => ({ ...prev, saving: true }));
    setFormError('');
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
        phone: form.phone.trim(),
      };
      if (!editingUser || form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (!editingUser) {
        await adminApi.createUser(token, payload);
      } else {
        const userId = editingUser._id || editingUser.id;
        await adminApi.updateUser(token, userId, payload);
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Unable to save user');
    } finally {
      setActionState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleToggleStatus = async (userId) => {
    if (!token) return;
    setActionState((prev) => ({ ...prev, togglingId: userId }));
    try {
      await adminApi.toggleUserStatus(token, userId);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionState((prev) => ({ ...prev, togglingId: null }));
    }
  };

  const handleDelete = async (userId) => {
    if (!token) return;
    setActionState((prev) => ({ ...prev, deletingId: userId }));
    try {
      await adminApi.deleteUser(token, userId);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setActionState((prev) => ({ ...prev, deletingId: null }));
    }
  };

  const people = useMemo(() => users.slice(0, 6), [users]);
  const selectedUserId = selectedUser?._id || selectedUser?.id;

  const renderStatusBadge = (isActive) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
      }`}
    >
      <span className="material-symbols-outlined text-sm">{isActive ? 'check_circle' : 'block'}</span>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const initials = (name = '') => {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'U'
    );
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              User &amp; Role Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Create, edit, and manage user roles and permissions across all products.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchUsers}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Refresh
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">settings</span>
              Manage Roles
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Add User
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total Users</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.totalUsers}</p>
            <p className="text-xs font-semibold text-primary">All registered accounts</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Active Users</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.activeUsers}</p>
            <p className="text-xs font-semibold text-green-600">Enabled accounts</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Inactive Users</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.inactiveUsers}</p>
            <p className="text-xs font-semibold text-orange-500">Disabled accounts</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-6">
          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Search Users</label>
              <div className="mt-2 flex h-11 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <span className="flex items-center px-3 text-neutral-500 dark:text-neutral-400">
                  <span className="material-symbols-outlined text-base">search</span>
                </span>
                <input
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setPage(1);
                  }}
                  className="flex-1 bg-transparent pr-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-100"
                  placeholder="Name or email"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Roles</h3>
              <div className="mt-3 space-y-2">
                {Object.entries(roleCounts).map(([role, count]) => (
                  <button
                    key={role}
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, role }));
                      setPage(1);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <span className="capitalize">{role}</span>
                    <span className="text-xs text-neutral-500">{count}</span>
                  </button>
                ))}
                {Object.keys(roleCounts).length === 0 && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No users yet.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">People</h3>
              <div className="space-y-2">
                {people.map((person) => {
                  const personId = person._id || person.id;
                  return (
                    <button
                      key={personId}
                      onClick={() => setSelectedUser(person)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                        personId === selectedUserId ? 'border border-primary/50 bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100">
                        {initials(`${person.firstName || ''} ${person.lastName || ''}`)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {`${person.firstName || ''} ${person.lastName || ''}`.trim() || '—'}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{person.email}</p>
                      </div>
                      {person.role && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold capitalize text-primary">
                          {person.role}
                        </span>
                      )}
                    </button>
                  );
                })}
                {people.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">No people to display.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-3">
            {selectedUser ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex size-24 items-center justify-center rounded-full border-4 border-white bg-neutral-200 text-2xl font-bold text-neutral-700 shadow dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                    {initials(`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`)}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || '—'}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedUser.email}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                    {renderStatusBadge(selectedUser.isActive)}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary capitalize">{selectedUser.role}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Department</p>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{selectedUser.department || '—'}</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Phone</p>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{selectedUser.phone || '—'}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  Manage access, role, and account status for this user. Use the actions on the right to edit, activate/deactivate, or remove.
                </div>
              </>
            ) : (
              <div className="flex min-h-40 items-center justify-center text-neutral-600 dark:text-neutral-300">Select a user to view details.</div>
            )}
          </div>

          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-1">
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Filters</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <label className="text-neutral-600 dark:text-neutral-300">Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, role: e.target.value }));
                      setPage(1);
                    }}
                    className="mt-1 w-full rounded-lg border-neutral-200 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="">All</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-600 dark:text-neutral-300">Status</label>
                  <select
                    value={filters.isActive}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, isActive: e.target.value }));
                      setPage(1);
                    }}
                    className="mt-1 w-full rounded-lg border-neutral-200 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            {selectedUser && (
              <div className="space-y-3 text-sm">
                <button
                  onClick={() => openEditModal(selectedUser)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Edit User
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedUserId)}
                  disabled={actionState.togglingId === selectedUserId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-base">toggle_on</span>
                  {actionState.togglingId === selectedUserId
                    ? 'Updating...'
                    : selectedUser.isActive
                      ? 'Deactivate'
                      : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(selectedUserId)}
                  disabled={actionState.deletingId === selectedUserId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  {actionState.deletingId === selectedUserId ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Users</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Page {page} of {totalPages}
            </p>
          </div>
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-neutral-600 dark:text-neutral-300">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              No users found. Try adjusting filters or add a new user.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                <thead>
                  <tr className="text-left text-sm text-neutral-500 dark:text-neutral-400">
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Department</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {users.map((user) => {
                    const userId = user._id || user.id;
                    return (
                      <tr key={userId} className="text-sm text-neutral-800 dark:text-neutral-100">
                        <td className="px-3 py-3">
                          <div className="font-semibold">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}</div>
                        </td>
                        <td className="px-3 py-3">{user.email}</td>
                        <td className="px-3 py-3 capitalize">{user.role}</td>
                        <td className="px-3 py-3">{user.department || '—'}</td>
                        <td className="px-3 py-3">{renderStatusBadge(user.isActive)}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(userId)}
                              disabled={actionState.togglingId === userId}
                              className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                              {actionState.togglingId === userId ? 'Updating...' : user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(userId)}
                              disabled={actionState.deletingId === userId}
                              className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/40"
                            >
                              {actionState.deletingId === userId ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-neutral-200 px-3 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-neutral-200 px-3 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Next
            </button>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {editingUser ? 'Update user details and role.' : 'Invite a member and assign their primary role.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {formError && (
              <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
                {formError}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">First Name</label>
                <input
                  required
                  name="firstName"
                  value={form.firstName}
                  onChange={handleFormChange}
                  type="text"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Last Name</label>
                <input
                  required
                  name="lastName"
                  value={form.lastName}
                  onChange={handleFormChange}
                  type="text"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Email Address</label>
                <input
                  required
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  type="email"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark.border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="jane.doe@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Password {editingUser ? '(leave blank to keep current)' : ''}
                </label>
                <input
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark.border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Primary Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Department</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    type="text"
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    placeholder="e.g. Operations"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  type="tel"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="+1 555 555 5555"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionState.saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  {actionState.saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default UserRoleManagement;
