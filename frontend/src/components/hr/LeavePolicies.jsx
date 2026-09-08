import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { hrApi } from '../../services/hr';
import { QK } from '../../utils/queryKeys';
import StatusBadge from '../common/StatusBadge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import CardSkeleton from '../ui/CardSkeleton';

// The policy model is one governing record per calendar year (CL/PL/Sick day
// quotas + accrual rules) — NOT a per-leave-type list. See
// backend/models/hr/LeavePolicy.js and services/leaveManagement.service.js,
// which is what actually consumes these fields for balance calculations.
const defaultForm = {
  year: new Date().getFullYear(),
  clDays: 12,
  plDays: 12,
  sickDays: 6,
  yearlyPaidLeaveLimit: 30,
  plCarryForwardLimit: 12,
  excludeWeekends: true,
  excludeHolidays: false,
  sandwichRuleEnabled: false,
  active: true,
  notes: '',
};

const RULE_FLAGS = [
  { key: 'excludeWeekends', label: 'Excludes weekends' },
  { key: 'excludeHolidays', label: 'Excludes holidays' },
  { key: 'sandwichRuleEnabled', label: 'Sandwich rule' },
];

const LeavePolicies = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const policiesQuery = useQuery({
    queryKey: QK.hr.leavePolicies(),
    queryFn: () => hrApi.getLeavePolicies(token),
    enabled: Boolean(token),
  });
  const policies = policiesQuery.data?.data || [];
  const loading = policiesQuery.isLoading;
  const refetchPolicies = () => queryClient.invalidateQueries({ queryKey: ['hr', 'leavePolicies'] });

  const handleOpenModal = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        year: policy.year,
        clDays: policy.clDays,
        plDays: policy.plDays,
        sickDays: policy.sickDays,
        yearlyPaidLeaveLimit: policy.yearlyPaidLeaveLimit,
        plCarryForwardLimit: policy.plCarryForwardLimit,
        excludeWeekends: Boolean(policy.excludeWeekends),
        excludeHolidays: Boolean(policy.excludeHolidays),
        sandwichRuleEnabled: Boolean(policy.sandwichRuleEnabled),
        active: policy.active !== false,
        notes: policy.notes || '',
      });
    } else {
      setEditingPolicy(null);
      setFormData(defaultForm);
    }
    setError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        year: parseInt(formData.year, 10),
        clDays: parseInt(formData.clDays, 10) || 0,
        plDays: parseInt(formData.plDays, 10) || 0,
        sickDays: parseInt(formData.sickDays, 10) || 0,
        yearlyPaidLeaveLimit: parseInt(formData.yearlyPaidLeaveLimit, 10) || 0,
        plCarryForwardLimit: parseInt(formData.plCarryForwardLimit, 10) || 0,
        excludeWeekends: formData.excludeWeekends,
        excludeHolidays: formData.excludeHolidays,
        sandwichRuleEnabled: formData.sandwichRuleEnabled,
        active: formData.active,
        notes: formData.notes,
      };

      if (editingPolicy) {
        await hrApi.updateLeavePolicy(editingPolicy._id, payload, token);
      } else {
        await hrApi.createLeavePolicy(payload, token);
      }

      refetchPolicies();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave policy?')) return;

    try {
      await hrApi.deleteLeavePolicy(id, token);
      refetchPolicies();
    } catch (err) {
      setError(err.message || 'Failed to delete policy');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Leave Policies</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure company-wide leave quotas by year</p>
        </div>
        <Button onClick={() => handleOpenModal()} icon={<span className="material-symbols-outlined text-base">add</span>}>
          Add Policy
        </Button>
      </div>

      {error && <ErrorState description={error} />}

      {loading ? (
        <CardSkeleton count={3} />
      ) : policies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <div
              key={policy._id}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Policy Year</p>
                  <p className="text-xl font-black text-neutral-900 dark:text-neutral-100">{policy.year}</p>
                </div>
                <StatusBadge tone={policy.active ? 'success' : 'neutral'} label={policy.active ? 'Active' : 'Inactive'} />
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 p-3 text-center dark:bg-neutral-800/50">
                <div>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{policy.clDays}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">CL days</p>
                </div>
                <div>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{policy.plDays}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">PL days</p>
                </div>
                <div>
                  <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{policy.sickDays}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Sick days</p>
                </div>
              </div>

              <div className="mb-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Yearly paid leave limit</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{policy.yearlyPaidLeaveLimit} days</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span>PL carry-forward limit</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{policy.plCarryForwardLimit} days</span>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {RULE_FLAGS.filter((flag) => policy[flag.key]).map((flag) => (
                  <span
                    key={flag.key}
                    className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {flag.label}
                  </span>
                ))}
              </div>

              {policy.notes && <p className="mb-3 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{policy.notes}</p>}

              <div className="mt-auto flex gap-2 pt-1">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleOpenModal(policy)} icon={<span className="material-symbols-outlined text-[15px]">edit</span>}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  onClick={() => handleDelete(policy._id)}
                  aria-label={`Delete ${policy.year} policy`}
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="policy" title="No leave policies configured" description="Add a policy for the current year to start calculating leave balances." />
      )}

      <Modal
        open={showModal}
        onClose={handleCloseModal}
        title={editingPolicy ? `Edit ${editingPolicy.year} Leave Policy` : 'Add Leave Policy'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" form="leave-policy-form" disabled={saving}>
              {saving ? 'Saving…' : editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        }
      >
        <form id="leave-policy-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Policy Year *"
            type="number"
            name="year"
            value={formData.year}
            onChange={handleChange}
            required
            disabled={Boolean(editingPolicy)}
            helperText={editingPolicy ? 'The year a policy applies to cannot be changed once created.' : undefined}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="CL Days *" type="number" name="clDays" value={formData.clDays} onChange={handleChange} required min="0" />
            <Input label="PL Days *" type="number" name="plDays" value={formData.plDays} onChange={handleChange} required min="0" />
            <Input label="Sick Days *" type="number" name="sickDays" value={formData.sickDays} onChange={handleChange} required min="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Yearly Paid Leave Limit *" type="number" name="yearlyPaidLeaveLimit" value={formData.yearlyPaidLeaveLimit} onChange={handleChange} required min="0" />
            <Input label="PL Carry-Forward Limit" type="number" name="plCarryForwardLimit" value={formData.plCarryForwardLimit} onChange={handleChange} min="0" />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Rules</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" name="excludeWeekends" checked={formData.excludeWeekends} onChange={handleChange} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20" />
                Exclude weekends from leave-day counts
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" name="excludeHolidays" checked={formData.excludeHolidays} onChange={handleChange} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20" />
                Exclude public holidays from leave-day counts
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" name="sandwichRuleEnabled" checked={formData.sandwichRuleEnabled} onChange={handleChange} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20" />
                Enable sandwich rule
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20" />
                Active policy
              </label>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Optional context for this policy…"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeavePolicies;
