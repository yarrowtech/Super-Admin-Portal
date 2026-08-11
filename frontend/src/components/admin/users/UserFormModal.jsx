import React, { useState } from 'react';
import Button from '../../common/Button';

const roles = [
  { value: 'admin', label: 'Super Admin' },
  { value: 'ceo', label: 'CEO' },
  { value: 'hr', label: 'HR' },
  { value: 'it_manager', label: 'IT Manager' },
  { value: 'it_admin', label: 'IT Admin' },
  { value: 'it_employee', label: 'IT Employee' },
  { value: 'it_hr', label: 'IT HR' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'finance_employee', label: 'Finance Employee' },
  { value: 'media_head', label: 'Media Head' },
  { value: 'media_sales', label: 'Media Sales' },
  { value: 'media_marketing', label: 'Media Marketing' },
  { value: 'law_head', label: 'Law Head' },
  { value: 'law_employee', label: 'Law Employee' },
  { value: 'freelancer', label: 'Freelancer (Outsourcing)' },
];

const departmentSuggestions = ['IT', 'Human Resources', 'Finance', 'Media', 'Law', 'Executive', 'Outsourcing'];
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'pending_verification', label: 'Pending verification' },
];

const inputClass = 'h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
const iconInputWrapClass = 'flex h-11 items-stretch overflow-hidden rounded-lg border border-neutral-200 bg-white transition-within focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800';
const iconInputClass = 'min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 dark:text-neutral-100';
const fieldClass = 'space-y-1.5';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300';
const helperClass = 'min-h-4 text-xs leading-4 text-neutral-500 dark:text-neutral-400';
const errorClass = 'min-h-4 text-xs leading-4 text-red-600 dark:text-red-400';
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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:max-h-[92dvh] sm:max-w-[720px] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-black leading-tight text-neutral-950 dark:text-neutral-100">
              {editingUser ? 'Edit User Profile' : 'Create New User'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
              Add identity, contact, role, and account status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 disabled:opacity-50"
            aria-label="Close user form"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {formError && formTouched && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-900/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">{formError}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </span>
                <h3 className="text-sm font-black uppercase tracking-wide text-neutral-900 dark:text-neutral-100">Basic Information</h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                <div className={fieldClass}>
                  <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} className={inputClass} placeholder="Enter first name" aria-invalid={Boolean(fieldErrors.firstName)} />
                  <p className={fieldErrors.firstName ? errorClass : helperClass}>{fieldErrors.firstName || ''}</p>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} className={inputClass} placeholder="Enter last name" aria-invalid={Boolean(fieldErrors.lastName)} />
                  <p className={fieldErrors.lastName ? errorClass : helperClass}>{fieldErrors.lastName || ''}</p>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                  <div className={iconInputWrapClass}>
                    <span className="flex w-10 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400">
                      <span className="material-symbols-outlined text-xl">email</span>
                    </span>
                    <input type="email" required value={form.email} disabled={editingUser} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className={iconInputClass} placeholder="user@example.com" aria-invalid={Boolean(fieldErrors.email)} />
                  </div>
                  <p className={fieldErrors.email ? errorClass : helperClass}>{fieldErrors.email || (editingUser ? 'Email cannot be changed.' : '')}</p>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Phone Number</label>
                  <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-2">
                    <select
                      value={form.phoneCountry || 'IN'}
                      onChange={(e) => setForm((prev) => ({ ...prev, phoneCountry: e.target.value }))}
                      className={`${inputClass} px-2 text-center font-semibold`}
                      aria-label="Phone country"
                    >
                      {phoneCountryOptions.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code}
                        </option>
                      ))}
                    </select>
                    <div className={iconInputWrapClass}>
                      <span className="hidden w-10 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400 sm:flex">
                        <span className="material-symbols-outlined text-xl">phone</span>
                      </span>
                      <span className="flex shrink-0 items-center border-l border-neutral-200 px-2.5 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 sm:px-3">
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
                  <p className={fieldErrors.phone ? errorClass : helperClass}>{fieldErrors.phone || ''}</p>
                </div>
                {!editingUser && (
                  <div className={`${fieldClass} md:col-span-2`}>
                    <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                    <div className={iconInputWrapClass}>
                      <span className="flex w-10 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400">
                        <span className="material-symbols-outlined text-xl">lock</span>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        className={iconInputClass}
                        placeholder="Minimum 6 characters"
                        aria-invalid={Boolean(fieldErrors.password)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="flex w-11 shrink-0 items-center justify-center text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    <p className={fieldErrors.password ? errorClass : helperClass}>{fieldErrors.password || 'Ask user to change password after first login.'}</p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                </span>
                <h3 className="text-sm font-black uppercase tracking-wide text-neutral-900 dark:text-neutral-100">Role & Department</h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                <div className={fieldClass}>
                  <label className={labelClass}>Department</label>
                  <select value={form.department || ''} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className={inputClass}>
                    <option value="">Select department</option>
                    {resolvedDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                  <p className={helperClass}></p>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>System Role <span className="text-red-500">*</span></label>
                  <select required value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} className={inputClass}>
                    <option value="" disabled>
                      Select role
                    </option>
                    {resolvedRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <p className={helperClass}></p>
                </div>
                {showAdminFields ? <div className={fieldClass}>
                  <label className={labelClass}>Account Status</label>
                  <select value={form.accountStatus || 'active'} onChange={(e) => setForm((prev) => ({ ...prev, accountStatus: e.target.value }))} className={inputClass}>
                    {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                  <p className={helperClass}></p>
                </div> : null}
              </div>
            </section>
          </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:grid-cols-2 sm:px-6">
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
