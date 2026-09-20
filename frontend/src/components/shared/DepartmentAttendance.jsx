import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FilterToolbar from '../common/FilterToolbar';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import PortalHeader from '../common/PortalHeader';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
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

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'present', label: 'On Time' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'absent', label: 'Absent' },
];

const locationOptions = [
  { value: 'office', label: 'In Office' },
  { value: 'remote', label: 'Work From Home' },
  { value: 'field', label: 'Field' },
];
const locationLabel = (value) => locationOptions.find((o) => o.value === value)?.label || 'In Office';

const defaultFilters = { startDate: '', endDate: '', status: '', employee: '', search: '' };
const emptyForm = { employee: '', date: '', checkIn: '', checkOut: '', status: 'present', location: 'office', notes: '' };

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

const dayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const groupLabel = (key) =>
  new Date(Number(key)).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

const toDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const combine = (dateStr, timeStr) => (dateStr && timeStr ? new Date(`${dateStr}T${timeStr}`).toISOString() : undefined);

const employeeName = (employee) =>
  `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || employee?.email || 'Employee';

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (records, fileName) => {
  const header = ['Employee', 'Email', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Location', 'Notes'];
  const rows = records.map((r) => [
    employeeName(r.employee),
    r.employee?.email || '',
    formatDate(r.date),
    formatTime(r.checkIn),
    formatTime(r.checkOut),
    r.workHours || 0,
    statusMeta[r.status]?.label || r.status || '',
    locationLabel(r.location),
    r.notes || '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * Department-parameterized attendance workspace. Feature-equivalent to HR's
 * Attendance.jsx (employee filter, date-grouped table, row selection, CSV export)
 * plus create/edit when the api exposes createAttendance/updateAttendance.
 *
 * `api` is a createDepartmentModulesApi() instance (or any object with the same
 * getAttendance/getMembers/createAttendance/updateAttendance functions).
 * CSV export is built client-side from the records the API returns.
 */
const DepartmentAttendance = ({ api, portalLabel = 'Department', writeRoles }) => {
  const { token, user } = useAuth();
  const toast = useToast();
  const canWrite = Boolean(api?.createAttendance && api?.updateAttendance)
    && (!writeRoles || writeRoles.includes(String(user?.role || '').toLowerCase()));
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [members, setMembers] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const queryParams = useCallback(
    (extra = {}) => ({
      status: filters.status || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      employee: filters.employee || undefined,
      ...extra,
    }),
    [filters.status, filters.startDate, filters.endDate, filters.employee]
  );

  const fetchAttendance = async () => {
    if (!token || !api?.getAttendance) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getAttendance(token, queryParams({ page, limit: 25 }));
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
    if (!token || !api?.getMembers) return;
    api.getMembers(token)
      .then((res) => setMembers(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setMembers([]));
  }, [token, api]);

  useEffect(() => {
    setSelectedIds([]);
  }, [records, filters.search]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field !== 'search') setPage(1);
  };

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m._id || m.id, label: employeeName(m) })),
    [members]
  );
  const employeeFilterOptions = useMemo(() => [{ value: '', label: 'All Employees' }, ...memberOptions], [memberOptions]);

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
    const todayKey = dayKey(new Date());
    const yesterdayKey = todayKey - 24 * 60 * 60 * 1000;
    const buckets = new Map();
    filteredRecords.forEach((record) => {
      const key = dayKey(record.date);
      if (key === null) return;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(record);
    });
    return Array.from(buckets.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([key, list]) => ({
        key: String(key),
        label: key === todayKey ? 'Today' : key === yesterdayKey ? 'Yesterday' : groupLabel(key),
        records: list,
      }));
  }, [filteredRecords]);

  const analytics = useMemo(() => {
    const total = filteredRecords.length;
    const count = (s) => filteredRecords.filter((item) => item.status === s).length;
    const present = count('present');
    const late = count('late');
    const leave = count('on-leave');
    const absent = count('absent');
    const avgHours = total > 0 ? (filteredRecords.reduce((sum, item) => sum + (item.workHours || 0), 0) / total).toFixed(1) : '0';
    return [
      { label: 'Checked In', value: present, context: `of ${total} records`, icon: 'how_to_reg', tone: 'success' },
      { label: 'Late Arrivals', value: late, context: `${total ? Math.round((late / total) * 100) : 0}% of records`, icon: 'schedule', tone: 'warning' },
      { label: 'On Leave / Absent', value: leave + absent, context: `${leave} leave · ${absent} absent`, icon: 'event_busy', tone: 'neutral' },
      { label: 'Avg. Hours Worked', value: `${avgHours}h`, context: 'Based on recorded hours', icon: 'timer', tone: 'info' },
    ];
  }, [filteredRecords]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.status) chips.push({ key: 'status', label: statusOptions.find((o) => o.value === filters.status)?.label || filters.status, onRemove: () => handleFilterChange('status', '') });
    if (filters.employee) chips.push({ key: 'employee', label: employeeFilterOptions.find((o) => o.value === filters.employee)?.label || 'Employee', onRemove: () => handleFilterChange('employee', '') });
    if (filters.startDate || filters.endDate) chips.push({ key: 'dates', label: `${filters.startDate || 'Any'} → ${filters.endDate || 'Any'}`, onRemove: () => setFilters((prev) => ({ ...prev, startDate: '', endDate: '' })) });
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, employeeFilterOptions]);

  const allVisibleSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.includes(r._id));
  const toggleSelected = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      let rows;
      if (selectedIds.length > 0) {
        rows = filteredRecords.filter((r) => selectedIds.includes(r._id));
      } else {
        // Whole filtered result set, not just the visible page.
        rows = [];
        let p = 1;
        let pages = 1;
        do {
          const res = await api.getAttendance(token, queryParams({ page: p, limit: 100 }));
          const payload = res?.data || {};
          rows.push(...(payload.attendance || []));
          pages = payload.totalPages || 1;
          p += 1;
        } while (p <= pages);
        if (filters.search.trim()) {
          const term = filters.search.toLowerCase();
          rows = rows.filter((r) => employeeName(r.employee).toLowerCase().includes(term) || r.employee?.email?.toLowerCase().includes(term));
        }
      }
      downloadCsv(rows, `${portalLabel.toLowerCase()}-attendance-${toDateInput()}.csv`);
      toast.success(`Exported ${rows.length} attendance row${rows.length === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to export attendance.');
    } finally {
      setExporting(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormError('');
    setForm({ ...emptyForm, date: toDateInput(), employee: memberOptions[0]?.value || '' });
    setFormOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    setFormError('');
    setForm({
      employee: record.employee?._id || record.employee || '',
      date: toDateInput(record.date),
      checkIn: toTimeInput(record.checkIn),
      checkOut: toTimeInput(record.checkOut),
      status: record.status || 'present',
      location: record.location || 'office',
      notes: record.notes || '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.date || !form.checkIn) {
      setFormError('Employee, date and check-in time are required.');
      return;
    }
    const checkIn = combine(form.date, form.checkIn);
    const checkOut = form.checkOut ? combine(form.date, form.checkOut) : null;
    if (checkOut && new Date(checkOut) < new Date(checkIn)) {
      setFormError('Check-out must be after check-in.');
      return;
    }
    const body = {
      employee: form.employee,
      date: new Date(`${form.date}T00:00:00`).toISOString(),
      checkIn,
      checkOut,
      status: form.status,
      location: form.location,
      notes: form.notes,
    };
    setSaving(true);
    setFormError('');
    try {
      if (editingId) await api.updateAttendance(token, editingId, body);
      else await api.createAttendance(token, body);
      toast.success(editingId ? 'Attendance updated.' : 'Attendance saved.');
      setFormOpen(false);
      fetchAttendance();
    } catch (err) {
      setFormError(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const colCount = canWrite ? 10 : 9;

  return (
    <div className="portal-page-inner space-y-5">
      <PortalHeader
        title={`${portalLabel} Attendance`}
        subtitle="Review check-in history and attendance trends."
        icon="calendar_month"
        onRefresh={fetchAttendance}
        refreshing={loading}
        secondaryAction={{
          label: exporting ? 'Exporting…' : selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : 'Export CSV',
          icon: 'download',
          onClick: handleExport,
        }}
        primaryAction={canWrite ? { label: 'Add Attendance', icon: 'add', onClick: openCreate } : undefined}
      />

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
            { key: 'employee', label: 'Employee', value: filters.employee, onChange: (v) => handleFilterChange('employee', v), options: employeeFilterOptions, width: 'w-44' },
          ]}
          activeChips={activeChips}
          onClearAll={() => { setFilters({ ...defaultFilters }); setPage(1); }}
        />
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <Input type="date" aria-label="Start date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="min-h-10 w-40" />
          <span className="text-sm text-neutral-400">to</span>
          <Input type="date" aria-label="End date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="min-h-10 w-40" />
          <Button variant="ghost" size="sm" onClick={() => { const t = toDateInput(); setFilters((prev) => ({ ...prev, startDate: t, endDate: t })); setPage(1); }}>Today</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const y = new Date();
              y.setDate(y.getDate() - 1);
              const t = toDateInput(y);
              setFilters((prev) => ({ ...prev, startDate: t, endDate: t }));
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
                      onChange={() => setSelectedIds(allVisibleSelected ? [] : filteredRecords.map((r) => r._id).filter(Boolean))}
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
                  {canWrite && <th className="px-4 py-3 text-right">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
                {groupedRecords.map((group) => (
                  <React.Fragment key={group.key}>
                    <tr className="bg-neutral-50 dark:bg-neutral-900/60">
                      <td colSpan={colCount} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                        {group.label}
                      </td>
                    </tr>
                    {group.records.map((record) => {
                      const name = employeeName(record.employee);
                      const meta = statusMeta[record.status] || statusMeta.present;
                      const isRemote = record.location === 'remote';
                      const isSelected = selectedIds.includes(record._id);
                      return (
                        <tr key={record._id} className={`h-14 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${isSelected ? 'bg-(--portal-accent-soft)' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(record._id)}
                              aria-label={`Select ${name}`}
                              className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{name}</span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">{record.employee?.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDate(record.date)}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatTime(record.checkIn)}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatTime(record.checkOut)}</td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{record.workHours ? `${record.workHours}h` : '—'}</td>
                          <td className="px-4 py-3"><StatusBadge tone={meta.tone} label={meta.label} /></td>
                          <td className="px-4 py-3"><StatusBadge tone={isRemote ? 'info' : 'neutral'} label={locationLabel(record.location)} dot={false} /></td>
                          <td className="max-w-55 px-4 py-3 text-neutral-500 dark:text-neutral-400">
                            {record.notes ? <span className="block truncate" title={record.notes}>{record.notes}</span> : '—'}
                          </td>
                          {canWrite && (
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openEdit(record)}
                                aria-label={`Edit attendance for ${name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                            </td>
                          )}
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Attendance' : 'Add Attendance'}>
        <form onSubmit={handleSave} className="space-y-3">
          <Select
            label="Employee"
            value={form.employee}
            onChange={(e) => setForm({ ...form, employee: e.target.value })}
            disabled={Boolean(editingId)}
            options={[{ value: '', label: 'Select employee' }, ...memberOptions]}
          />
          <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Check In" type="time" required value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
            <Input label="Check Out" type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={statusOptions.filter((o) => o.value)} />
            <Select label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} options={locationOptions} />
          </div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <p className="text-xs text-neutral-500">Status may be recalculated from the check-in time and shift rules when saved.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentAttendance;
