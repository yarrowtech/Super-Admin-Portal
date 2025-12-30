import React, { useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

const managerStatusStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  bypassed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
};
const leaveTypeOptions = [
  { value: 'sick', label: 'Sick' },
  { value: 'casual', label: 'Casual' },
  { value: 'annual', label: 'Annual' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
];

const leaveBalances = [
  { label: 'Vacation', summary: '14 / 20 days', percent: 70, bar: 'bg-primary' },
  { label: 'Sick Leave', summary: '3 / 10 days', percent: 30, bar: 'bg-yellow-500' },
  { label: 'Personal Leave', summary: '2 / 5 days', percent: 40, bar: 'bg-green-500' },
  { label: 'Unpaid Leave', summary: '1 day used', percent: 10, bar: 'bg-red-500' },
];

const EmployeeLeaveManagement = () => {
  const { token } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);

  const fetchLeaveRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const response = await employeeApi.getLeaves(token, {
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      const payload = response?.data || {};
      setLeaveRequests(payload.leaves || []);
      setTotalPages(payload.totalPages || 1);
      setTotalRequests(payload.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [token, page, statusFilter]);

  const handleCancel = async (leaveId) => {
    if (!token) return;
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      setActionLoadingId(leaveId);
      await employeeApi.cancelLeave(token, leaveId);
      await fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to cancel leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openLeaveModal = () => {
    setLeaveFormError('');
    setLeaveModalOpen(true);
  };

  const closeLeaveModal = () => {
    setLeaveFormError('');
    setLeaveModalOpen(false);
  };

  const handleSubmitLeave = async () => {
    if (!token) return;
    setLeaveFormError('');
    setLeaveFormLoading(true);

    try {
      const start = leaveForm.startDate ? new Date(leaveForm.startDate) : null;
      const end = leaveForm.endDate ? new Date(leaveForm.endDate) : null;

      if (!start || !end || !leaveForm.reason.trim()) {
        setLeaveFormError('Start date, end date, and reason are required.');
        setLeaveFormLoading(false);
        return;
      }

      const diffMs = end.getTime() - start.getTime();
      const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
      if (totalDays <= 0) {
        setLeaveFormError('End date must be after start date.');
        setLeaveFormLoading(false);
        return;
      }

      await employeeApi.requestLeave(token, {
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        totalDays,
        reason: leaveForm.reason.trim(),
      });

      setLeaveForm({
        leaveType: 'sick',
        startDate: '',
        endDate: '',
        reason: '',
      });
      closeLeaveModal();
      fetchLeaveRequests();
    } catch (err) {
      setLeaveFormError(err.message || 'Failed to submit leave request');
    } finally {
      setLeaveFormLoading(false);
    }
  };

  const formattedRequests = useMemo(() => {
    return leaveRequests.map((request) => {
      const start = request.startDate ? new Date(request.startDate) : null;
      const end = request.endDate ? new Date(request.endDate) : null;
      const datesLabel = start
        ? `${start.toLocaleDateString()}${end ? ` - ${end.toLocaleDateString()}` : ''}`
        : '-';
      return {
        ...request,
        datesLabel,
        statusClass: statusStyles[request.status] || statusStyles.pending,
        managerStatus: request.managerApprovalStatus || 'pending',
        managerStatusClass: managerStatusStyles[request.managerApprovalStatus] || managerStatusStyles.pending,
      };
    });
  }, [leaveRequests]);

  const pendingCount = useMemo(
    () => leaveRequests.filter((request) => request.status === 'pending').length,
    [leaveRequests]
  );

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Leave Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Submit leave requests and monitor approvals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <span>Total</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-white/10">{totalRequests}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <span>Pending</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                {pendingCount}
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={openLeaveModal}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Leave Request
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Leave Requests</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Type</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Dates</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Days</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Manager</th>
                    <th className="p-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        Loading leave requests...
                      </td>
                    </tr>
                  )}
                  {!loading && formattedRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    formattedRequests.map((request) => (
                      <tr key={request._id} className="border-b border-slate-200 dark:border-slate-800 last:border-b-0">
                        <td className="p-3 text-sm text-slate-700 dark:text-slate-300 capitalize">{request.leaveType}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{request.datesLabel}</td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{request.totalDays || '-'}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${request.statusClass}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${request.managerStatusClass}`}>
                            {request.managerStatus}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {request.status === 'pending' ? (
                            <button
                              onClick={() => handleCancel(request._id)}
                              disabled={actionLoadingId === request._id}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-sm">cancel</span>
                              Cancel
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">No action</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <p>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Leave Balances</h2>
            <div className="mt-4 flex flex-col gap-4">
              {leaveBalances.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <div className="flex justify-between text-sm">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                    <p className="text-slate-500 dark:text-slate-400">{item.summary}</p>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className={`h-2 rounded-full ${item.bar}`} style={{ width: `${item.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Request leave</h3>
              <button
                onClick={closeLeaveModal}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {leaveFormError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {leaveFormError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Leave type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {leaveTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">End date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={closeLeaveModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitLeave}
                disabled={leaveFormLoading}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {leaveFormLoading ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default EmployeeLeaveManagement;
