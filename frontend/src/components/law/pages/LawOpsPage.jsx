import React, { useEffect, useMemo, useState } from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';
import { PortalHeader, StatusBadge, KPICard } from '../../common';
import { Card, CardBody, DataTable, EmptyState, CardSkeleton, Modal } from '../../ui';
import FilterToolbar from '../../common/FilterToolbar';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { useToast } from '../../../context/ToastContext';
import { resolvePrivacySections, NOT_CONFIGURED_SECTIONS } from '../privacyPolicyContent';
import { useAuth } from '../../../context/AuthContext';
import { lawApi } from '../../../services/law';

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
  const { token } = useAuth();
  const section = getLawSection(sectionId);
  const config = LAW_FORM_CONFIG[sectionId] || {};
  const signalConfig = MODULE_SIGNAL_CONFIG[sectionId] || {};
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [pdfViewer, setPdfViewer] = useState(null);
  const [pdfPreview, setPdfPreview] = useState({ url: '', loading: false, error: '' });

  useEffect(() => {
    if (!pdfViewer?.record?._id || !pdfViewer?.pdf || !selectedProjectId || !token) {
      return undefined;
    }
    let cancelled = false;
    let objectUrl = '';
    const index = pdfViewer.files.findIndex((file) => file === pdfViewer.pdf || file.url === pdfViewer.pdf.url);
    queueMicrotask(() => {
      if (!cancelled) setPdfPreview({ url: '', loading: true, error: '' });
    });
    lawApi.getReferencePdf(token, selectedProjectId, pdfViewer.record._id, Math.max(index, 0))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPdfPreview({ url: objectUrl, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setPdfPreview({ url: '', loading: false, error: error.message || 'Unable to display this PDF.' });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdfViewer, selectedProjectId, token]);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  useEffect(() => {
    if (!forceOpenForm) return undefined;
    const timer = window.setTimeout(() => {
      setEditingRecord(null);
      setFormOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [forceOpenForm]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const textMatch = `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''} ${record.metadata?.counterparty || ''} ${record.metadata?.primaryParty || ''}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const statusMatch = !statusFilter || record.status === statusFilter;
    const priorityMatch = !priorityFilter || record.priority === priorityFilter;
    return textMatch && statusMatch && priorityMatch;
  }), [priorityFilter, records, searchTerm, statusFilter]);

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
  const isContractSection = ['agreements', 'work-hire', 'third-party'].includes(sectionId);
  const activePrivacySections = useMemo(
    () => (selectedProjectId ? resolvePrivacySections(selectedProjectName) : NOT_CONFIGURED_SECTIONS),
    [selectedProjectId, selectedProjectName]
  );

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

  const getRecordPdfs = (record) => Array.isArray(record?.metadata?.referencePdfs)
    ? record.metadata.referencePdfs.filter((pdf) => pdf?.url)
    : [];

  const openPdf = (record, pdf = getRecordPdfs(record)[0]) => {
    if (!pdf?.url) {
      toast.error('No PDF is attached to this policy.');
      return;
    }
    setPdfViewer({ record, pdf, files: getRecordPdfs(record) });
  };

  const columns = [
    {
      key: 'title',
      label: config.labels?.title || 'Title',
      render: (record) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900 dark:text-white">{record.title || 'Untitled'}</p>
          {record.referenceNumber && (
            <p className="mt-1 truncate text-[11px] font-medium text-neutral-400">Version {record.referenceNumber}</p>
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
    ...(isContractSection ? [{
      key: 'counterparty',
      label: 'Counterparty',
      render: (record) => record.metadata?.counterparty || '—',
    }, {
      key: 'value',
      label: 'Value',
      render: (record) => record.metadata?.contractValue
        ? `${record.metadata?.currency || 'INR'} ${Number(record.metadata.contractValue).toLocaleString('en-IN')}`
        : '—',
    }] : []),
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
    ...(sectionId === 'privacy-policy' ? [{
      key: 'documents',
      label: 'PDF',
      render: (record) => {
        const pdfs = getRecordPdfs(record);
        return pdfs.length ? (
          <button type="button" onClick={() => openPdf(record)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-[var(--portal-accent)] hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/30 dark:bg-rose-950/30" aria-label={`View PDF for ${record.title}`}>
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            View{pdfs.length > 1 ? ` (${pdfs.length})` : ''}
          </button>
        ) : <span className="text-xs text-neutral-400">Not attached</span>;
      },
    }] : []),
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
        primaryFilters={[
          ...(projectOptions.length > 0 ? [{
          key: 'project',
          label: 'Project',
          value: selectedProjectId,
          onChange: (value) => onProjectChange?.(value),
          options: [{ value: '', label: 'All Projects' }, ...projectOptions],
          width: 'w-44',
          }] : []),
          ...(isContractSection ? [{ key: 'status', label: 'Status', value: statusFilter, onChange: setStatusFilter, options: [{ value: '', label: 'All Statuses' }, ...['Draft', 'In Review', 'Pending Approval', 'Approved', 'Active', 'Expired', 'Terminated', 'Archived'].map((value) => ({ value, label: value }))] }, { key: 'priority', label: 'Priority', value: priorityFilter, onChange: setPriorityFilter, options: [{ value: '', label: 'All Priorities' }, ...['Low', 'Medium', 'High', 'Critical'].map((value) => ({ value, label: value }))] }] : []),
        ]}
        activeChips={[
          ...(selectedProjectId ? [{ key: 'project', label: `Project: ${selectedProjectName}`, onRemove: () => onProjectChange?.('') }] : []),
          ...(statusFilter ? [{ key: 'status', label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('') }] : []),
          ...(priorityFilter ? [{ key: 'priority', label: `Priority: ${priorityFilter}`, onRemove: () => setPriorityFilter('') }] : []),
        ]}
        onClearAll={(selectedProjectId || statusFilter || priorityFilter) ? () => { onProjectChange?.(''); setStatusFilter(''); setPriorityFilter(''); } : undefined}
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
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Policy Overview{selectedProjectId ? ` · ${selectedProjectName}` : ''}
            </h3>
            {!selectedProjectId ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Select a project above to view its policy — data collection, usage, sharing, security and rights are project-specific and shown per project, not as one shared template.
              </p>
            ) : activePrivacySections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-[13px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                No privacy configuration available for this project.
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  {activePrivacySections.map((item) => (
                    <span
                      key={item.title}
                      className="rounded-full border border-[var(--portal-accent)]/20 bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--portal-accent)]"
                    >
                      {item.title}
                    </span>
                  ))}
                </div>
                <div className="space-y-3">
                  {activePrivacySections.map((item) => (
                    <details key={item.key || item.title} className="group rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                      <summary className="flex cursor-pointer items-center justify-between px-4 py-3.5 text-sm font-semibold text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--portal-accent)]/40 dark:text-white">
                        {item.title}
                        <span className="material-symbols-outlined text-[18px] text-neutral-400 transition group-open:rotate-180">expand_more</span>
                      </summary>
                      <div className="space-y-3 px-4 pb-4">
                        {(item.items || item.points || []).map((entry) => {
                          const structured = typeof entry === 'object';
                          const key = structured ? `${entry.title}:${entry.description}` : entry;
                          return (
                          <div key={key} className="flex gap-2 text-[13px] leading-6 text-neutral-600 dark:text-neutral-400">
                            <span className="material-symbols-outlined mt-0.5 text-[14px] text-[var(--portal-accent)]">chevron_right</span>
                            <p>
                              {structured && <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{entry.title}: </strong>}
                              {structured ? entry.description : entry}
                            </p>
                          </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </>
            )}
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
                  ...(getRecordPdfs(record).length ? [{ label: 'View PDF', icon: 'picture_as_pdf', onClick: () => openPdf(record) }] : []),
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
                  {getRecordPdfs(record).length > 0 && <button type="button" onClick={() => openPdf(record)} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-[var(--portal-accent)] dark:bg-rose-950/30"><span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>View PDF</button>}
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
        projectId={selectedProjectId}
        projectName={selectedProjectId ? selectedProjectName : ''}
        title={config.registerTitle || `${section.navLabel} Register`}
        {...config}
      />

      <Modal open={Boolean(pdfViewer)} onClose={() => setPdfViewer(null)} title={pdfViewer?.record?.title || 'Policy PDF'} description={pdfViewer?.pdf?.originalName || 'Supporting policy document'} className="w-[calc(100vw-24px)] max-w-6xl sm:w-[calc(100vw-48px)]" footer={pdfViewer && <div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-neutral-500">{pdfViewer.files.length} PDF{pdfViewer.files.length === 1 ? '' : 's'} attached</span><a href={pdfPreview.url || pdfViewer.pdf.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--portal-accent)] px-4 text-sm font-bold text-white"><span className="material-symbols-outlined text-[17px]">open_in_new</span>Open in New Tab</a></div>}>
        {pdfViewer && <div className="-m-4 flex h-[72dvh] min-h-[420px] flex-col bg-neutral-100 lg:-m-5 dark:bg-neutral-950">
          {pdfViewer.files.length > 1 && <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">{pdfViewer.files.map((pdf, index) => <button key={`${pdf.url}-${index}`} type="button" onClick={() => setPdfViewer((prev) => ({ ...prev, pdf }))} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${pdfViewer.pdf.url === pdf.url ? 'bg-[var(--portal-accent)] text-white' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'}`}>{pdf.originalName || `PDF ${index + 1}`}</button>)}</div>}
          {pdfPreview.loading && <div className="flex flex-1 items-center justify-center gap-3 text-sm text-neutral-500"><span className="material-symbols-outlined animate-spin text-[var(--portal-accent)]">progress_activity</span>Loading PDF preview…</div>}
          {pdfPreview.error && <div className="flex flex-1 flex-col items-center justify-center p-6 text-center"><span className="material-symbols-outlined text-4xl text-rose-500">error</span><p className="mt-3 font-bold text-neutral-800 dark:text-neutral-100">Unable to display this PDF</p><p className="mt-1 max-w-md text-sm text-neutral-500">{pdfPreview.error}</p><a href={pdfViewer.pdf.url} target="_blank" rel="noreferrer" className="mt-4 rounded-lg bg-[var(--portal-accent)] px-4 py-2 text-sm font-bold text-white">Download Original</a></div>}
          {pdfPreview.url && <iframe src={pdfPreview.url} title={`${pdfViewer.record.title} PDF preview`} className="h-full w-full flex-1 border-0 bg-white" />}
        </div>}
      </Modal>
    </div>
  );
};

export default LawOpsPage;
