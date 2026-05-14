import React from 'react';
import Button from '../../common/Button';

const roles = [
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
  { value: 'ceo', label: 'CEO' },
  { value: 'admin', label: 'Administrator' },
];

const departmentSuggestions = ['IT & Engineering', 'Human Resources', 'Finance', 'Operations', 'Sales', 'Media & Communications', 'Law Department', 'Research & Development', 'Customer Success', 'Outsourcing'];
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'pending_verification', label: 'Pending verification' },
];

const inputClass = 'min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const iconInputWrapClass = 'flex min-h-11 items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800';
const iconInputClass = 'min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-0 dark:text-neutral-100';
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

const UserFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  editingUser,
  formError,
  fieldErrors = {},
  formTouched,
  saving,
  roleOptions,
  departmentOptions,
  showAdminFields = true,
}) => {
  if (!isOpen) return null;

  const resolvedRoles = Array.isArray(roleOptions) && roleOptions.length > 0 ? roleOptions : roles;
  const resolvedDepartments =
    Array.isArray(departmentOptions) && departmentOptions.length > 0 ? departmentOptions : departmentSuggestions;

  const selectedPhoneCountry = phoneCountryOptions.find((country) => country.code === (form.phoneCountry || 'IN')) || phoneCountryOptions[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-3xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-neutral-200 bg-white/95 p-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 sm:text-2xl">
              {editingUser ? 'Edit User Profile' : 'Create New User'}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Basic details only. User can complete profile after login.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-400 dark:hover:bg-neutral-800 disabled:opacity-50"
            aria-label="Close user form"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {formError && formTouched && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-900/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">{formError}</p>
              </div>
            </div>
          )}

          <div className="space-y-8">
            <section>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">Basic Information</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">First Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} className={inputClass} placeholder="Enter first name" aria-invalid={Boolean(fieldErrors.firstName)} />
                  {fieldErrors.firstName && <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} className={inputClass} placeholder="Enter last name" aria-invalid={Boolean(fieldErrors.lastName)} />
                  {fieldErrors.lastName && <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.lastName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Email Address <span className="text-red-500">*</span></label>
                  <div className={iconInputWrapClass}>
                    <span className="flex items-center justify-center pl-4 text-neutral-500 dark:text-neutral-400">
                      <span className="material-symbols-outlined text-xl">email</span>
                    </span>
                    <input type="email" required value={form.email} disabled={editingUser} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className={iconInputClass} placeholder="user@example.com" aria-invalid={Boolean(fieldErrors.email)} />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
                  {editingUser && <p className="text-xs text-neutral-500 dark:text-neutral-400">Email cannot be changed.</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Phone Number</label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[96px_1fr]">
                    <select
                      value={form.phoneCountry || 'IN'}
                      onChange={(e) => setForm((prev) => ({ ...prev, phoneCountry: e.target.value }))}
                      className={`${inputClass} px-3 text-center font-semibold tracking-wide`}
                      aria-label="Phone country"
                    >
                      {phoneCountryOptions.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code}
                        </option>
                      ))}
                    </select>
                    <div className={iconInputWrapClass}>
                      <span className="flex items-center justify-center pl-4 text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-xl">phone</span>
                      </span>
                      <span className="flex items-center border-l border-neutral-200 px-3 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                        {selectedPhoneCountry.dialCode}
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^\d]/g, '') }))}
                        className={iconInputClass}
                        placeholder={`${selectedPhoneCountry.minDigits} digit mobile number`}
                        maxLength={selectedPhoneCountry.maxDigits}
                        aria-invalid={Boolean(fieldErrors.phone)}
                      />
                    </div>
                  </div>
                  {fieldErrors.phone ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.phone}</p>
                  ) : (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Use short country code like {selectedPhoneCountry.code}. Number length is checked automatically.
                    </p>
                  )}
                </div>
                {!editingUser && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Password <span className="text-red-500">*</span></label>
                    <div className={iconInputWrapClass}>
                      <span className="flex items-center justify-center pl-4 text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-xl">lock</span>
                      </span>
                      <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className={iconInputClass} placeholder="Minimum 6 characters" aria-invalid={Boolean(fieldErrors.password)} />
                    </div>
                    {fieldErrors.password && <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Ask user to change password after first login.</p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">Role & Department</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Department</label>
                  <select value={form.department || ''} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className={inputClass}>
                    <option value="">Select department</option>
                    {resolvedDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose the department for access scope and reporting.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">System Role <span className="text-red-500">*</span></label>
                  <select required value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className={inputClass}>
                    {resolvedRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Role controls module and API permissions.</p>
                </div>
                {showAdminFields ? <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Account Status</label>
                  <select value={form.accountStatus || 'active'} onChange={(e) => setForm((prev) => ({ ...prev, accountStatus: e.target.value }))} className={inputClass}>
                    {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </div> : null}
                {showAdminFields ? <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Extra Permissions</label>
                  <input type="text" value={form.permissions || ''} onChange={(e) => setForm((prev) => ({ ...prev, permissions: e.target.value }))} className={inputClass} placeholder="users:read, reports:export" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Comma-separated permission overrides for this user.</p>
                </div> : null}
              </div>
            </section>
          </div>

          <div className="mt-10 flex flex-col gap-3 md:flex-row">
            <Button type="button" variant="secondary" fullWidth onClick={onClose} disabled={saving} className="min-h-11">Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={saving} disabled={saving} className="min-h-11">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
