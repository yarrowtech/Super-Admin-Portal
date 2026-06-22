import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import PortalHeader from '../common/PortalHeader';
import StatsCard from '../common/StatsCard';
import UserFilterSidebar from './users/UserFilterSidebar';
import UserFormModal from './users/UserFormModal';
import UserDataTable from './users/UserDataTable';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: '',
  department: '',
  phone: '',
  accountStatus: 'active',
  permissions: '',
  projectAssignments: '',
};

const isProjectContextError = (error) => /project\s*id required/i.test(error?.message || '');

const UserRoleManagement = ({ api = adminApi } = {}) => {
  const userApi = api || adminApi;
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: '', isActive: '', accountStatus: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState({ saving: false, deletingId: null, togglingId: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const [usersResult, dashboardResult] = await Promise.allSettled([
        userApi.getAllUsers(token, {
          page,
          limit: 10,
          role: filters.role || undefined,
          isActive: filters.isActive !== '' ? filters.isActive : undefined,
          accountStatus: filters.accountStatus || undefined,
          search: filters.search || undefined,
        }),
        userApi.getDashboard(token),
      ]);

      if (usersResult.status === 'rejected') {
        const error = usersResult.reason;
        if (!isProjectContextError(error)) {
          throw error;
        }
      }

      const payload = usersResult.status === 'fulfilled' ? usersResult.value?.data || {} : {};
      const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value?.data || {} : {};
      const fetchedUsers = payload.users || [];
      setUsers(fetchedUsers);
      setStats({
        totalUsers: dashboard.totalUsers ?? payload.totalUsers ?? 0,
        activeUsers: dashboard.activeUsers ?? fetchedUsers.filter((u) => u.isActive).length,
        inactiveUsers: dashboard.inactiveUsers ?? fetchedUsers.filter((u) => !u.isActive).length,
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
  }, [token, page, filters, selectedUser, userApi]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.role, filters.isActive, filters.accountStatus]);

  const roleCounts = useMemo(() => {
    return users.reduce((acc, user) => {
      const role = user.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const hasLegacyEmployeeUsers = useMemo(
    () => users.some((user) => String(user?.role || '').toLowerCase() === 'employee'),
    [users]
  );

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(initialForm);
    setFormError('');
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const openEditModal = (targetUser = selectedUser) => {
    if (!targetUser) return;
    if (String(targetUser.role || '').toLowerCase() === 'employee') {
      setError('Legacy employee users are read-only and cannot be edited from admin.');
      return;
    }
    setEditingUser(targetUser);

    setForm({
      firstName: targetUser.firstName || '',
      lastName: targetUser.lastName || '',
      email: targetUser.email || '',
      password: '',
      role: targetUser.role || 'employee',
      department: targetUser.department || '',
      phone: targetUser.phone || '',
      accountStatus: targetUser.accountStatus || (targetUser.isActive ? 'active' : 'inactive'),
      permissions: Array.isArray(targetUser.permissions) ? targetUser.permissions.join(', ') : '',
      projectAssignments: Array.isArray(targetUser.metadata?.projectAssignments)
        ? targetUser.metadata.projectAssignments
            .map((assignment) => {
              if (typeof assignment === 'string') return assignment;
              if (!assignment || typeof assignment !== 'object') return '';
              return assignment.projectName || assignment.projectCode || assignment.projectId || '';
            })
            .filter(Boolean)
            .join(', ')
        : Array.isArray(targetUser.assignedProjects)
          ? targetUser.assignedProjects
              .map((assignment) => {
                if (typeof assignment === 'string') return assignment;
                if (!assignment || typeof assignment !== 'object') return '';
                return assignment.projectName || assignment.projectCode || assignment.projectId || '';
              })
              .filter(Boolean)
              .join(', ')
          : '',
    });
    setFormError('');
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setForm(initialForm);
    setEditingUser(null);
    setFormTouched(false);
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (String(editingUser?.role || '').toLowerCase() === 'employee') {
      setFormError('Legacy employee users are read-only and cannot be saved from admin.');
      return;
    }
    setFormTouched(true);
    setActionState((prev) => ({ ...prev, saving: true }));
    setFormError('');

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department?.trim() || '',
        phone: form.phone?.trim() || '',
        accountStatus: form.accountStatus || 'active',
        permissions: form.permissions
          ? form.permissions.split(',').map((permission) => permission.trim()).filter(Boolean)
          : [],
        metadata: {
          projectAssignments: form.projectAssignments
            ? form.projectAssignments.split(',').map((assignment) => assignment.trim()).filter(Boolean)
            : [],
        },
      };

      if (!editingUser || form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.role) {
        setFormError('Please fill first name, last name, and email.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      if (!editingUser && (!payload.password || payload.password.length < 6)) {
        setFormError('Password must be at least 6 characters.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      if (!editingUser) {
        await userApi.createUser(token, payload);
      } else {
        const userId = editingUser._id || editingUser.id;
        await userApi.updateUser(token, userId, payload);
      }

      closeModal();
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Unable to save user');
    } finally {
      setActionState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleToggleStatus = async (targetUser = selectedUser) => {
    if (!targetUser || !token) return;
    const userId = targetUser._id || targetUser.id;
    setActionState((prev) => ({ ...prev, togglingId: userId }));

    try {
      await userApi.toggleUserStatus(token, userId);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionState((prev) => ({ ...prev, togglingId: null }));
    }
  };

  const handleSetStatus = async (targetUser, accountStatus) => {
    if (!targetUser || !token) return;
    const userId = targetUser._id || targetUser.id;
    setActionState((prev) => ({ ...prev, togglingId: userId }));

    try {
      await userApi.setUserStatus(token, userId, accountStatus);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update account status');
    } finally {
      setActionState((prev) => ({ ...prev, togglingId: null }));
    }
  };

  const handleExportUsers = async () => {
    if (!token) return;
    try {
      const blob = await userApi.exportUsers(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to export users');
    }
  };

  const handleDelete = async (targetUser = selectedUser) => {
    if (!targetUser || !token) return;
    if (!window.confirm(`Are you sure you want to delete ${targetUser.firstName} ${targetUser.lastName}?`)) {
      return;
    }

    const userId = targetUser._id || targetUser.id;
    setActionState((prev) => ({ ...prev, deletingId: userId }));

    try {
      await userApi.deleteUser(token, userId);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setActionState((prev) => ({ ...prev, deletingId: null }));
    }
  };

  if (loading && users.length === 0) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner">
          <div className="mb-4 h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="hidden space-y-3 xl:col-span-3 xl:block">
              <div className="h-28 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="xl:col-span-9">
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="h-20 animate-pulse border-b border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800" />
                <div className="space-y-2 p-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
          {/* Header with gradient background */}
          <PortalHeader
            title="User Management"
            subtitle="Manage user accounts, roles, and permissions"
            icon="group"
            showSearch={false}
            showNotifications={false}
            showThemeToggle={false}
          >
            <StatsCard label="Total" value={stats.totalUsers} icon="groups" colorScheme="blue" />
            <StatsCard label="Active" value={stats.activeUsers} icon="check_circle" colorScheme="green" />
            <StatsCard label="Inactive" value={stats.inactiveUsers} icon="cancel" colorScheme="orange" />
            <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setFiltersOpen(true)}
                className="min-h-11 xl:hidden"
                icon={<span className="material-symbols-outlined text-lg">tune</span>}
              >
                Filters
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleExportUsers}
                className="min-h-11"
                icon={<span className="material-symbols-outlined text-lg">download</span>}
              >
                Export
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={openCreateModal}
                className="min-h-11"
                icon={<span className="material-symbols-outlined text-lg">add</span>}
              >
                Add User
              </Button>
            </div>
          </PortalHeader>
          {/* Error Message */}
          {error && (
            <div className="mb-6 animate-in slide-in-from-top-2 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-red-600 dark:text-red-400">error</span>
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 2xl:gap-6">
            {/* Left Sidebar - Filters */}
            <div className="hidden xl:col-span-3 xl:block">
              <UserFilterSidebar
                filters={filters}
                setFilters={setFilters}
                stats={stats}
                roleCounts={roleCounts}
              />
            </div>

            {/* Main Content Area */}
            <div className="xl:col-span-9">
              <UserDataTable
                users={users}
                loading={loading}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                onEditUser={openEditModal}
                onToggleStatus={handleToggleStatus}
                onSetStatus={handleSetStatus}
                onDeleteUser={handleDelete}
                actionState={actionState}
                filters={filters}
                setFilters={setFilters}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
              />
            </div>
          </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(24rem,90vw)] flex-col border-l border-neutral-200 bg-neutral-50 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">Filters</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Refine user directory</p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <UserFilterSidebar
                filters={filters}
                setFilters={setFilters}
                stats={stats}
                roleCounts={roleCounts}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        editingUser={editingUser}
        formError={formError}
        formTouched={formTouched}
        saving={actionState.saving}
      />
    </main>
  );
};

export default UserRoleManagement;
