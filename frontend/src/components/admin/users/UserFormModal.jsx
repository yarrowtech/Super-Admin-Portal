import React from 'react';
import Button from '../../common/Button';

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

const UserFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  editingUser,
  formError,
  formTouched,
  saving,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {editingUser ? 'Update user information' : 'Add a new user to the system'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {formError && formTouched && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">error</span>
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">{formError}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="flex items-stretch rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                <span className="flex items-center justify-center pl-4 text-neutral-500 dark:text-neutral-400">
                  <span className="material-symbols-outlined text-xl">email</span>
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-0"
                  placeholder="user@example.com"
                  disabled={editingUser}
                />
              </div>
              {editingUser && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Email cannot be changed after user creation
                </p>
              )}
            </div>

            {/* Password */}
            {!editingUser && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="flex items-stretch rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                  <span className="flex items-center justify-center pl-4 text-neutral-500 dark:text-neutral-400">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </span>
                  <input
                    type="password"
                    required={!editingUser}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-0"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Must be at least 6 characters long
                </p>
              </div>
            )}

            {/* Role & Department */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role} className="capitalize">
                      {role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Department
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Engineering"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Phone Number
              </label>
              <div className="flex items-stretch rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                <span className="flex items-center justify-center pl-4 text-neutral-500 dark:text-neutral-400">
                  <span className="material-symbols-outlined text-xl">phone</span>
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-0"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={saving}
              disabled={saving}
            >
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
