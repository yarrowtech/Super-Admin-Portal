import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import Button from '../common/Button';
import PortalHeader from '../common/PortalHeader';
import StatsCard from '../common/StatsCard';
import UserFilterSidebar from './users/UserFilterSidebar';
import UserFormModal from './users/UserFormModal';
import UserDataTable from './users/UserDataTable';
import { getDepartmentChipLabel, getJoinedWithinLabel } from './users/userDirectoryMeta';

const emptyFilters = { search: '', role: '', isActive: '', accountStatus: '', joinedWithin: '' };

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
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0 });
  const [usersByRole, setUsersByRole] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
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
        userApi.getDashboard(token, { forceRefresh: true }),
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
      setUsersByRole(Array.isArray(dashboard.usersByRole) ? dashboard.usersByRole : []);
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
    return usersByRole.reduce((acc, entry) => {
      if (entry?._id) acc[entry._id] = entry.count || 0;
      return acc;
    }, {});
  }, [usersByRole]);

  const hasLegacyEmployeeUsers = useMemo(
    () => users.some((user) => String(user?.role || '').toLowerCase() === 'employee'),
    [users]
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.search) {
      chips.push({ key: 'search', label: `Search: "${filters.search}"`, onRemove: () => setFilters((f) => ({ ...f, search: '' })) });
    }
    if (filters.role) {
      chips.push({ key: 'role', label: getDepartmentChipLabel(filters.role), onRemove: () => setFilters((f) => ({ ...f, role: '' })) });
    }
    if (filters.isActive) {
      chips.push({
        key: 'isActive',
        label: filters.isActive === 'true' ? 'Active only' : 'Inactive only',
        onRemove: () => setFilters((f) => ({ ...f, isActive: '' })),
      });
    }
    if (filters.accountStatus) {
      chips.push({
        key: 'accountStatus',
        label: `Status: ${filters.accountStatus.replace(/_/g, ' ')}`,
        onRemove: () => setFilters((f) => ({ ...f, accountStatus: '' })),
      });
    }
    if (filters.joinedWithin) {
      chips.push({
        key: 'joinedWithin',
        label: `Joined: ${getJoinedWithinLabel(filters.joinedWithin)}`,
        onRemove: () => setFilters((f) => ({ ...f, joinedWithin: '' })),
      });
    }
    return chips;
  }, [filters]);

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
      role: targetUser.role || '',
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
      toast.success(editingUser ? 'User updated successfully.' : 'User created successfully.');
      // Clear filters so the just-saved user (whatever its role/status) is
      // guaranteed to be visible instead of silently hidden by whatever
      // filter happened to be active before the save. This also triggers a
      // fresh fetchUsers() via the filters-driven effect below — no need to
      // call it explicitly, since doing so here would still use the stale
      // (pre-update) filters closure.
      setFilters(emptyFilters);
    } catch (err) {
      setFormError(err.message || 'Unable to save user');
    } finally {
      setActionState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleToggleStatus = async (targetUser = selectedUser) => {
    if (!targetUser || !token) return;
    const fullName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
    const shouldProceed = await confirm({
      title: targetUser.isActive ? 'Deactivate user?' : 'Activate user?',
      message: targetUser.isActive
        ? `${fullName} will lose access to the platform until reactivated.`
        : `${fullName} will regain access to the platform.`,
      confirmLabel: targetUser.isActive ? 'Deactivate' : 'Activate',
      tone: targetUser.isActive ? 'danger' : 'warning',
    });
    if (!shouldProceed) return;

    const userId = targetUser._id || targetUser.id;
    setActionState((prev) => ({ ...prev, togglingId: userId }));

    try {
      await userApi.toggleUserStatus(token, userId);
      toast.success(targetUser.isActive ? `${fullName} deactivated.` : `${fullName} activated.`);
      fetchUsers();
    } catch (err) {
      const message = err.message || 'Failed to update status';
      setError(message);
      toast.error(message);
    } finally {
      setActionState((prev) => ({ ...prev, togglingId: null }));
    }
  };

  const handleSetStatus = async (targetUser, accountStatus) => {
    if (!targetUser || !token) return;
    const fullName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
    const blocking = accountStatus === 'blocked';
    const shouldProceed = await confirm({
      title: blocking ? 'Block user?' : 'Unblock user?',
      message: blocking
        ? `${fullName} will be immediately signed out and blocked from logging in.`
        : `${fullName} will be able to log in again.`,
      confirmLabel: blocking ? 'Block' : 'Unblock',
      tone: blocking ? 'danger' : 'warning',
    });
    if (!shouldProceed) return;

    const userId = targetUser._id || targetUser.id;
    setActionState((prev) => ({ ...prev, togglingId: userId }));

    try {
      await userApi.setUserStatus(token, userId, accountStatus);
      toast.success(blocking ? `${fullName} blocked.` : `${fullName} unblocked.`);
      fetchUsers();
    } catch (err) {
      const message = err.message || 'Failed to update account status';
      setError(message);
      toast.error(message);
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
      toast.success('User directory exported.');
    } catch (err) {
      const message = err.message || 'Failed to export users';
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async (targetUser = selectedUser) => {
    if (!targetUser || !token) return;
    const fullName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
    const shouldProceed = await confirm({
      title: 'Delete user?',
      message: `This will permanently delete ${fullName}. This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!shouldProceed) return;

    const userId = targetUser._id || targetUser.id;
    setActionState((prev) => ({ ...prev, deletingId: userId }));

    try {
      await userApi.deleteUser(token, userId);
      toast.success(`${fullName} deleted.`);
      fetchUsers();
    } catch (err) {
      const message = err.message || 'Failed to delete user';
      setError(message);
      toast.error(message);
    } finally {
      setActionState((prev) => ({ ...prev, deletingId: null }));
    }
  };

  if (loading && users.length === 0) {
    return (
      <main className="portal-page">
        <div className="portal-page-inner">
          <div className="mb-4 h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-12">
            <div className="hidden space-y-3 min-[1200px]:col-span-3 min-[1200px]:block">
              <div className="h-28 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="min-[1200px]:col-span-9">
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
                className="min-h-11 min-[1200px]:hidden"
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

          {/* Active Filter Chips */}
          {activeFilterChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Active filters
              </span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 pl-3 pr-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-primary/30 dark:bg-primary/15"
                >
                  <span className="max-w-[16rem] truncate">{chip.label}</span>
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                className="text-xs font-semibold text-neutral-500 underline-offset-2 hover:text-red-600 hover:underline dark:text-neutral-400 dark:hover:text-red-400"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-12 min-[1200px]:items-start 2xl:gap-6">
            {/* Left Sidebar - Filters */}
            <div className="hidden min-[1200px]:sticky min-[1200px]:top-4 min-[1200px]:col-span-3 min-[1200px]:block min-[1200px]:max-h-[calc(100vh-2rem)] min-[1200px]:overflow-y-auto">
              <UserFilterSidebar
                filters={filters}
                setFilters={setFilters}
                stats={stats}
                roleCounts={roleCounts}
              />
            </div>

            {/* Main Content Area */}
            <div className="min-[1200px]:col-span-9">
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
        <div className="fixed inset-0 z-40 min-[1200px]:hidden" role="dialog" aria-modal="true">
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
