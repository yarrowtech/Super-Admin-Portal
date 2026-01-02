import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hrApi } from '../../api/hr';

const statusLabels = {
  present: { label: 'On Time', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' },
  late: { label: 'Late', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
  'half-day': { label: 'Half Day', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' },
  'on-leave': { label: 'On Leave', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' },
  absent: { label: 'Absent', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' },
};

const defaultFilters = {
  startDate: '',
  endDate: '',
  status: '',
  search: '',
};

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  if (withTime) {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString();
};

const formatTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
};

const formatGroupLabel = (key) => {
  const date = new Date(key);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildDateString = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const Attendance = () => {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchAttendance = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await hrApi.getAttendance(token, {
        page,
        limit: 25,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      const payload = res?.data || {};
      setRecords(payload.attendance || []);
      setTotalPages(payload.totalPages || 1);
      setTotalRecords(payload.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, filters.status, filters.startDate, filters.endDate]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field !== 'search') {
      setPage(1);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const term = filters.search.toLowerCase();
    return records.filter((record) => {
      const name = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.toLowerCase();
      return name.includes(term) || record.employee?.email?.toLowerCase().includes(term);
    });
  }, [records, filters.search]);

  const groupedRecords = useMemo(() => {
    if (!filteredRecords.length) return [];
    const todayKey = normalizeDateKey(new Date());
    const yesterdayKey = todayKey ? todayKey - 24 * 60 * 60 * 1000 : null;
    const today = [];
    const yesterday = [];
    const othersMap = new Map();

    filteredRecords.forEach((record) => {
      const key = normalizeDateKey(record.date);
      if (!key) return;
      if (todayKey && key === todayKey) {
        today.push(record);
      } else if (yesterdayKey && key === yesterdayKey) {
        yesterday.push(record);
      } else {
        if (!othersMap.has(key)) {
          othersMap.set(key, []);
        }
        othersMap.get(key).push(record);
      }
    });

    const groups = [];
    if (today.length) {
      groups.push({ label: 'Today', key: 'today', records: today });
    }
    if (yesterday.length) {
      groups.push({ label: 'Yesterday', key: 'yesterday', records: yesterday });
    }
    const otherGroups = Array.from(othersMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([key, list]) => ({
        label: formatGroupLabel(key),
        key: key.toString(),
        records: list,
      }));
    return [...groups, ...otherGroups];
  }, [filteredRecords]);

  const analytics = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((item) => item.status === 'present').length;
    const late = filteredRecords.filter((item) => item.status === 'late').length;
    const leave = filteredRecords.filter((item) => item.status === 'on-leave').length;
    const absent = filteredRecords.filter((item) => item.status === 'absent').length;
    const avgHours =
      total > 0
        ? (
            filteredRecords.reduce((sum, item) => sum + (item.workHours || 0), 0) / total
          ).toFixed(1)
        : '0';
    return [
      {
        label: 'Checked In',
        value: present,
        change: `of ${total}`,
        changeClass: 'text-emerald-600 dark:text-emerald-300',
      },
      {
        label: 'Late Arrivals',
        value: late,
        change: `${total ? Math.round((late / total) * 100) : 0}% of records`,
        changeClass: 'text-amber-600 dark:text-amber-300',
      },
      {
        label: 'On Leave / Absent',
        value: leave + absent,
        change: `${leave} leave · ${absent} absent`,
        changeClass: 'text-slate-600 dark:text-slate-300',
      },
      {
        label: 'Avg. Hours Worked',
        value: `${avgHours}h`,
        change: 'based on recorded work hours',
        changeClass: 'text-indigo-600 dark:text-indigo-300',
      },
    ];
  }, [filteredRecords]);

  const handleExport = () => {
    if (!filteredRecords.length) return;
    const rows = [
      ['Employee Name', 'Email', 'Department', 'Date', 'Check In', 'Check Out', 'Status', 'Work Hours', 'Location', 'Notes'],
      ...filteredRecords.map((record) => [
        `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || record.employee?.email || '-',
        record.employee?.email || '-',
        record.employee?.department || '-',
        formatDate(record.date),
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        record.status || '-',
        record.workHours ?? '-',
        record.location || '-',
        record.notes?.replace(/\n/g, ' ') || '',
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Time &amp; Attendance
            </h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              Review employee check-in history, analyze attendance trends, and export detailed logs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={!filteredRecords.length}
              className="flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {analytics.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/60"
            >
              <p className="text-base font-medium text-neutral-600 dark:text-neutral-400">{card.label}</p>
              <p className="text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
                {card.value}
              </p>
              <p className={`text-base font-medium ${card.changeClass}`}>{card.change}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-60">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                  search
                </span>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search employees..."
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="">All Status</option>
                <option value="present">On Time</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
                <option value="on-leave">On Leave</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <span className="text-neutral-500 dark:text-neutral-400">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
              <button
                type="button"
                onClick={() => {
                  const today = buildDateString(new Date());
                  setFilters((prev) => ({ ...prev, startDate: today, endDate: today }));
                  setPage(1);
                }}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const formatted = buildDateString(yesterday);
                  setFilters((prev) => ({ ...prev, startDate: formatted, endDate: formatted }));
                  setPage(1);
                }}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Yesterday
              </button>
              {(filters.startDate || filters.endDate || filters.status) && (
                <button
                  onClick={() => setFilters({ ...defaultFilters })}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Check In</th>
                  <th className="p-3">Check Out</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                      Loading attendance records...
                    </td>
                  </tr>
                )}
                {!loading && groupedRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  groupedRecords.map((group) => (
                    <React.Fragment key={group.key}>
                      <tr className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                        <td colSpan={8} className="p-2 pl-3">{group.label}</td>
                      </tr>
                      {group.records.map((record) => {
                        const employeeName =
                          `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() ||
                          record.employee?.email ||
                          'Employee';
                        const statusMeta = statusLabels[record.status] || statusLabels.present;
                        const locationLabel = record.location === 'remote' ? 'Work From Home' : 'In Office';
                        const locationBadgeClass =
                          record.location === 'remote'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
                        return (
                          <tr key={record._id} className="border-b border-neutral-100 text-sm dark:border-neutral-800">
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{employeeName}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{record.employee?.email}</span>
                              </div>
                            </td>
                            <td className="p-3 text-neutral-600 dark:text-neutral-300">{formatDate(record.date)}</td>
                            <td className="p-3 text-neutral-600 dark:text-neutral-300">{formatTime(record.checkIn)}</td>
                            <td className="p-3 text-neutral-600 dark:text-neutral-300">{formatTime(record.checkOut)}</td>
                            <td className="p-3 text-neutral-600 dark:text-neutral-300">
                              {record.workHours ? `${record.workHours}h` : '-'}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                                  {statusMeta.label}
                                </span>
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${locationBadgeClass}`}>
                                  {locationLabel}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-neutral-600 dark:text-neutral-300">{locationLabel}</td>
                            <td className="p-3 text-neutral-500 dark:text-neutral-400">{record.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <p>
              Showing {filteredRecords.length} of {totalRecords} records
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-full border border-neutral-200 px-3 py-1 font-semibold text-neutral-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
              >
                Previous
              </button>
              <span className="text-sm font-semibold">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-neutral-200 px-3 py-1 font-semibold text-neutral-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Attendance Details</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Use the filters above to drill down into a single employee or specific timeframe. Export the current view to
            CSV for payroll or compliance audits.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Current Filters
              </p>
              <p>Status: {filters.status || 'All'}</p>
              <p>From: {filters.startDate || 'Any'} </p>
              <p>To: {filters.endDate || 'Any'}</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                CSV Export
              </p>
              <p className="text-neutral-500 dark:text-neutral-400">Exports current results with all visible columns.</p>
              <p className="text-xs text-neutral-400">Last export ready instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Attendance;
