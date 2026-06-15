import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { useToast } from '../../context/ToastContext';
import { hrApi } from '../../services/hr';
import UserFormModal from '../admin/users/UserFormModal';
import ExportModal from '../common/ExportModal';
import TableSkeleton from '../ui/TableSkeleton';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'employee',
  department: '',
  phoneCountry: 'IN',
  phone: '',
};

const hrRoleOptions = [
  { value: 'employee', label: 'Employee' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' },
  { value: 'it', label: 'IT' },
  { value: 'law', label: 'Law' },
  { value: 'media', label: 'Media' },
  { value: 'sales', label: 'Sales' },
  { value: 'research_operator', label: 'Research Operator' },
];

const hrDepartmentOptions = [
  'Human Resources',
  'IT & Engineering',
  'Finance',
  'Law Department',
  'Sales',
  'Media & Communications',
  'Operations',
  'Research & Development',
  'Outsourcing',
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneCountryOptions = [
  { code: 'IN', name: 'India', dialCode: '+91', minDigits: 10, maxDigits: 10 },
  { code: 'US', name: 'United States', dialCode: '+1', minDigits: 10, maxDigits: 10 },
  { code: 'CA', name: 'Canada', dialCode: '+1', minDigits: 10, maxDigits: 10 },
  { code: 'UK', name: 'United Kingdom', dialCode: '+44', minDigits: 10, maxDigits: 10 },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', minDigits: 10, maxDigits: 10 },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', minDigits: 10, maxDigits: 10 },
  { code: 'AE', name: 'UAE', dialCode: '+971', minDigits: 9, maxDigits: 9 },
  { code: 'AU', name: 'Australia', dialCode: '+61', minDigits: 9, maxDigits: 9 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', minDigits: 8, maxDigits: 8 },
];

const defaultPhoneCountry = phoneCountryOptions[0];

const getPhoneCountry = (countryCode) =>
  phoneCountryOptions.find((option) => option.code === countryCode) || defaultPhoneCountry;

const normalizePhoneDigits = (value = '') => value.replace(/\D/g, '');

const parsePhoneNumber = (phone = '') => {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return { phoneCountry: defaultPhoneCountry.code, phone: '' };
  }

  const matchedCountry = [...phoneCountryOptions]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((option) => trimmedPhone.startsWith(option.dialCode));

  if (matchedCountry) {
    return {
      phoneCountry: matchedCountry.code,
      phone: normalizePhoneDigits(trimmedPhone.slice(matchedCountry.dialCode.length)),
    };
  }

  return {
    phoneCountry: defaultPhoneCountry.code,
    phone: normalizePhoneDigits(trimmedPhone),
  };
};

const composePhoneNumber = (form) => {
  const digits = normalizePhoneDigits(form.phone);
  if (!digits) return '';
  const country = getPhoneCountry(form.phoneCountry);
  return `${country.dialCode} ${digits}`;
};

const validateEmployeeForm = (form, editingEmployee) => {
  const errors = {};
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();
  const password = form.password.trim();
  const phoneDigits = normalizePhoneDigits(form.phone);
  const phoneCountry = getPhoneCountry(form.phoneCountry);

  if (!firstName) errors.firstName = 'First name is required.';
  if (!lastName) errors.lastName = 'Last name is required.';
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!editingEmployee) {
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
  }

  if (phoneDigits) {
    if (phoneDigits.length < phoneCountry.minDigits || phoneDigits.length > phoneCountry.maxDigits) {
      const digitMessage =
        phoneCountry.minDigits === phoneCountry.maxDigits
          ? `${phoneCountry.minDigits} digits`
          : `${phoneCountry.minDigits} to ${phoneCountry.maxDigits} digits`;
      errors.phone = `${phoneCountry.code} mobile number must be ${digitMessage}.`;
    }
  }

  return errors;
};

