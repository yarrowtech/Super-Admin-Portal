import React, { useEffect, useMemo, useState } from 'react';
import { managerApi } from '../../api/manager';
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
};

const ManagerLeaveManagement = () => {
  const { token } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [managerStatusFilter, setManagerStatusFilter] = useState('pending');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchLeaveRequests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const response = await managerApi.getLeaveRequests(token, {
        page,
        limit: 10,
        status: statusFilter || undefined,
        managerStatus: managerStatusFilter || undefined,
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
  }, [token, page, statusFilter, managerStatusFilter]);

  const handleApprove = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await managerApi.approveLeave(token, leaveId);
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
      await managerApi.rejectLeave(token, leaveId, rejectionReason);
      await fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to reject leave request');
    } finally {
      setActionLoadingId(null);
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

      return {
        ...request,
        employeeName: `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.trim()
          || request.employee?.email
          || 'Employee',
        department: request.employee?.department || '-',
        datesLabel,
        statusClass: statusStyles[request.status] || statusStyles.pending,
        managerStatus,
        managerStatusClass: managerStatusStyles[managerStatus] || managerStatusStyles.pending,
      };
    });
  }, [leaveRequests]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-gray-800 dark:text-white">Leave Approvals</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Review team leave requests before HR approval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Total: <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10">{totalRequests}</span>
            </div>
            <select
              value={managerStatusFilter}
              onChange={(e) => {
                setManagerStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="">All Manager Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Department</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Dates</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Manager</th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading leave requests...
                  </td>
                </tr>
              )}
              {!loading && formattedRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No leave requests found.
                  </td>
                </tr>
              )}
              {!loading &&
                formattedRequests.map((request) => (
                  <tr key={request._id} className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                    <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-100">{request.employeeName}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{request.department}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{request.leaveType}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{request.datesLabel}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${request.statusClass}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${request.managerStatusClass}`}>
                        {request.managerStatus}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {request.status === 'pending' && request.managerStatus === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(request._id)}
                            disabled={actionLoadingId === request._id}
                            className="rounded-md border border-green-500 px-2 py-1 text-xs font-semibold text-green-600 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request._id)}
                            disabled={actionLoadingId === request._id}
                            className="rounded-md border border-red-500 px-2 py-1 text-xs font-semibold text-red-600 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ManagerLeaveManagement;
