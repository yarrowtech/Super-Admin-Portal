import React, { useEffect, useMemo, useState } from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

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
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[String(value || '').toLowerCase().replace(/ /g, '_')] || tone.draft}`}>
    {String(value || 'Unknown')}
  </span>
);

const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>{children}</section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, icon = 'description', action }) => (
  <header className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full bg-indigo-600" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
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

const Btn = ({ children, onClick, variant = 'primary', className = '', ...props }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
      variant === 'primary'
        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
        : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

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
  const [searchInput, setSearchInput] = useState(searchTerm);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

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

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Page header */}
      <PageHdr
        title={section.title}
        subtitle={`${filteredRecords.length} record${filteredRecords.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`}
        icon={section.icon || 'description'}
        action={
          <a
            href="#law-crud-form"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Record
          </a>
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
                className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-700 outline-none focus:border-indigo-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              />
            </div>
            {projectOptions.length > 0 && (
              <select
                value={selectedProjectId}
                onChange={(e) => onProjectChange?.(e.target.value)}
                className="h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
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

      {/* Privacy policy static info (section-specific) */}
      {sectionId === 'privacy-policy' && (
        <Card>
          <Inner>
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Policy Overview</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRIVACY_SECTIONS.map((item) => (
                <span
                  key={item.title}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
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
                        <span className="material-symbols-outlined mt-0.5 text-[14px] text-indigo-500">chevron_right</span>
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
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {record.priority && <Pill value={record.priority} />}
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
          title={`${section.navLabel} Register`}
          {...config}
        />
      </div>
    </div>
  );
};

export default LawOpsPage;
