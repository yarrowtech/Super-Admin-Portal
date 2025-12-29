import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import UserFormModal from '../admin/users/UserFormModal';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'employee',
  department: '',
  phone: '',
};

const EmployeeDirectory = () => {
  const { token } = useAuth();
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [actionState, setActionState] = useState({ saving: false, togglingId: null });
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAllUsers(token, {
        page,
        limit: 10,
        search: searchQuery || undefined,
      });
      const payload = res?.data || {};
      setEmployees(payload.users || []);
      setTotalPages(payload.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchQuery]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpen = params.get('new') === '1';
    if (shouldOpen && !autoOpenHandled) {
      openCreateModal();
      setAutoOpenHandled(true);
    }
  }, [location.search, autoOpenHandled]);

  const formattedEmployees = useMemo(() => {
    return employees.map((employee) => {
      const firstName = employee.firstName || '';
      const lastName = employee.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || employee.email || 'Employee';
      const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'EM';
      const status = employee.isActive
        ? { label: 'Active', className: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300' }
        : { label: 'Inactive', className: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-red-300' };
      const roleLabel = (employee.role || 'employee').replace('_', ' ');

      return {
        ...employee,
        name,
        initials,
        status,
        roleLabel,
      };
    });
  }, [employees]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm(initialForm);
    setFormError('');
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const openEditModal = (employee) => {
    if (!employee) return;
    setEditingEmployee(employee);
    setForm({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      department: employee.department || '',
      phone: employee.phone || '',
    });
    setFormError('');
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setForm(initialForm);
    setEditingEmployee(null);
    setFormTouched(false);
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormTouched(true);
    setFormError('');
    setActionState((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
        phone: form.phone.trim(),
      };

      if (!editingEmployee || form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.role) {
        setFormError('Please fill first name, last name, email, and role.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      if (!editingEmployee && (!payload.password || payload.password.length < 6)) {
        setFormError('Password must be at least 6 characters.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      if (!editingEmployee) {
        await adminApi.createUser(token, payload);
      } else {
        const employeeId = editingEmployee._id || editingEmployee.id;
        await adminApi.updateUser(token, employeeId, payload);
      }

      closeModal();
      fetchEmployees();
    } catch (err) {
      setFormError(err.message || 'Unable to save employee');
    } finally {
      setActionState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleToggleStatus = async (employee) => {
    if (!employee || !token) return;
    const employeeId = employee._id || employee.id;
    setActionState((prev) => ({ ...prev, togglingId: employeeId }));

    try {
      await adminApi.toggleUserStatus(token, employeeId);
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionState((prev) => ({ ...prev, togglingId: null }));
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Employee Directory
            </h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400">Manage all employees in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
              <span className="material-symbols-outlined text-base">upload</span>
              <span>Export</span>
            </button>
            <button
              onClick={openCreateModal}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-neutral-800 dark:bg-neutral-800/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <span className="material-symbols-outlined text-base">filter_list</span>
              <span>Department</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>
            <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <span>Status</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <span>Employee Name</span>
                  </div>
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Position</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Department</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Contact</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Loading employees...
                  </td>
                </tr>
              )}
              {!loading && formattedEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No employees found.
                  </td>
                </tr>
              )}
              {!loading &&
                formattedEmployees.map((employee) => (
                  <tr key={employee._id || employee.email} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                        />
                        <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                          {employee.initials}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-800 dark:text-neutral-100">{employee.name}</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${employee.status.className}`}>
                        {employee.status.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400 capitalize">{employee.roleLabel}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{employee.department || '-'}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{employee.phone || '-'}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(employee)}
                          className="flex size-8 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(employee)}
                          disabled={actionState.togglingId === (employee._id || employee.id)}
                          className="flex size-8 items-center justify-center rounded-lg hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800"
                        >
                          <span className="material-symbols-outlined text-xl">power_settings_new</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        editingUser={editingEmployee}
        formError={formError}
        formTouched={formTouched}
        saving={actionState.saving}
      />
    </main>
  );
};

export default EmployeeDirectory;
