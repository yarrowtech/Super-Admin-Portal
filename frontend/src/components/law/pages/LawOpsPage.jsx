import React, { useEffect, useMemo, useState } from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';
import { PortalHeader, StatusBadge, KPICard } from '../../common';
import { Card, CardBody, DataTable, EmptyState, CardSkeleton } from '../../ui';
import FilterToolbar from '../../common/FilterToolbar';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { useToast } from '../../../context/ToastContext';

const MODULE_SIGNAL_CONFIG = {
  agreements: {
    primaryDate: 'expiryDate',
    primaryDateLabel: 'Expires',
    attentionLabel: 'Expiring Soon',
    detailFields: ['counterparty', 'parties', 'signatureStatus', 'version'],
  },
  'privacy-policy': {
    primaryDate: 'nextReviewDate',
    primaryDateLabel: 'Review',
    attentionLabel: 'Reviews Due',
    detailFields: ['audience', 'dataCategory', 'reviewCadence', 'notificationMode'],
  },
  'disputes-fraud': {
    primaryDate: 'resolutionEta',
    primaryDateLabel: 'ETA',
    attentionLabel: 'Critical Cases',
    detailFields: ['caseStage', 'severity', 'fraudAmount', 'rootCause'],
  },
  'ip-copyright': {
    primaryDate: 'expiryDate',
    primaryDateLabel: 'Renewal',
    attentionLabel: 'Renewals Due',
    detailFields: ['jurisdiction', 'assetOwner', 'usageScope', 'renewalOwner'],
  },
};

const STATUS_TONE = {
  draft: 'neutral',
  pending: 'warning',
  'pending approval': 'warning',
  'in review': 'info',
  approved: 'success',
  active: 'success',
  resolved: 'success',
  ready: 'success',
  rejected: 'danger',
  overdue: 'danger',
  critical: 'danger',
  attention: 'danger',
  'changes requested': 'info',
  archived: 'neutral',
};

