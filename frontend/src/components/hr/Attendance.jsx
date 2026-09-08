import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hrApi } from '../../services/hr';
import ExportModal from '../common/ExportModal';
import FilterToolbar from '../common/FilterToolbar';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import CardSkeleton from '../ui/CardSkeleton';
import TableSkeleton from '../ui/TableSkeleton';

const statusMeta = {
  present: { label: 'On Time', tone: 'success' },
  late: { label: 'Late', tone: 'warning' },
  'half-day': { label: 'Half Day', tone: 'info' },
  'on-leave': { label: 'On Leave', tone: 'info' },
  absent: { label: 'Absent', tone: 'danger' },
};

const defaultFilters = {
  startDate: '',
  endDate: '',
  status: '',
  employee: '',
  search: '',
};

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'present', label: 'On Time' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'absent', label: 'Absent' },
];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

const formatTime = (value) => {
  if (!value) return '—';
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
  const date = new Date(Number(key));
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
};

const buildDateString = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const Attendance = () => {
  const { token } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [employeeOptions, setEmployeeOptions] = useState([]);

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
        employee: filters.employee || undefined,
      });
      const payload = res?.data || {};
      setRecords(payload.attendance || []);
      setTotalPages(payload.totalPages || 1);
      setTotalRecords(payload.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load attendance');
      toast.error(err.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, filters.status, filters.startDate, filters.endDate, filters.employee]);

  useEffect(() => {
    if (!token) return;
    hrApi.getEmployees(token, { limit: 500 })
      .then((res) => {
        const list = res?.data?.employees || res?.data?.users || (Array.isArray(res?.data) ? res.data : []);
        setEmployeeOptions(list);
      })
      .catch(() => setEmployeeOptions([]));
  }, [token]);

  useEffect(() => {
    setSelectedRecordIds([]);
  }, [records, filters.search]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field !== 'search') {
      setPage(1);
    }
  };

  const employeeSelectOptions = useMemo(
    () => [
      { value: '', label: 'All Employees' },
      ...employeeOptions.map((employee) => ({
        value: employee._id || employee.id,
        label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email,
      })),
    ],
    [employeeOptions]
  );

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
        ? (filteredRecords.reduce((sum, item) => sum + (item.workHours || 0), 0) / total).toFixed(1)
        : '0';
    return [
      { label: 'Checked In', value: present, context: `of ${total} employees`, icon: 'how_to_reg', tone: 'success' },
      {
        label: 'Late Arrivals',
        value: late,
        context: `${total ? Math.round((late / total) * 100) : 0}% of records`,
        icon: 'schedule',
        tone: 'warning',
      },
      {
        label: 'On Leave / Absent',
        value: leave + absent,
        context: `${leave} leave · ${absent} absent`,
        icon: 'event_busy',
        tone: 'neutral',
      },
      { label: 'Avg. Hours Worked', value: `${avgHours}h`, context: 'Based on recorded hours', icon: 'timer', tone: 'info' },
    ];
  }, [filteredRecords]);

  const toggleSelectedRecord = (recordId) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  const allVisibleSelected =
    filteredRecords.length > 0 && filteredRecords.every((record) => selectedRecordIds.includes(record._id));

  const handleExport = async (scope) => {
    if (!token) return;
    try {
      setExporting(true);
      const { blob, fileName } = await hrApi.exportAttendanceCsv({
        token,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        selectedIds: scope === 'selected' ? selectedRecordIds : [],
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(
        scope === 'selected' ? `Exported ${selectedRecordIds.length} selected attendance rows.` : 'Attendance CSV exported successfully.'
      );
      setIsExportModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to export attendance');
      toast.error(err.message || 'Failed to export attendance.');
    } finally {
      setExporting(false);
    }
  };

  const loadExportHistory = async () => {
    const response = await hrApi.getAttendanceExportHistory(token, { page: 1, limit: 5 });
    return response?.data?.items || [];
  };

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.status) {
      chips.push({
        key: 'status',
        label: statusOptions.find((o) => o.value === filters.status)?.label || filters.status,
        onRemove: () => handleFilterChange('status', ''),
      });
    }
    if (filters.employee) {
      chips.push({
        key: 'employee',
        label: employeeSelectOptions.find((o) => o.value === filters.employee)?.label || 'Employee',
        onRemove: () => handleFilterChange('employee', ''),
      });
    }
    if (filters.startDate || filters.endDate) {
      chips.push({
        key: 'dates',
        label: `${filters.startDate || 'Any'} → ${filters.endDate || 'Any'}`,
        onRemove: () => setFilters((prev) => ({ ...prev, startDate: '', endDate: '' })),
      });
    }
    return chips;
  }, [filters, employeeSelectOptions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Time &amp; Attendance</h2>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            Review employee check-in history, attendance trends and detailed logs.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setIsExportModalOpen(true)}
          disabled={!filteredRecords.length}
          icon={<span className="material-symbols-outlined text-base">download</span>}
        >
          {selectedRecordIds.length > 0 ? `Export Selected (${selectedRecordIds.length})` : 'Export CSV'}
        </Button>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {analytics.map((card) => (
            <KPICard key={card.label} title={card.label} value={card.value} context={card.context} icon={card.icon} tone={card.tone} priority="secondary" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <FilterToolbar
          search={{ value: filters.search, onChange: (v) => handleFilterChange('search', v), placeholder: 'Search employees…' }}
          primaryFilters={[
            { key: 'status', label: 'Status', value: filters.status, onChange: (v) => handleFilterChange('status', v), options: statusOptions, width: 'w-36' },
            { key: 'employee', label: 'Employee', value: filters.employee, onChange: (v) => handleFilterChange('employee', v), options: employeeSelectOptions, width: 'w-44' },
          ]}
          activeChips={activeChips}
          onClearAll={() => setFilters({ ...defaultFilters })}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <Input
            type="date"
            aria-label="Start date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="min-h-10 w-40"
          />
          <span className="text-sm text-neutral-400">to</span>
          <Input
            type="date"
            aria-label="End date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="min-h-10 w-40"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = buildDateString(new Date());
              setFilters((prev) => ({ ...prev, startDate: today, endDate: today }));
              setPage(1);
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const formatted = buildDateString(yesterday);
              setFilters((prev) => ({ ...prev, startDate: formatted, endDate: formatted }));
              setPage(1);
            }}
          >
            Yesterday
          </Button>
        </div>
      </div>

      {error && <ErrorState description={error} onRetry={fetchAttendance} />}

      {loading ? (
        <TableSkeleton columns={8} rows={6} />
      ) : groupedRecords.length === 0 ? (
        <EmptyState icon="calendar_month" title="No attendance records found" description="No records match the selected filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-215 text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => {
                        if (allVisibleSelected) {
                          setSelectedRecordIds([]);
                          return;
                        }
                        setSelectedRecordIds(filteredRecords.map((record) => record._id).filter(Boolean));
                      }}
                      aria-label="Select all rows"
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Check In</th>
                  <th className="px-4 py-3">Check Out</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
                {groupedRecords.map((group) => (
                  <React.Fragment key={group.key}>
                    <tr className="bg-neutral-50 dark:bg-neutral-900/60">
                      <td colSpan={9} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                        {group.label}
                      </td>
                    </tr>
                    {group.records.map((record) => {
                      const employeeName =
                        `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() ||
                        record.employee?.email ||
                        'Employee';
                      const meta = statusMeta[record.status] || statusMeta.present;
                      const isRemote = record.location === 'remote';
                      const isSelected = selectedRecordIds.includes(record._id);
                      return (
                        <tr
                          key={record._id}
                          className={`h-14 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${isSelected ? 'bg-(--portal-accent-soft)' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectedRecord(record._id)}
                              aria-label={`Select ${employeeName}`}
                              className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{employeeName}</span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">{record.employee?.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDate(record.date)}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatTime(record.checkIn)}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatTime(record.checkOut)}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{record.workHours ? `${record.workHours}h` : '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge tone={meta.tone} label={meta.label} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge tone={isRemote ? 'info' : 'neutral'} label={isRemote ? 'Work From Home' : 'In Office'} dot={false} />
                          </td>
                          <td className="max-w-55 px-4 py-3 text-neutral-500 dark:text-neutral-400">
                            {record.notes ? (
                              <span className="block truncate" title={record.notes}>
                                {record.notes}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-neutral-200 px-1 dark:border-neutral-800">
            <Pagination page={page} totalPages={totalPages} total={totalRecords} onPageChange={setPage} />
          </div>
        </div>
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Attendance Report"
        description="Download the current attendance view or only the rows you selected."
        selectedCount={selectedRecordIds.length}
        onExport={handleExport}
        loadHistory={loadExportHistory}
        exporting={exporting}
      />
    </div>
  );
};

export default Attendance;
