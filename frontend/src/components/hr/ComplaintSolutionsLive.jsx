import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../services/hr';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { QK } from '../../utils/queryKeys';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import ErrorState from '../ui/ErrorState';
import CardSkeleton from '../ui/CardSkeleton';
import Pagination from '../ui/Pagination';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import SectionHeader from '../common/SectionHeader';
import FilterToolbar from '../common/FilterToolbar';

import { fetchCommunicationPages } from '../../features/hr/useCommunicationDirectory';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'workplace-harassment', label: 'Workplace Harassment' },
  { value: 'work-environment', label: 'Work Environment' },
  { value: 'policy-violation', label: 'Policy Violation' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'leave', label: 'Leave' },
  { value: 'other', label: 'Other' },
];

const statuses = [
  { value: 'all', label: 'All Status' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'closed', label: 'Closed' },
];

const priorities = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const priorityTone = { urgent: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
const statusTone = { 'pending-review': 'warning', investigating: 'info', resolved: 'success', escalated: 'danger', closed: 'neutral' };

const getPayload = (response) => response?.data || response || {};

const fullName = (user) => {
  if (!user) return 'Unassigned';
  if (typeof user === 'string') return user;
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown user';
};

const normalizeComplaint = (complaint) => ({
  id: complaint?._id || complaint?.id,
  code: complaint?.metadata?.code || complaint?._id?.slice?.(-6)?.toUpperCase() || 'CMP',
  title: complaint?.title || 'Untitled complaint',
  description: complaint?.description || '',
  category: complaint?.category || 'other',
  priority: complaint?.priority || 'medium',
  status: complaint?.status || 'pending-review',
  complainant: complaint?.metadata?.anonymous
    ? 'Anonymous'
    : fullName(complaint?.complainant),
  employeeId: complaint?.metadata?.anonymous ? '' : (complaint?.complainant?._id || ''),
  department: complaint?.complainant?.department || complaint?.metadata?.department || '-',
  assignedTo: fullName(complaint?.assignedTo),
  createdAt: complaint?.createdAt,
  resolvedDate: complaint?.resolvedDate,
  satisfactionRating: complaint?.satisfactionRating,
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const labelFor = (collection, value) => collection.find((item) => item.value === value)?.label || value;

const ComplaintSolutionsLive = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ category: 'all', status: 'all', priority: 'all' });
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [employee, setEmployee] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');
  const [resolveTarget, setResolveTarget] = useState(null);
  const [solution, setSolution] = useState('');
  const solutionRef = useRef(null);

  useEffect(() => {
    if (!resolveTarget) return undefined;
    solutionRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setResolveTarget(null);
        setSolution('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [resolveTarget]);

  const complaintsParams = useMemo(
    () => ({
      page,
      limit: 20,
      ...(filters.category === 'all' ? {} : { category: filters.category }),
      ...(filters.status === 'all' ? {} : { status: filters.status }),
      ...(filters.priority === 'all' ? {} : { priority: filters.priority }),
    }),
    [page, filters]
  );

  const complaintsQuery = useQuery({
    queryKey: QK.hr.complaints(complaintsParams),
    queryFn: async () => ({ data: { complaints: await fetchCommunicationPages(hrApi.getComplaints, token, 'complaints', complaintsParams) } }),
    enabled: Boolean(token),
    select: (response) => {
      const data = getPayload(response);
      const rows = Array.isArray(data.complaints) ? data.complaints : [];
      return {
        complaints: rows.map(normalizeComplaint),
        meta: {
          total: data.total || rows.length,
          totalPages: data.totalPages || 1,
          currentPage: data.currentPage || 1,
        },
      };
    },
  });
  const complaints = useMemo(() => complaintsQuery.data?.complaints || [], [complaintsQuery.data]);
  const meta = complaintsQuery.data?.meta || { total: 0, totalPages: 1, currentPage: 1 };
  const loading = complaintsQuery.isLoading;
  const loadComplaints = () => queryClient.invalidateQueries({ queryKey: ['hr', 'complaints'] });

  const visibleComplaints = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return complaints.filter((complaint) =>
      (!department || complaint.department === department) && (!employee || complaint.employeeId === employee) &&
      [complaint.title, complaint.description, complaint.complainant, complaint.department, complaint.code]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [complaints, search, department, employee]);

  const hasActiveFilters = Boolean(search || department || employee || filters.category !== 'all' || filters.status !== 'all' || filters.priority !== 'all');
  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setEmployee('');
    setFilters({ category: 'all', status: 'all', priority: 'all' });
    setPage(1);
  };
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const stats = useMemo(() => {
    const open = complaints.filter((item) => !['resolved', 'closed'].includes(item.status)).length;
    const resolved = complaints.filter((item) => item.status === 'resolved').length;
    const escalated = complaints.filter((item) => item.status === 'escalated').length;
    const urgent = complaints.filter((item) => ['urgent', 'high'].includes(item.priority)).length;
    return [
      { label: 'Open', value: open, icon: 'pending_actions', tone: 'warning', context: 'Awaiting HR action' },
      {
        label: 'Resolved',
        value: resolved,
        icon: 'check_circle',
        tone: 'success',
        context: 'Closed complaints',
        filterValue: 'resolved',
      },
      {
        label: 'Escalated',
        value: escalated,
        icon: 'priority_high',
        tone: 'danger',
        context: 'Needs senior review',
        filterValue: 'escalated',
      },
      { label: 'High Priority', value: urgent, icon: 'report', tone: 'warning', context: 'Urgent & high combined' },
    ];
  }, [complaints]);

  const assignToMe = async (complaint) => {
    const userId = user?._id || user?.id;
    if (!userId || !complaint.id) return;
    setBusyId(complaint.id);
    try {
      await hrApi.assignComplaint(complaint.id, { assignedTo: userId }, token);
      toast.success('Complaint assigned.');
      await loadComplaints();
    } catch (error) {
      toast.error(error.message || 'Failed to assign complaint');
    } finally {
      setBusyId('');
    }
  };

  const resolveComplaint = async () => {
    if (!resolveTarget?.id || !solution.trim()) {
      toast.warning('Add a solution note before resolving.');
      return;
    }
    setBusyId(resolveTarget.id);
    try {
      await hrApi.resolveComplaint(
        resolveTarget.id,
        {
          solution: solution.trim(),
          actionTaken: solution.trim(),
        },
        token
      );
      setResolveTarget(null);
      setSolution('');
      toast.success('Complaint resolved.');
      await loadComplaints();
    } catch (error) {
      toast.error(error.message || 'Failed to resolve complaint');
    } finally {
      setBusyId('');
    }
  };

  const exportCsv = () => {
    const rows = [
      ['ID', 'Title', 'Complainant', 'Department', 'Category', 'Priority', 'Status', 'Assigned To', 'Created'],
      ...visibleComplaints.map((item) => [
        item.code,
        item.title,
        item.complainant,
        item.department,
        labelFor(categories, item.category),
        item.priority,
        item.status,
        item.assignedTo,
        formatDate(item.createdAt),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hr-complaints.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Complaints exported to CSV.');
  };

  const departmentOptions = [{ value: '', label: 'All departments' }, ...[...new Set(complaints.map((item) => item.department))].sort().map((value) => ({ value, label: value }))];
  const employeeOptions = [
    { value: '', label: 'All employees' },
    ...[...new Map(complaints.filter((item) => item.employeeId && (!department || item.department === department)).map((item) => [item.employeeId, item.complainant])).entries()].map(([id, name]) => ({ value: id, label: name })),
  ];

  const primaryFilters = [
    { key: 'department', label: 'Department', value: department, onChange: (value) => { setDepartment(value); setEmployee(''); }, options: departmentOptions, width: 'w-40' },
    { key: 'employee', label: 'Employee', value: employee, onChange: setEmployee, options: employeeOptions, width: 'w-44' },
    { key: 'status', label: 'Status', value: filters.status, onChange: (value) => updateFilter('status', value), options: statuses, width: 'w-36' },
  ];
  const moreFilters = [
    { key: 'category', label: 'Category', value: filters.category, onChange: (value) => updateFilter('category', value), options: categories, width: 'w-44' },
    { key: 'priority', label: 'Priority', value: filters.priority, onChange: (value) => updateFilter('priority', value), options: priorities, width: 'w-36' },
  ];

  const activeChips = [
    department && { key: 'department', label: `Department: ${department}`, onRemove: () => { setDepartment(''); setEmployee(''); } },
    employee && { key: 'employee', label: `Employee: ${employeeOptions.find((o) => o.value === employee)?.label || employee}`, onRemove: () => setEmployee('') },
    filters.status !== 'all' && { key: 'status', label: `Status: ${labelFor(statuses, filters.status)}`, onRemove: () => updateFilter('status', 'all') },
    filters.category !== 'all' && { key: 'category', label: `Category: ${labelFor(categories, filters.category)}`, onRemove: () => updateFilter('category', 'all') },
    filters.priority !== 'all' && { key: 'priority', label: `Priority: ${labelFor(priorities, filters.priority)}`, onRemove: () => updateFilter('priority', 'all') },
  ].filter(Boolean);

  const columns = [
    { key: 'code', header: 'ID', render: (complaint) => <span className="font-semibold text-primary">{complaint.code}</span> },
    {
      key: 'complainant',
      header: 'Complainant',
      render: (complaint) => (
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{complaint.complainant}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{complaint.department}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (complaint) => labelFor(categories, complaint.category) },
    {
      key: 'title',
      header: 'Title',
      render: (complaint) => (
        <div className="max-w-xs">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100" title={complaint.title}>{complaint.title}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400" title={complaint.description}>{complaint.description}</p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (complaint) => <StatusBadge tone={priorityTone[complaint.priority] || 'neutral'} label={complaint.priority} /> },
    { key: 'status', header: 'Status', render: (complaint) => <StatusBadge tone={statusTone[complaint.status] || 'neutral'} label={labelFor(statuses, complaint.status)} /> },
    { key: 'assignedTo', header: 'Assigned', render: (complaint) => complaint.assignedTo },
    { key: 'createdAt', header: 'Created', render: (complaint) => formatDate(complaint.createdAt) },
  ];

  const rowActions = (complaint) =>
    [
      complaint.status !== 'resolved' && {
        key: 'assign',
        label: 'Assign to me',
        icon: 'assignment_ind',
        disabled: busyId === complaint.id,
        onClick: () => assignToMe(complaint),
      },
      complaint.status !== 'resolved' && {
        key: 'resolve',
        label: 'Resolve',
        icon: 'check_circle',
        disabled: busyId === complaint.id,
        onClick: () => setResolveTarget(complaint),
      },
    ].filter(Boolean);

  return (
    <section>
      <SectionHeader
        title="Complaints & Solutions"
        description="Review portal complaints and close HR actions."
        actions={
          <Button variant="secondary" size="sm" onClick={exportCsv} icon={<span className="material-symbols-outlined text-base">download</span>}>
            Export
          </Button>
        }
      />

      {loading && !complaints.length ? (
        <CardSkeleton count={4} className="mt-4" />
      ) : (
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <KPICard
              key={stat.label}
              variant="minimal"
              title={stat.label}
              value={stat.value}
              icon={stat.icon}
              tone={stat.tone}
              context={stat.context}
              onClick={stat.filterValue ? () => updateFilter('status', filters.status === stat.filterValue ? 'all' : stat.filterValue) : undefined}
              active={stat.filterValue ? filters.status === stat.filterValue : false}
            />
          ))}
        </section>
      )}

      <FilterToolbar
        className="mt-4"
        search={{ value: search, onChange: setSearch, label: 'Search complaints', placeholder: 'Search complaints', width: 'w-64' }}
        primaryFilters={primaryFilters}
        moreFilters={moreFilters}
        activeChips={activeChips}
        onClearAll={hasActiveFilters ? clearFilters : undefined}
      />

      {complaintsQuery.isError ? (
        <ErrorState className="mt-3" title="Unable to load complaints" description={complaintsQuery.error?.message} onRetry={() => complaintsQuery.refetch()} />
      ) : (
        <Card className="mt-3">
          <DataTable
            columns={columns}
            rows={visibleComplaints}
            loading={loading}
            rowActions={rowActions}
            emptyTitle={hasActiveFilters ? 'No matching complaints' : 'No complaints yet'}
            emptyDescription={hasActiveFilters ? 'Try adjusting your filters.' : 'New complaints will appear here when submitted.'}
            emptyAction={hasActiveFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
          />
          {visibleComplaints.length > 0 && <Pagination page={meta.currentPage} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />}
        </Card>
      )}

      {resolveTarget ? (
        <div className="app-modal">
          <div className="app-modal-panel max-w-lg p-6" role="dialog" aria-modal="true" aria-labelledby="resolve-complaint-title">
            <h2 id="resolve-complaint-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Resolve Complaint</h2>
            <p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">{resolveTarget.title}</p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Solution note</span>
              <textarea
                ref={solutionRef}
                value={solution}
                onChange={(event) => setSolution(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-950"
                placeholder="Describe the action taken to resolve this complaint"
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setResolveTarget(null);
                  setSolution('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={resolveComplaint} disabled={busyId === resolveTarget.id}>
                Resolve
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ComplaintSolutionsLive;
