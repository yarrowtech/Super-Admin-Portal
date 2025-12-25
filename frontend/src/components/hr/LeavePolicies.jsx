import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hrApi } from '../../api/hr';
import Button from '../common/Button';

const LeavePolicies = () => {
  const { token } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState({
    leaveType: '',
    annualQuota: '',
    carryForward: false,
    maxCarryForward: '',
    applicableRoles: [],
    minimumNotice: '',
    description: '',
    isActive: true,
  });

  const leaveTypes = ['Sick', 'Casual', 'Earned', 'Maternity', 'Paternity', 'Compensatory'];
  const roles = ['employee', 'manager', 'hr', 'admin'];

  useEffect(() => {
    fetchPolicies();
  }, [token]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await hrApi.getLeavePolicies(token);
      setPolicies(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load leave policies');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        leaveType: policy.leaveType,
        annualQuota: policy.annualQuota,
        carryForward: policy.carryForward,
        maxCarryForward: policy.maxCarryForward || '',
        applicableRoles: policy.applicableRoles || [],
        minimumNotice: policy.minimumNotice,
        description: policy.description,
        isActive: policy.isActive,
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        leaveType: '',
        annualQuota: '',
        carryForward: false,
        maxCarryForward: '',
        applicableRoles: [],
        minimumNotice: '',
        description: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      applicableRoles: prev.applicableRoles.includes(role)
        ? prev.applicableRoles.filter(r => r !== role)
        : [...prev.applicableRoles, role],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const policyData = {
        ...formData,
        annualQuota: parseInt(formData.annualQuota),
        maxCarryForward: formData.maxCarryForward ? parseInt(formData.maxCarryForward) : 0,
        minimumNotice: parseInt(formData.minimumNotice),
      };

      if (editingPolicy) {
        await hrApi.updateLeavePolicy(editingPolicy._id, policyData, token);
      } else {
        await hrApi.createLeavePolicy(policyData, token);
      }

      await fetchPolicies();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save policy');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return;

    try {
      await hrApi.deleteLeavePolicy(id, token);
      await fetchPolicies();
    } catch (err) {
      setError(err.message || 'Failed to delete policy');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-neutral-600 dark:text-neutral-400">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Leave Policies</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Manage leave types and policies</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Policy
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">error</span>
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {policies.length > 0 ? (
          policies.map((policy) => (
            <div
              key={policy._id}
              className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            >
              {/* Status Badge */}
              <div className="absolute right-3 top-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    policy.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}
                >
                  {policy.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Icon */}
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <span className="material-symbols-outlined text-2xl">event_note</span>
              </div>

              {/* Content */}
              <h3 className="mb-2 text-lg font-bold capitalize text-neutral-800 dark:text-neutral-100">
                {policy.leaveType}
              </h3>

              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-sm text-neutral-600 dark:text-neutral-400">event</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {policy.annualQuota} days/year
                  </span>
                </div>

                {policy.carryForward && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">
                      autorenew
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Carry forward: {policy.maxCarryForward} days
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-sm text-neutral-600 dark:text-neutral-400">
                    schedule
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    Notice: {policy.minimumNotice} days
                  </span>
                </div>
              </div>

              <p className="mb-4 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {policy.description}
              </p>

              {/* Applicable Roles */}
              <div className="mb-4 flex flex-wrap gap-1">
                {policy.applicableRoles && policy.applicableRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold capitalize text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(policy)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(policy._id)}
                  className="flex items-center justify-center rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 p-12 dark:border-neutral-800">
            <span className="material-symbols-outlined text-6xl text-neutral-300 dark:text-neutral-600">policy</span>
            <p className="mt-4 text-lg font-semibold text-neutral-600 dark:text-neutral-400">No leave policies found</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">Create your first leave policy to get started</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                {editingPolicy ? 'Edit Leave Policy' : 'Create Leave Policy'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Leave Type */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Leave Type *
                  </label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="">Select type</option>
                    {leaveTypes.map((type) => (
                      <option key={type} value={type.toLowerCase()}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Annual Quota */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Annual Quota (days) *
                  </label>
                  <input
                    type="number"
                    name="annualQuota"
                    value={formData.annualQuota}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                {/* Minimum Notice */}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Minimum Notice (days) *
                  </label>
                  <input
                    type="number"
                    name="minimumNotice"
                    value={formData.minimumNotice}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                {/* Carry Forward Checkbox */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      name="carryForward"
                      checked={formData.carryForward}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    Allow Carry Forward
                  </label>
                </div>

                {/* Max Carry Forward */}
                {formData.carryForward && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      Max Carry Forward (days)
                    </label>
                    <input
                      type="number"
                      name="maxCarryForward"
                      value={formData.maxCarryForward}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                )}

                {/* Active Status */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    Active Policy
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Enter policy description..."
                />
              </div>

              {/* Applicable Roles */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Applicable Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleToggle(role)}
                      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize transition-all ${
                        formData.applicableRoles.includes(role)
                          ? 'bg-primary text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePolicies;
