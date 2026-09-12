import React, { useEffect, useMemo, useState } from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';
import { getLawBadgeClass, getLawPriorityClass, lawCardClass, lawControlClass, lawPrimaryButtonClass } from '../lawUi';
import ThemeToggleButton from '../../common/ThemeToggleButton';

// ─────────────────────────────────────────────────────────────────────────────
// Design System
// ─────────────────────────────────────────────────────────────────────────────
const tone = {
  active:     'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  pending:    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  in_review:  'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  attention:  'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  draft:      'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  archived:   'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  ready:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  critical:   'bg-rose-50 text-rose-700 ring-rose-200',
  high:       'bg-amber-50 text-amber-700 ring-amber-200',
  medium:     'bg-blue-50 text-blue-700 ring-blue-200',
  low:        'bg-neutral-100 text-neutral-600 ring-neutral-200',
};

const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getLawBadgeClass(value, tone[String(value || '').toLowerCase().replace(/ /g, '_')] || tone.draft)}`}>
    {String(value || 'Unknown')}
  </span>
);

const PriorityPill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getLawPriorityClass(value)}`}>
    {String(value || 'Medium')}
  </span>
);

const Card = ({ children, className = '' }) => (
  <section className={`${lawCardClass} ${className}`}>{children}</section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, icon = 'description', action }) => (
  <header className="mb-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full bg-[var(--portal-accent)]" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-accent)] shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <ThemeToggleButton />
      </div>
    </div>
  </header>
);

const EmptyState = ({ icon = 'description', title, subtitle }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center">
    <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">{icon}</span>
    <p className="font-semibold text-neutral-600 dark:text-neutral-300">{title}</p>
    {subtitle && <p className="text-sm text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
  </div>
);

const Skeleton = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

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
}) => {
  const section = getLawSection(sectionId);
  const config = LAW_FORM_CONFIG[sectionId] || {};
  const signalConfig = MODULE_SIGNAL_CONFIG[sectionId] || {};
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

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

  return (
      <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      {/* Page header */}
      <PageHdr
        title={section.title}
        subtitle={`${filteredRecords.length} record${filteredRecords.length === 1 ? '' : 's'} · ${selectedProjectName}${subtitle ? ` · ${subtitle}` : ''}`}
        icon={section.icon || 'description'}
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={lawPrimaryButtonClass}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {config.actionLabel || 'New Record'}
          </button>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <Inner className="py-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-50">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${section.navLabel.toLowerCase()} records…`}
                className={`${lawControlClass} w-full bg-neutral-50 pl-9 pr-3`}
              />
            </div>
            {projectOptions.length > 0 && (
              <select
                value={selectedProjectId}
                onChange={(e) => onProjectChange?.(e.target.value)}
                className={`${lawControlClass} bg-neutral-50 text-xs font-semibold`}
              >
                <option value="">All Projects</option>
                {projectOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            )}
            {lastUpdatedAt && !loading && (
              <span className="flex items-center text-xs text-neutral-400">
                Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </Inner>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><Inner className="py-4"><p className="text-xs font-semibold text-neutral-400">Open Pipeline</p><p className="mt-1 text-2xl font-black text-neutral-900 dark:text-white">{lifecycleStats.open}</p></Inner></Card>
        <Card><Inner className="py-4"><p className="text-xs font-semibold text-neutral-400">{signalConfig.attentionLabel || 'Needs Attention'}</p><p className="mt-1 text-2xl font-black text-rose-600">{lifecycleStats.attention}</p></Inner></Card>
        <Card><Inner className="py-4"><p className="text-xs font-semibold text-neutral-400">In Review</p><p className="mt-1 text-2xl font-black text-blue-600">{lifecycleStats.inReview}</p></Inner></Card>
        <Card><Inner className="py-4"><p className="text-xs font-semibold text-neutral-400">Evidence Attached</p><p className="mt-1 text-2xl font-black text-emerald-600">{lifecycleStats.withEvidence}</p></Inner></Card>
      </div>

      {/* Privacy policy static info (section-specific) */}
      {sectionId === 'privacy-policy' && (
        <Card>
          <Inner>
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
          </Inner>
        </Card>
      )}

      {/* Record list */}
      {loading ? (
        <Skeleton rows={5} />
      ) : filteredRecords.length === 0 ? (
        <Card>
          <Inner>
            <EmptyState
              icon={section.icon || 'description'}
              title={`No ${section.navLabel.toLowerCase()} records`}
              subtitle="Create your first record using the button above."
            />
          </Inner>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <Card key={record._id || record.id}>
              <Inner className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-neutral-900 dark:text-white">{record.title || 'Untitled'}</p>
                      {record.referenceNumber && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          {record.referenceNumber}
                        </span>
                      )}
                    </div>
                    {record.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{record.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      {record.owner && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          {record.owner}
                        </span>
                      )}
                      {record.dueDate && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {formatDate(record.dueDate) || record.dueDate}
                        </span>
                      )}
                      {record.recordType && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">label</span>
                          {record.recordType}
                        </span>
                      )}
                      {record.metadata?.recordType && !record.recordType && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">label</span>
                          {record.metadata.recordType}
                        </span>
                      )}
                      {signalConfig.primaryDate && record.metadata?.[signalConfig.primaryDate] && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">event_upcoming</span>
                          {signalConfig.primaryDateLabel}: {formatDate(record.metadata[signalConfig.primaryDate])}
                        </span>
                      )}
                    </div>
                    {signalConfig.detailFields?.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {signalConfig.detailFields.map((fieldName) => {
                          const field = config.metadataFields?.find((item) => item.name === fieldName);
                          const value = record.metadata?.[fieldName];
                          return value ? (
                            <div key={fieldName} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                              <p className="text-[10px] font-bold uppercase text-neutral-400">{field?.label || fieldName}</p>
                              <p className="truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200">{value}</p>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {record.priority && <PriorityPill value={record.priority} />}
                    {record.status && <Pill value={record.status} />}
                  </div>
                </div>
              </Inner>
            </Card>
          ))}
        </div>
      )}

      {/* LawRecordManager for CRUD */}
      <div id="law-crud-form" className="scroll-mt-6">
        <LawRecordManager
          section={sectionId}
          records={filteredRecords}
          saving={saving}
          onSaveRecord={onSaveRecord}
          onDeleteRecord={onDeleteRecord}
          formOpen={formOpen}
          onFormOpen={() => setFormOpen(true)}
          onFormClose={() => setFormOpen(false)}
          title={config.registerTitle || `${section.navLabel} Register`}
          {...config}
        />
      </div>
    </div>
  );
};

export default LawOpsPage;