const PRIORITY_TONE = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const toneFor = (map, value) => map[String(value || '').trim().toLowerCase()] || 'neutral';

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysUntil = (value) => {
  const date = parseDateValue(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

// ─────────────────────────────────────────────────────────────────────────────
// Privacy policy static content (kept intact)
// ─────────────────────────────────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
  {
    title: 'Information We Collect',
    points: [
      'Account Information: Name, email address, phone number, and role used to create and manage user accounts.',
      'Usage Data: Pages visited, features used, quiz results, time spent, and browser/device information.',
      'Content You Provide: Answers, notes, feedback, and uploaded study material for service delivery and personalization.',
    ],
  },
  {
    title: 'How We Use Your Information',
    points: [
      'Provide and maintain platform services.',
      'Improve product performance and user experience.',
      'Send updates, legal notices, and service communication.',
    ],
  },
  {
    title: 'Data Sharing',
    points: [
      'Shared only with trusted processors and service providers under legal controls.',
      'Never sold as commercial personal data.',
    ],
  },
  {
    title: 'Data Security',
    points: [
      'Encryption in transit and at rest.',
      'Access control and audit logs enforced.',
    ],
  },
  {
    title: 'Your Rights',
    points: [
      'Access, correction, portability, and deletion requests.',
      'Consent withdrawal and communication preference controls.',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const LawOpsPage = ({
  sectionId,
  searchTerm,
  onSearchChange,
  error,
  subtitle = '',
  records = [],
  projects = [],
  selectedProjectId = '',
  onProjectChange,
  loading = false,
  lastUpdatedAt,
  saving,
  onSaveRecord,
  onDeleteRecord,
  forceOpenForm = false,
}) => {
  const section = getLawSection(sectionId);
  const config = LAW_FORM_CONFIG[sectionId] || {};
  const signalConfig = MODULE_SIGNAL_CONFIG[sectionId] || {};
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  useEffect(() => {
    if (forceOpenForm) {
      setEditingRecord(null);
      setFormOpen(true);
    }
  }, [forceOpenForm]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const textMatch = `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    return textMatch;
  }), [records, searchTerm]);

  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      label: project.name || 'Untitled Project',
      value: String(project._id || project.id || ''),
    })).filter((item) => item.value);
  }, [projects]);

  const formatDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const lifecycleStats = useMemo(() => {
    const open = filteredRecords.filter((record) => !['active', 'ready', 'archived'].includes(String(record.status || '').toLowerCase())).length;
    const attention = filteredRecords.filter((record) => {
      const status = String(record.status || '').toLowerCase();
      const priority = String(record.priority || '').toLowerCase();
      const dueIn = daysUntil(record.metadata?.[signalConfig.primaryDate] || record.dueDate);
      if (sectionId === 'disputes-fraud') return priority === 'critical' || status === 'attention';
      return dueIn !== null && dueIn <= 30;
    }).length;
    const withEvidence = filteredRecords.filter((record) => Array.isArray(record.metadata?.referencePdfs) && record.metadata.referencePdfs.length > 0).length;
    const inReview = filteredRecords.filter((record) => String(record.status || '').toLowerCase() === 'in review').length;
    return { open, attention, withEvidence, inReview };
  }, [filteredRecords, sectionId, signalConfig.primaryDate]);

  const selectedProjectName = projectOptions.find((p) => p.value === selectedProjectId)?.label || 'All Projects';

  const openCreate = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDelete = async (record) => {
    const confirmed = await confirm({
      title: 'Delete this record?',
      message: `"${record.title || 'This record'}" will be permanently removed. This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await onDeleteRecord?.(record._id);
      toast.success('Record deleted.');
    } catch (err) {
      toast.error(err?.message || 'Unable to delete record.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: config.labels?.title || 'Title',
      render: (record) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900 dark:text-white">{record.title || 'Untitled'}</p>
          {record.referenceNumber && (
            <p className="truncate text-[11px] font-mono text-neutral-400">{record.referenceNumber}</p>
          )}
        </div>
      ),
    },
    {
      key: 'recordType',
      label: 'Type',
      render: (record) => record.recordType || record.metadata?.recordType || '—',
    },
    {
      key: 'owner',
      label: config.labels?.owner || 'Owner',
      render: (record) => record.owner || 'Unassigned',
    },
    {
      key: 'primaryDate',
      label: signalConfig.primaryDateLabel || 'Due',
      render: (record) => formatDate(record.metadata?.[signalConfig.primaryDate] || record.dueDate) || '—',
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (record) => record.priority ? <StatusBadge tone={toneFor(PRIORITY_TONE, record.priority)} label={record.priority} /> : '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (record) => record.status ? <StatusBadge tone={toneFor(STATUS_TONE, record.status)} label={record.status} /> : '—',
    },
  ];

  return (
    <div className="portal-page-inner space-y-4">
      <PortalHeader
        title={section.title}
        subtitle={`${filteredRecords.length} record${filteredRecords.length === 1 ? '' : 's'} · ${selectedProjectName}${subtitle ? ` · ${subtitle}` : ''}`}
        icon={section.icon || 'description'}
        primaryAction={{ label: config.actionLabel || 'New Record', icon: 'add', onClick: openCreate }}
        lastUpdated={lastUpdatedAt && !loading ? new Date(lastUpdatedAt).toLocaleTimeString() : undefined}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          {error}
        </div>
      )}

      <FilterToolbar
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: `Search ${section.navLabel.toLowerCase()} records…`,
        }}
        primaryFilters={projectOptions.length > 0 ? [{
          key: 'project',
          label: 'Project',
          value: selectedProjectId,
          onChange: (value) => onProjectChange?.(value),
          options: [{ value: '', label: 'All Projects' }, ...projectOptions],
          width: 'w-44',
        }] : []}
        activeChips={selectedProjectId ? [{ key: 'project', label: `Project: ${selectedProjectName}`, onRemove: () => onProjectChange?.('') }] : []}
        onClearAll={selectedProjectId ? () => onProjectChange?.('') : undefined}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard variant="minimal" priority="secondary" title="Open Pipeline" value={lifecycleStats.open} icon="pending_actions" tone="accent" />
        <KPICard variant="minimal" priority="secondary" title={signalConfig.attentionLabel || 'Needs Attention'} value={lifecycleStats.attention} icon="warning" tone="danger" />
        <KPICard variant="minimal" priority="secondary" title="In Review" value={lifecycleStats.inReview} icon="rate_review" tone="info" />
        <KPICard variant="minimal" priority="secondary" title="Evidence Attached" value={lifecycleStats.withEvidence} icon="attach_file" tone="success" />
      </div>

      {sectionId === 'privacy-policy' && (
        <Card>
          <CardBody>
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Policy Overview</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRIVACY_SECTIONS.map((item) => (
                <span
                  key={item.title}
                  className="rounded-full border border-[var(--portal-accent)]/20 bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--portal-accent)]"
                >
                  {item.title}
                </span>
              ))}
            </div>
            <div className="space-y-3">
              {PRIVACY_SECTIONS.map((item) => (
                <details key={item.title} className="group rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.title}
                    <span className="material-symbols-outlined text-[18px] text-neutral-400 transition group-open:rotate-180">expand_more</span>
                  </summary>
                  <div className="space-y-1.5 px-4 pb-4">
                    {item.points.map((point) => (
                      <p key={point} className="flex gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="material-symbols-outlined mt-0.5 text-[14px] text-[var(--portal-accent)]">chevron_right</span>
                        {point}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Register — table on tablet/desktop, cards on mobile */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={section.icon || 'description'}
          title={`No ${section.navLabel.toLowerCase()} records`}
          description="Create your first record using the button above."
          actionLabel={config.actionLabel || 'New Record'}
          onAction={openCreate}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <DataTable
                columns={columns}
                rows={filteredRecords}
                rowKey={(record) => record._id || record.id}
                rowActions={(record) => [
                  { label: 'Edit', icon: 'edit', onClick: () => openEdit(record) },
                  { label: 'Delete', icon: 'delete', tone: 'danger', onClick: () => handleDelete(record) },
                ]}
              />
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredRecords.map((record) => (
              <Card key={record._id || record.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900 dark:text-white">{record.title || 'Untitled'}</p>
                    {record.referenceNumber && (
                      <p className="text-[11px] font-mono text-neutral-400">{record.referenceNumber}</p>
                    )}
                  </div>
                  {record.status && <StatusBadge tone={toneFor(STATUS_TONE, record.status)} label={record.status} />}
                </div>
                {record.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{record.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                  {record.owner && (
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span>{record.owner}</span>
                  )}
                  {(record.metadata?.[signalConfig.primaryDate] || record.dueDate) && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">event_upcoming</span>
                      {signalConfig.primaryDateLabel || 'Due'}: {formatDate(record.metadata?.[signalConfig.primaryDate] || record.dueDate)}
                    </span>
                  )}
                  {record.priority && <StatusBadge tone={toneFor(PRIORITY_TONE, record.priority)} label={record.priority} />}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => openEdit(record)} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(record)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20">
                    Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <LawRecordManager
        key={`${editingRecord?._id || 'new'}-${formOpen ? 'open' : 'closed'}`}
        section={sectionId}
        saving={saving}
        onSaveRecord={onSaveRecord}
        formOpen={formOpen}
        editingRecord={editingRecord}
        onFormClose={() => setFormOpen(false)}
        title={config.registerTitle || `${section.navLabel} Register`}
        {...config}
      />
    </div>
  );
};

export default LawOpsPage;
