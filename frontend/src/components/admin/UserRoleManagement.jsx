import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import PortalHeader from '../common/PortalHeader';
import StatsCard from '../common/StatsCard';
import UserFilterSidebar from './users/UserFilterSidebar';
import UserListItem from './users/UserListItem';
import UserDetailPanel from './users/UserDetailPanel';
import UserFormModal from './users/UserFormModal';

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
  const [formTouched, setFormTouched] = useState(false);

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
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedUser) return;
    setEditingUser(selectedUser);
    setForm({
      firstName: selectedUser.firstName || '',
      lastName: selectedUser.lastName || '',
      email: selectedUser.email || '',
      password: '',
      role: selectedUser.role || 'employee',
      department: selectedUser.department || '',
      phone: selectedUser.phone || '',
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
    setFormTouched(true);
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

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.role) {
        setFormError('Please fill first name, last name, email, and role.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      if (!editingUser && (!payload.password || payload.password.length < 6)) {
        setFormError('Password must be at least 6 characters.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
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

  const handleToggleStatus = async () => {
    if (!selectedUser || !token) return;
    const userId = selectedUser._id || selectedUser.id;
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

  const handleDelete = async () => {
    if (!selectedUser || !token) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedUser.firstName} ${selectedUser.lastName}?`)) {
      return;
    }

    const userId = selectedUser._id || selectedUser.id;
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

  if (loading && users.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-neutral-600 dark:text-neutral-400">Loading users...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="h-full overflow-y-auto">
        <div className="p-6 md:p-8">
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
            <Button
              variant="primary"
              size="md"
              onClick={openCreateModal}
              icon={<span className="material-symbols-outlined text-lg">add</span>}
            >
              Add New User
            </Button>
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Sidebar - Filters */}
            <div className="lg:col-span-3">
              <UserFilterSidebar
                filters={filters}
                setFilters={setFilters}
                stats={stats}
                roleCounts={roleCounts}
              />
            </div>

            {/* Middle - User List */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-lg">
                <div className="mb-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      Users List
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {users.length} {users.length === 1 ? 'user' : 'users'} found
                    </p>
                  </div>
                  {loading && (
                    <svg className="h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>

                {users.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <span className="material-symbols-outlined text-5xl text-neutral-400 dark:text-neutral-600">
                          group_off
                        </span>
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">No users found</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Try adjusting your search or filters
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4"
                      onClick={() => setFilters({ search: '', role: '', isActive: '' })}
                    >
                      Clear all filters
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[calc(100vh-24rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                    {users.map((user) => (
                      <UserListItem
                        key={user._id || user.id}
                        user={user}
                        isSelected={
                          (selectedUser?._id || selectedUser?.id) === (user._id || user.id)
                        }
                        onClick={setSelectedUser}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      icon={<span className="material-symbols-outlined text-lg">chevron_left</span>}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        {page}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">of</span>
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{totalPages}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                      icon={<span className="material-symbols-outlined text-lg">chevron_right</span>}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right - User Details */}
            <div className="lg:col-span-5">
              <UserDetailPanel
                user={selectedUser}
                onEdit={openEditModal}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                actionState={actionState}
              />
            </div>
          </div>
        </div>
      </div>

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