const EmployeeDirectory = () => {
  const { token } = useAuth();
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formTouched, setFormTouched] = useState(false);
  const [actionState, setActionState] = useState({ saving: false, togglingId: null });
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await hrApi.getEmployees(token, {
        page,
        limit: 10,
        search: searchQuery || undefined,
      });
      const payload = res?.data || {};
      setEmployees(payload.employees || []);
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
    setSelectedEmployeeIds([]);
  }, [employees]);

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
    setFieldErrors({});
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const openEditModal = (employee) => {
    if (!employee) return;
    const parsedPhone = parsePhoneNumber(employee.phone || '');
    setEditingEmployee(employee);
    setForm({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      department: employee.department || '',
      phoneCountry: parsedPhone.phoneCountry,
      phone: parsedPhone.phone,
    });
    setFormError('');
    setFieldErrors({});
    setFormTouched(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setFieldErrors({});
    setForm(initialForm);
    setEditingEmployee(null);
    setFormTouched(false);
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormTouched(true);
    setFormError('');
    const validationErrors = validateEmployeeForm(form, editingEmployee);
    setFieldErrors(validationErrors);
    setActionState((prev) => ({ ...prev, saving: true }));

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
        phone: composePhoneNumber(form),
      };

      if (!editingEmployee || form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (Object.keys(validationErrors).length > 0) {
        setFormError('Please fix the highlighted fields.');
        setActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      if (!editingEmployee) {
        await hrApi.createEmployee(payload, token);
        toast.success('Employee created successfully.');
      } else {
        const employeeId = editingEmployee._id || editingEmployee.id;
        await hrApi.updateEmployee(employeeId, payload, token);
        toast.success('Employee updated successfully.');
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
    const shouldProceed = await confirm({
      title: employee.isActive ? 'Deactivate employee?' : 'Reactivate employee?',
      message: employee.isActive
        ? `This will deactivate ${employee.name || employee.email} and may restrict portal access.`
        : `This will reactivate ${employee.name || employee.email}.`,
      confirmLabel: employee.isActive ? 'Deactivate' : 'Reactivate',
      tone: 'danger',
    });
    if (!shouldProceed) return;
    const employeeId = employee._id || employee.id;
    setActionState((prev) => ({ ...prev, togglingId: employeeId }));

    try {
      await hrApi.toggleEmployeeStatus(employeeId, token);
      toast.success(employee.isActive ? 'Employee deactivated.' : 'Employee reactivated.');
      fetchEmployees();
    } catch (err) {
      setError(err.message || 'Failed to update status');
      toast.error(err.message || 'Failed to update employee status.');
    } finally {
      setActionState((prev) => ({ ...prev, togglingId: null }));
    }
  };

  const toggleSelectedEmployee = (employeeId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleExport = async (scope) => {
    if (!token) return;
    try {
      setExporting(true);
      const { blob, fileName } = await hrApi.exportEmployeesCsv({
        token,
        search: searchQuery,
        selectedIds: scope === 'selected' ? selectedEmployeeIds : [],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        scope === 'selected'
          ? `Exported ${selectedEmployeeIds.length} selected employees.`
          : 'Employee directory CSV exported.'
      );
      setIsExportModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to export employees');
      toast.error(err.message || 'Failed to export employees.');
    } finally {
      setExporting(false);
    }
  };

  const loadExportHistory = async () => {
    const response = await hrApi.getEmployeeExportHistory(token, { page: 1, limit: 5 });
    return response?.data?.items || [];
  };

  const allVisibleSelected =
    formattedEmployees.length > 0 &&
    formattedEmployees.every((employee) => selectedEmployeeIds.includes(employee._id || employee.id));

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
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100"
            >
              <span className="material-symbols-outlined text-base">upload</span>
              <span>{selectedEmployeeIds.length > 0 ? `Export Selected (${selectedEmployeeIds.length})` : 'Export CSV'}</span>
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

        {loading ? (
          <TableSkeleton columns={6} rows={6} />
        ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => {
                        if (allVisibleSelected) {
                          setSelectedEmployeeIds([]);
                          return;
                        }
                        setSelectedEmployeeIds(
                          formattedEmployees.map((employee) => employee._id || employee.id).filter(Boolean)
                        );
                      }}
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
                          checked={selectedEmployeeIds.includes(employee._id || employee.id)}
                          onChange={() => toggleSelectedEmployee(employee._id || employee.id)}
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
        )}
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        editingUser={editingEmployee}
        formError={formError}
        fieldErrors={fieldErrors}
        formTouched={formTouched}
        saving={actionState.saving}
        roleOptions={hrRoleOptions}
        departmentOptions={hrDepartmentOptions}
        showAdminFields={false}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Employees"
        description="Download the current employee directory results or only the rows you selected."
        selectedCount={selectedEmployeeIds.length}
        onExport={handleExport}
        loadHistory={loadExportHistory}
        exporting={exporting}
      />
    </main>
  );
};

export default EmployeeDirectory;
