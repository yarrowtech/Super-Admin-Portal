import React, { useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QK } from '../../utils/queryKeys';
import StatusBadge from '../common/StatusBadge';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ProgressBar from '../ui/ProgressBar';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import TableSkeleton from '../ui/TableSkeleton';

const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const leaveLegend = [
  { label: 'Today', color: 'bg-primary' },
  { label: 'Approved Leave', color: 'bg-green-500' },
  { label: 'Pending Request', color: 'bg-yellow-400' },
  { label: 'Public Holiday', color: 'bg-blue-500' },
];

const leaveTypeOptions = [
  { value: 'casual', label: 'CL / Casual Leave' },
  { value: 'annual', label: 'PL / Privilege Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'half_day', label: 'Half Day Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'work_from_home', label: 'Work From Home' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusTone = {
  pending: 'warning',
  'manager-approved': 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

const managerStatusTone = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  bypassed: 'neutral',
};

const LeaveManagement = () => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const leaveParams = useMemo(
    () => ({ page, limit: 10, status: statusFilter || undefined }),
    [page, statusFilter]
  );

  const [requestsQuery, balancesQuery] = useQueries({
    queries: [
      { queryKey: QK.hr.leave(leaveParams), queryFn: () => hrApi.getLeaveRequests(token, leaveParams), enabled: Boolean(token) },
      { queryKey: QK.hr.leaveBalances(), queryFn: () => hrApi.getLeaveBalances(token), enabled: Boolean(token) },
    ],
  });

  const leaveRequests = useMemo(() => requestsQuery.data?.data?.leaves || [], [requestsQuery.data]);
  const totalPages = requestsQuery.data?.data?.totalPages || 1;
  const totalRequests = requestsQuery.data?.data?.total || 0;
  const leaveBalances = useMemo(() => balancesQuery.data?.data?.items || [], [balancesQuery.data]);
  const loading = requestsQuery.isLoading;

  const invalidateLeave = () => {
    queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'leaveBalances'] });
  };

  const handleApprove = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await hrApi.approveLeave(leaveId, token);
      toast.success('Leave request approved.');
      invalidateLeave();
    } catch (err) {
      setError(err.message || 'Failed to approve leave request');
      toast.error(err.message || 'Failed to approve leave request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    const rejectionReason = window.prompt('Rejection reason (optional)') || undefined;
    try {
      setActionLoadingId(leaveId);
      await hrApi.rejectLeave(leaveId, { rejectionReason }, token);
      toast.success('Leave request rejected.');
      invalidateLeave();
    } catch (err) {
      setError(err.message || 'Failed to reject leave request');
      toast.error(err.message || 'Failed to reject leave request');
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

  const handleSubmitLeave = async (e) => {
    e?.preventDefault?.();
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
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: '',
      });
      closeLeaveModal();
      toast.success('Leave request submitted.');
      invalidateLeave();
    } catch (err) {
      setLeaveFormError(err.message || 'Failed to submit leave request');
      toast.error(err.message || 'Failed to submit leave request');
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
        : '—';
      const managerStatus = request.managerApprovalStatus || 'pending';
      const fullName = `${request.employee?.firstName || ''} ${request.employee?.lastName || ''}`.trim();
      return {
        ...request,
        employeeName: fullName || request.employee?.email || 'Employee',
        datesLabel,
        managerStatus,
      };
    });
  }, [leaveRequests]);

  const pendingCount = useMemo(
    () => leaveRequests.filter((request) => request.status === 'pending').length,
    [leaveRequests]
  );

  const balanceSummaryCards = useMemo(() => {
    if (!leaveBalances.length) return [];
    const totals = leaveBalances.reduce(
      (acc, item) => {
        acc.remaining += item.remainingLeaveBalance || 0;
        acc.quota += item.yearlyLeaveQuota || 0;
        acc.clRemaining += item.leaveTypeWiseBalance?.casual?.remaining || 0;
        acc.plRemaining += item.leaveTypeWiseBalance?.annual?.remaining || 0;
        acc.sickRemaining += item.leaveTypeWiseBalance?.sick?.remaining || 0;
        return acc;
      },
      { remaining: 0, quota: 0, clRemaining: 0, plRemaining: 0, sickRemaining: 0 }
    );

    return [
      { label: 'Yearly Remaining', summary: `${totals.remaining} / ${totals.quota} days`, percent: totals.quota ? Math.round((totals.remaining / totals.quota) * 100) : 0, bar: 'bg-primary' },
      { label: 'CL Remaining', summary: `${totals.clRemaining} days`, percent: 100, bar: 'bg-green-500' },
      { label: 'PL Remaining', summary: `${totals.plRemaining} days`, percent: 100, bar: 'bg-yellow-500' },
      { label: 'Sick Remaining', summary: `${totals.sickRemaining} days`, percent: 100, bar: 'bg-red-500' },
    ];
  }, [leaveBalances]);

  const monthLabel = useMemo(
    () => calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [calendarDate]
  );

  const leaveHighlights = useMemo(() => {
    const highlightMap = new Map();

    leaveRequests.forEach((request) => {
      if (!request.startDate) return;

      const start = new Date(request.startDate);
      const end = request.endDate ? new Date(request.endDate) : start;
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const normalizedStart = normalizeDate(start);
      const normalizedEnd = normalizeDate(end);
      if (normalizedStart > normalizedEnd) return;

      const status = request.status === 'approved' ? 'approved' : request.status === 'pending' ? 'pending' : null;
      if (!status) return;

      const priority = status === 'approved' ? 2 : 1;
      const className =
        status === 'approved' ? 'bg-green-500 text-white' : 'bg-yellow-400 text-neutral-900 dark:text-neutral-900';

      const cursor = new Date(normalizedStart);
      while (cursor <= normalizedEnd) {
        const key = formatDateKey(cursor);
        const existing = highlightMap.get(key);
        if (!existing || priority >= existing.priority) {
          highlightMap.set(key, { className, priority });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return highlightMap;
  }, [leaveRequests]);

  const calendarDays = useMemo(() => {
    const days = [];
    const startOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const startDayOfWeek = startOfMonth.getDay();
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
    const today = normalizeDate(new Date());

    for (let index = 0; index < totalCells; index += 1) {
      const date = new Date(startOfMonth);
      date.setDate(1 - startDayOfWeek + index);
      const normalizedDate = normalizeDate(date);
      const dateKey = formatDateKey(normalizedDate);
      const highlight = leaveHighlights.get(dateKey);
      const isCurrentMonth = normalizedDate.getMonth() === startOfMonth.getMonth();
      const isToday = normalizedDate.getTime() === today.getTime();

      let pillClass = '';
      if (highlight) {
        pillClass = highlight.className;
      } else if (isToday) {
        pillClass = 'bg-primary text-white';
      }

      days.push({
        key: dateKey,
        label: normalizedDate.getDate(),
        muted: !isCurrentMonth,
        bold: !pillClass && isCurrentMonth,
        pillClass,
      });
    }

    return days;
  }, [calendarDate, leaveHighlights]);

  const handleMonthChange = (direction) => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <span>Total</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-white/10">{totalRequests}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <span>Pending</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">{pendingCount}</span>
          </div>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={statusOptions}
            className="min-h-9 w-36 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<span className="material-symbols-outlined text-base">download</span>}>
            Export Report
          </Button>
          <Button onClick={openLeaveModal} icon={<span className="material-symbols-outlined text-base">add</span>}>
            New Leave Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Leave Calendar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMonthChange(-1)}
                aria-label="Previous month"
                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <p className="w-32 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">{monthLabel}</p>
              <button
                onClick={() => handleMonthChange(1)}
                aria-label="Next month"
                className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => (
              <div
                key={day.key}
                className={`relative py-2 ${day.muted ? 'text-neutral-400 dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-100'}`}
              >
                {day.pillClass ? (
                  <span
                    className={`absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold ${day.pillClass}`}
                  >
                    {day.label}
                  </span>
                ) : (
                  <span className={day.bold ? 'font-semibold text-neutral-800 dark:text-neutral-100' : ''}>{day.label}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            {leaveLegend.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <div className={`size-2.5 rounded-full ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Your Leave Balances</h2>
          <div className="mt-4 flex flex-col gap-4">
            {balanceSummaryCards.map((item) => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <p className="font-medium text-neutral-700 dark:text-neutral-200">{item.label}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{item.summary}</p>
                </div>
                <ProgressBar value={item.percent} colorClass={item.bar} />
              </div>
            ))}
            {!balanceSummaryCards.length && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Employee leave balances will appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="pb-3 text-lg font-bold text-neutral-900 dark:text-neutral-100">Leave Requests</h2>
        {error && <ErrorState description={error} className="mb-4" />}
        {loading ? (
          <TableSkeleton columns={7} rows={5} />
        ) : formattedRequests.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <EmptyState
              icon="event_note"
              title={statusFilter ? 'No leave requests match the current filters' : 'No leave requests found'}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
                  {formattedRequests.map((request) => (
                    <tr key={request._id} className="h-14 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                      <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-100">{request.employeeName}</td>
                      <td className="px-4 py-3 capitalize text-neutral-600 dark:text-neutral-300">{request.leaveType}</td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{request.datesLabel}</td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{request.totalDays || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statusTone[request.status] || 'neutral'} label={request.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={managerStatusTone[request.managerStatus] || 'neutral'} label={request.managerStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                              onClick={() => handleApprove(request._id)}
                              disabled={actionLoadingId === request._id}
                              icon={<span className="material-symbols-outlined text-sm">check</span>}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              onClick={() => handleReject(request._id)}
                              disabled={actionLoadingId === request._id}
                              icon={<span className="material-symbols-outlined text-sm">close</span>}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">No action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-neutral-200 px-1 dark:border-neutral-800">
              <Pagination page={page} totalPages={totalPages} total={totalRequests} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      <Modal
        open={leaveModalOpen}
        onClose={closeLeaveModal}
        title="Request Leave"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeLeaveModal}>
              Cancel
            </Button>
            <Button type="submit" form="leave-request-form" disabled={leaveFormLoading}>
              {leaveFormLoading ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        <form id="leave-request-form" onSubmit={handleSubmitLeave} className="space-y-4">
          {leaveFormError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {leaveFormError}
            </div>
          )}
          <Select
            label="Leave type"
            value={leaveForm.leaveType}
            onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
            options={leaveTypeOptions}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={leaveForm.startDate}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={leaveForm.endDate}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Reason</span>
            <textarea
              rows={3}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveManagement;
