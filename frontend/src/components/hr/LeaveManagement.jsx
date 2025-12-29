import React, { useEffect, useMemo, useState } from 'react';
import { hrApi } from '../../api/hr';
import { useAuth } from '../../context/AuthContext';

const calendarDays = [
  { label: '26', muted: true },
  { label: '27', muted: true },
  { label: '28', muted: true },
  { label: '29', muted: true },
  { label: '30', muted: true },
  { label: '31', muted: true },
  { label: '1' },
  { label: '2' },
  { label: '3' },
  { label: '4', pillClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200', bold: true },
  { label: '5' },
  { label: '6' },
  { label: '7' },
  { label: '8' },
  { label: '9' },
  { label: '10', pillClass: 'bg-primary text-white', bold: true },
  { label: '11' },
  { label: '12', pillClass: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', bold: true },
  { label: '13' },
  { label: '14' },
  { label: '15' },
  { label: '16' },
  { label: '17' },
  { label: '18' },
  { label: '19' },
  { label: '20' },
  { label: '21' },
  { label: '22' },
  { label: '23' },
  { label: '24' },
  { label: '25' },
  { label: '26' },
  { label: '27', pillClass: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200', bold: true },
  { label: '28' },
  { label: '29' },
  { label: '30' },
  { label: '1', muted: true },
  { label: '2', muted: true },
  { label: '3', muted: true },
  { label: '4', muted: true },
  { label: '5', muted: true },
  { label: '6', muted: true },
];

const leaveLegend = [
  { label: 'Today', color: 'bg-primary' },
  { label: 'Approved Leave', color: 'bg-green-500' },
  { label: 'Pending Request', color: 'bg-yellow-500' },
  { label: 'Public Holiday', color: 'bg-blue-500' },
];

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

const statusStyles = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  approved: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  rejected: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  cancelled: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
};

const LeaveManagement = () => {
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
      const response = await hrApi.getLeaveRequests(token, {
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

  const handleApprove = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await hrApi.approveLeave(leaveId, token);
      await fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to approve leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    const rejectionReason = window.prompt('Rejection reason (optional)') || undefined;
    try {
      setActionLoadingId(leaveId);
      await hrApi.rejectLeave(leaveId, { rejectionReason }, token);
      await fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to reject leave request');
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

      await hrApi.requestLeave(
        {
          leaveType: leaveForm.leaveType,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          totalDays,
          reason: leaveForm.reason.trim(),
        },
        token
      );

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
      const startDate = request.startDate ? new Date(request.startDate) : null;
      const endDate = request.endDate ? new Date(request.endDate) : null;
      const datesLabel = startDate
        ? `${startDate.toLocaleDateString()}${endDate ? ` - ${endDate.toLocaleDateString()}` : ''}`
        : '-';
      const managerStatus = request.managerApprovalStatus || 'pending';
      const fullName = `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.trim();
      return {
        ...request,
        employeeName: fullName || request.employee?.email || 'Employee',
        datesLabel,
        managerStatus,
        statusClass: statusStyles[request.status] || statusStyles.pending,
      };
    });
  }, [leaveRequests]);

  const pendingCount = useMemo(
    () => leaveRequests.filter((request) => request.status === 'pending').length,
    [leaveRequests]
  );

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex min-w-72 flex-col gap-2">
            <p className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Leave Management
            </p>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              Track, manage, and approve employee leave requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              <span>Total</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-white/10">
                {totalRequests}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              <span>Pending</span>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                {pendingCount}
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
              <span className="material-symbols-outlined">download</span>
              <span className="truncate">Export Report</span>
            </button>
            <button
              onClick={openLeaveModal}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
            >
              <span className="material-symbols-outlined">add</span>
              <span className="truncate">New Leave Request</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Leave Calendar</h2>
              <div className="flex items-center gap-2">
                <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700">
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">June 2024</p>
                <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700">
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="font-medium text-neutral-600 dark:text-neutral-400">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => (
                <div
                  key={`${day.label}-${index}`}
                  className={`relative py-2 ${day.muted ? 'text-neutral-400 dark:text-neutral-600' : ''}`}
                >
                  {day.pillClass ? (
                    <span
                      className={`absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold ${day.pillClass} ${day.bold ? '' : ''}`}
                    >
                      {day.label}
                    </span>
                  ) : (
                    <span className={`${day.bold ? 'font-semibold text-neutral-800 dark:text-neutral-100' : ''}`}>
                      {day.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              {leaveLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className={`size-3 rounded-full ${item.color}`}></div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Your Leave Balances</h2>
            <div className="mt-4 flex flex-col gap-4">
              {leaveBalances.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <div className="flex justify-between text-sm">
                    <p className="font-medium text-neutral-800 dark:text-neutral-100">{item.label}</p>
                    <p className="text-neutral-600 dark:text-neutral-400">{item.summary}</p>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div className={`h-2 rounded-full ${item.bar}`} style={{ width: `${item.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 className="pb-3 pt-8 text-[22px] font-bold leading-tight tracking-[-0.015em] text-neutral-800 dark:text-neutral-100">
          Leave Requests
        </h2>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Employee</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Leave Type</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Dates</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Days</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Manager</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Loading leave requests...
                  </td>
                </tr>
              )}
              {!loading && formattedRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    No leave requests found.
                  </td>
                </tr>
              )}
              {!loading &&
                formattedRequests.map((request) => (
                  <tr key={request._id} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                    <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">{request.employeeName}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400 capitalize">{request.leaveType}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{request.datesLabel}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{request.totalDays || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${request.statusClass}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {request.managerStatus}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-primary">
                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(request._id)}
                            disabled={actionLoadingId === request._id || request.managerStatus !== 'approved'}
                            className="flex h-8 items-center justify-center gap-1 rounded-md border border-green-500 px-2 text-xs text-green-500 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-900/20"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            disabled={actionLoadingId === request._id}
                            className="flex h-8 items-center justify-center gap-1 rounded-md border border-red-500 px-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">No action</span>
                      )}
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

      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Request leave</h3>
              <button
                onClick={closeLeaveModal}
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Leave type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
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
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Start date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">End date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Reason</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={closeLeaveModal}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
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

export default LeaveManagement;
