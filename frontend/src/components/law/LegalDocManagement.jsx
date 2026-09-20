import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createLegalDocument,
  getMyDocuments,
  getProjectDocuments,
  getLegalDocumentById,
  autoSaveDocument,
  saveDraft,
  submitDocument,
  getLegalDocumentPdf,
  getLegalListItems,
  getLegalResponseData,
  deleteLegalDocument,
  setDocumentCustomerAgreement,
} from '../../api/legalDocument';
import { lawApi } from '../../services/law';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import LegalDocEditor from './LegalDocEditor';
import LegalDocVersionHistory from './LegalDocVersionHistory';
import useLawProjectContext from './useLawProjectContext';
import { LAW_DOCUMENT_TYPES, LAW_PRIORITIES } from './lawStatus';
import { lawControlClass } from './lawUi';
import Modal from '../ui/Modal';
import CommonButton from '../common/Button';
import CommonStatusBadge from '../common/StatusBadge';

// ── Constants ─────────────────────────────────────────────────────────────────
const DOC_TYPES = LAW_DOCUMENT_TYPES.map((type) => type.value);
const PRIORITIES = LAW_PRIORITIES;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;


const PRIORITY_COLORS = {
  Low: 'text-emerald-600', Medium: 'text-amber-600', High: 'text-orange-600', Critical: 'text-red-600',
};

const SORT_OPTIONS = [
  { value: 'updated-desc', label: 'Latest updated' },
  { value: 'updated-asc', label: 'Oldest updated' },
  { value: 'created-desc', label: 'Newest created' },
  { value: 'title-asc', label: 'Name A-Z' },
  { value: 'title-desc', label: 'Name Z-A' },
  { value: 'priority-desc', label: 'Priority high first' },
];

const PRIORITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const LEGAL_TEMPLATES = {
  blank: { label: 'Blank legal document', content: '' },
  nda: {
    label: 'NDA',
    content: '<h1>Non-Disclosure Agreement</h1><p>This Non-Disclosure Agreement is entered into on [Date] between [Company] and [Counterparty].</p><h2>1. Confidential Information</h2><p>Confidential Information includes business, technical, financial, operational, customer, and project information disclosed in any form.</p><h2>2. Obligations</h2><p>The receiving party shall protect Confidential Information with reasonable care and use it only for the permitted purpose.</p><h2>3. Term</h2><p>This agreement remains effective for [Term] from the effective date.</p><h2>4. Return or Destruction</h2><p>Upon request, the receiving party shall return or destroy Confidential Information and certify completion.</p><h2>5. Governing Law</h2><p>This agreement shall be governed by the laws of [Jurisdiction].</p>',
  },
  agreement: {
    label: 'Service Agreement',
    content: '<h1>Service Agreement</h1><p>This Service Agreement is made between [Company] and [Service Provider].</p><h2>1. Scope of Services</h2><p>The provider shall perform the services described in the attached statement of work.</p><h2>2. Deliverables</h2><p>Deliverables, milestones, and acceptance criteria shall be documented and approved digitally.</p><h2>3. Fees and Payment</h2><p>Fees, payment schedule, taxes, and expenses shall be handled as agreed by both parties.</p><h2>4. Intellectual Property</h2><p>Work product ownership and license rights shall transfer as stated in this agreement.</p><h2>5. Confidentiality</h2><p>Both parties shall protect confidential information and comply with applicable policies.</p>',
  },
  policy: {
    label: 'Company Policy',
    content: '<h1>Company Policy</h1><h2>1. Purpose</h2><p>This policy defines the rules, responsibilities, and approval requirements for [Subject].</p><h2>2. Scope</h2><p>This policy applies to employees, contractors, vendors, and authorized users where applicable.</p><h2>3. Requirements</h2><p>All activities must follow documented controls, approval workflows, and record retention rules.</p><h2>4. Exceptions</h2><p>Exceptions require written approval from authorized leadership.</p><h2>5. Review Cycle</h2><p>This policy shall be reviewed periodically and updated when business or legal requirements change.</p>',
  },
};

// "Start from" choices shown in the New document dialog (template keys match LEGAL_TEMPLATES).
const START_OPTIONS = [
  { key: 'blank', sourceType: 'blank', templateKey: '', label: 'Blank document', desc: 'An empty page. Write it yourself.', icon: 'draft', type: null },
  { key: 'nda', sourceType: 'template', templateKey: 'nda', label: 'NDA', desc: 'Keeps shared business information confidential.', icon: 'lock', type: 'NDA' },
  { key: 'agreement', sourceType: 'template', templateKey: 'agreement', label: 'Service Agreement', desc: 'Scope, fees, deliverables and ownership for services.', icon: 'handshake', type: 'Agreement' },
  { key: 'policy', sourceType: 'template', templateKey: 'policy', label: 'Company Policy', desc: 'Rules and responsibilities for staff or vendors.', icon: 'policy', type: 'Policy' },
  { key: 'upload', sourceType: 'upload', templateKey: '', label: 'Upload a file', desc: 'Start from an existing Word or PDF file.', icon: 'upload_file', type: null },
];

const FieldError =({ error }) => error ? <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null;

const fieldBaseClass = `${lawControlClass} w-full`;
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const STATUS_TONE = { Draft: 'neutral', Pending: 'warning', Approved: 'success', Rejected: 'danger' };
const PRIORITY_TONE = { Low: 'neutral', Medium: 'info', High: 'warning', Critical: 'danger' };

// Plain-language wording for each workflow state (values stay as the API sends them).
const STATUS_INFO = {
  Draft: { label: 'Draft', hint: 'Still being written. You can keep editing.' },
  Pending: { label: 'Awaiting approval', hint: 'Sent for approval. Editing is paused until a decision is made.' },
  Approved: { label: 'Approved', hint: 'Finalized and locked. It is read-only, but you can download the PDF.' },
  Rejected: { label: 'Changes requested', hint: 'Sent back with remarks. Edit it, then finalize again.' },
};

const GUIDE_STORAGE_KEY = 'legalDocsQuickGuideDismissed';

// Width of the documents list (drag the splitter, or use the arrow keys on it).
const LIST_WIDTH_KEY = 'legalDocsListWidth';
const LIST_WIDTH_MIN = 220;
const LIST_WIDTH_MAX = 520;
const LIST_WIDTH_DEFAULT = 320;
const clampListWidth = (value) => Math.max(LIST_WIDTH_MIN, Math.min(LIST_WIDTH_MAX, Math.round(value)));
const readListWidth = () => {
  try {
    const saved = Number(localStorage.getItem(LIST_WIDTH_KEY));
    if (saved) return clampListWidth(saved);
  } catch { /* storage unavailable */ }
  return LIST_WIDTH_DEFAULT;
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};

const timeAgo = (value) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
};

const StatusBadge = ({ status }) => {
  const info = STATUS_INFO[status];
  return (
    <span title={info?.hint || ''} className="shrink-0">
      <CommonStatusBadge tone={STATUS_TONE[status] || 'neutral'} label={info?.label || status} />
    </span>
  );
};

const PriorityBadge = ({ priority }) => (
  <CommonStatusBadge tone={PRIORITY_TONE[priority] || 'neutral'} label={priority} dot={false} />
);

// ── New / Edit Document Form (modal) ──────────────────────────────────────────
const isRealProjectId = (projectId) => Boolean(projectId) && !String(projectId).startsWith('virtual-');

const resolveProjectName = (projectId) => {
  if (!isRealProjectId(projectId)) return 'In-house Company Legal';
  try {
    const candidates = [
      localStorage.getItem('activeProjectName'),
      localStorage.getItem('selectedProjectName'),
      localStorage.getItem('projectName'),
    ].filter(Boolean);
    return candidates[0] || 'Selected Project';
  } catch {
    return 'Selected Project';
  }
};

const SOURCE_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// ── New Legal Document Modal — create first, manage details afterward ─────────
const NewLegalDocumentModal = ({ scope, projects, onClose, onCreated }) => {
  const { token } = useAuth();
  const { confirm } = useConfirmDialog();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Agreement');
  const [priority, setPriority] = useState('Medium');
  const [documentScope, setDocumentScope] = useState(scope.isProjectScope ? 'project' : 'company');
  const [projectId, setProjectId] = useState(scope.projectId || '');
  const [sourceType, setSourceType] = useState('blank');
  const [templateKey, setTemplateKey] = useState('');
  const [sourceFile, setSourceFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleClose = async () => {
    if (!touched) return onClose();
    const discard = await confirm({ title: 'Discard this new document?', message: 'Nothing has been created yet. If you close now, what you entered will be lost.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', tone: 'warning' });
    if (discard) onClose();
  };
  // Modal re-runs its focus logic whenever onClose changes identity, which would
  // pull focus off the title field on every keystroke — keep a stable reference.
  const handleCloseRef = useRef(handleClose);
  useEffect(() => { handleCloseRef.current = handleClose; });
  const stableClose = useCallback(() => handleCloseRef.current(), []);

  const selectSourceFile = (file) => {
    if (!file) return;
    setTouched(true);
    const extensionOk = /\.(pdf|docx?)$/i.test(file.name || '');
    if (!SOURCE_UPLOAD_TYPES.has(file.type) && !extensionOk) {
      setErrors((prev) => ({ ...prev, sourceFile: 'Only PDF or DOC/DOCX files are supported.' }));
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErrors((prev) => ({ ...prev, sourceFile: 'File must be 10 MB or smaller.' }));
      return;
    }
    setErrors((prev) => ({ ...prev, sourceFile: '' }));
    setSourceFile(file);
  };

  const validate = () => {
    const next = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) next.title = 'Document title is required.';
    else if (trimmedTitle.length < 3) next.title = 'Title must be at least 3 characters.';
    if (documentScope === 'project' && !isRealProjectId(projectId)) {
      next.projectId = 'Select a project, or choose In-house under "Change details".';
      setShowDetails(true);
    }
    if (sourceType === 'template' && !templateKey) next.templateKey = 'Select a template.';
    if (sourceType === 'upload' && !sourceFile) next.sourceFile = 'Upload a document file.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const chosenProject = projects.find((item) => String(item._id || item.id) === String(projectId));
      const template = LEGAL_TEMPLATES[templateKey];
      const payload = {
        title: title.trim(),
        type,
        priority,
        scope: documentScope,
        sourceType,
        projectName: documentScope === 'project' && chosenProject ? (chosenProject.name || chosenProject.projectName || chosenProject.projectCode || '') : '',
        templateId: sourceType === 'template' ? templateKey : '',
        templateName: sourceType === 'template' ? template?.label : '',
        content: sourceType === 'template' ? (template?.content || '') : '',
      };
      if (documentScope === 'project') payload.projectId = projectId;
      if (sourceFile) payload.sourceFile = sourceFile;
      const res = await createLegalDocument(token, payload);
      onCreated(getLegalResponseData(res));
    } catch (err) {
      setApiError(err.message || 'Unable to create legal document.');
    } finally {
      setLoading(false);
    }
  };

  const selectedStart = sourceType === 'template' ? templateKey : sourceType;
  const chosenProjectName = (() => {
    const p = projects.find((item) => String(item._id || item.id) === String(projectId));
    return p ? (p.name || p.projectName || p.projectCode || 'Selected project') : (scope.projectName || '');
  })();
  const filedUnder = documentScope === 'project' && isRealProjectId(projectId) ? chosenProjectName || 'Selected project' : documentScope === 'project' ? 'a project (not chosen yet)' : 'In-house company legal';

  const pickStart = (option) => {
    setTouched(true);
    setSourceType(option.sourceType);
    setTemplateKey(option.templateKey);
    if (option.type) setType(option.type);
    setErrors((prev) => ({ ...prev, templateKey: '', sourceFile: '' }));
  };

  return (
    <Modal
      open
      onClose={stableClose}
      title="New document"
      description="Choose what to start from, give it a title, and click Create. You can change everything later."
      className="w-[calc(100%-24px)] sm:max-w-[700px]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <CommonButton variant="secondary" onClick={stableClose} disabled={loading}>Cancel</CommonButton>
          <CommonButton
            variant="accent"
            onClick={handleCreate}
            disabled={loading}
            icon={<span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'add'}</span>}
          >
            {loading ? 'Creating…' : 'Create document'}
          </CommonButton>
        </div>
      }
    >
      <div className="space-y-5">
        {apiError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">{apiError}</div>}

        <div>
          <span className={labelClass}>Step 1 · What do you want to start from?</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Start from">
            {START_OPTIONS.map((option) => {
              const selected = selectedStart === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickStart(option)}
                  className={`flex min-h-[64px] items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] ${selected ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'}`}
                >
                  <span className={`material-symbols-outlined mt-0.5 text-[22px] ${selected ? 'text-[var(--portal-accent)]' : 'text-neutral-400'}`}>{option.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-neutral-900 dark:text-neutral-100">{option.label}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{option.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <FieldError error={errors.templateKey} />
        </div>

        {sourceType === 'upload' && (
          <div>
            <label htmlFor="legal-source-file" className={labelClass}>Choose a file *</label>
            <label
              htmlFor="legal-source-file"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); selectSourceFile(e.dataTransfer.files?.[0]); }}
              className="flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center transition hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900/60"
            >
              <span className="material-symbols-outlined text-2xl text-[var(--portal-accent)]">upload_file</span>
              <span className="mt-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-100">Drop a Word or PDF file here, or click to browse</span>
              <span className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">Uploaded PDFs are imported as reference documents. Max 10 MB.</span>
              <input id="legal-source-file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => selectSourceFile(e.target.files?.[0])} />
            </label>
            {sourceFile && !errors.sourceFile && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
                <span className="material-symbols-outlined text-[18px] text-[var(--portal-accent)]">description</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{sourceFile.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => setSourceFile(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-rose-600 dark:hover:bg-neutral-800" aria-label="Remove uploaded document" title="Remove uploaded document">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            )}
            <FieldError error={errors.sourceFile} />
          </div>
        )}

        <div>
          <label htmlFor="legal-title" className={labelClass}>Step 2 · Document title *</label>
          <input
            id="legal-title"
            autoFocus
            value={title}
            onChange={(e) => { setTouched(true); setTitle(e.target.value); setErrors((prev) => ({ ...prev, title: '' })); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
            placeholder="e.g. Vendor Service Agreement"
            maxLength={180}
            className={`${fieldBaseClass} min-h-10`}
          />
          <FieldError error={errors.title} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Will be saved as a <strong>{type}</strong> ({priority} priority) under <strong>{filedUnder}</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
            >
              <span className="material-symbols-outlined text-[16px]">{showDetails ? 'expand_less' : 'tune'}</span>
              {showDetails ? 'Hide details' : 'Change details'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="legal-type" className={labelClass}>Document type</label>
                  <select id="legal-type" value={type} onChange={(e) => { setTouched(true); setType(e.target.value); }} className={fieldBaseClass}>
                    {LAW_DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="legal-priority" className={labelClass}>Priority</label>
                  <select id="legal-priority" value={priority} onChange={(e) => { setTouched(true); setPriority(e.target.value); }} className={fieldBaseClass}>
                    {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <span className={labelClass}>Where does it belong?</span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Document scope">
                  {[
                    { value: 'company', label: 'In-house', icon: 'business', hint: 'Company-wide, not tied to a project' },
                    { value: 'project', label: 'Project', icon: 'folder', hint: 'Belongs to one client project' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={documentScope === item.value}
                      title={item.hint}
                      onClick={() => { setTouched(true); setDocumentScope(item.value); if (item.value === 'company') setProjectId(''); }}
                      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] ${documentScope === item.value ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {documentScope === 'project' && (showDetails || errors.projectId) && (
            <div className="mt-3">
              <label htmlFor="legal-project" className={labelClass}>Project *</label>
              <select
                id="legal-project"
                value={projectId}
                onChange={(e) => { setTouched(true); setProjectId(e.target.value); setErrors((prev) => ({ ...prev, projectId: '' })); }}
                disabled={scope.isProjectScope}
                className={`${fieldBaseClass} disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:disabled:bg-neutral-800/60`}
              >
                <option value="">Select project</option>
                {projects.map((project) => {
                  const id = project._id || project.id;
                  const name = project.name || project.projectName || project.projectCode || id;
                  return <option key={id} value={id}>{name}</option>;
                })}
              </select>
              {scope.isProjectScope && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Matches the project you're currently viewing ({scope.projectName}). Switch to "In-house" to file this elsewhere.</p>
              )}
              <FieldError error={errors.projectId} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const VersionPreviewModal = ({ version, onClose }) => (
  <Modal open onClose={onClose} title={`Preview: ${version.version}`} description={`By ${version.editedByName} • ${new Date(version.createdAt).toLocaleString()}`} className="sm:max-w-4xl">
    <div className="-m-4 lg:-m-5 flex max-h-[70vh] flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6 bg-neutral-100 dark:bg-neutral-950">
        <div className="mx-auto bg-white dark:bg-neutral-900 shadow"
          style={{
            width: '210mm',
            minHeight: '297mm',
            maxWidth: '100%',
            padding: '20mm 25mm',
            boxSizing: 'border-box',
            fontFamily: "'Times New Roman', serif",
            fontSize: '12pt',
            lineHeight: 1.8,
          }}
          dangerouslySetInnerHTML={{ __html: version.content }} />
      </div>
    </div>
  </Modal>
);
// ── Main LegalDocManagement Component ─────────────────────────────────────────
const LegalDocManagement = () => {
  const { token, user } = useAuth();
  const toast = useToast();
  const editorRef = useRef(null);
  const moreActionsRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const { projectId: selectedProjectId, setProject } = useLawProjectContext(projects);
  const [projectFilter, setProjectFilter] = useState(selectedProjectId || 'company');

  // The dropdown is the single control for "which project am I looking at" —
  // picking a real project locks the URL to it (so it survives reload/sidebar
  // nav), picking In-house company legal clears that lock.
  const handleProjectFilterChange = (value) => {
    if (isRealProjectId(value)) {
      setProject(value);
      return;
    }
    setProjectFilter(value);
    if (selectedProjectId) setProject('');
  };
  const scope = useMemo(() => {
    const isProjectScope = Boolean(selectedProjectId);
    const project = projects.find((item) => String(item._id || item.id) === String(selectedProjectId));
    const projectName =
      project?.name ||
      project?.projectName ||
      project?.projectCode ||
      resolveProjectName(selectedProjectId);
    return {
      isProjectScope,
      projectId: selectedProjectId,
      projectName: isProjectScope ? projectName : '',
      label: isProjectScope ? `${projectName} legal` : 'In-house Company Legal',
    };
  }, [projects, selectedProjectId]);

  // List state
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState('updated-desc');
  const [searchTerm, setSearchTerm] = useState('');
  // Status counts must not collapse to zero when a status filter is active, so we
  // keep the last list fetched without a status filter for the summary chips.
  const [statusSource, setStatusSource] = useState({ key: '', items: [] });
  const [showGuide, setShowGuide] = useState(() => {
    try { return localStorage.getItem(GUIDE_STORAGE_KEY) !== '1'; } catch { return true; }
  });
  const dismissGuide = () => {
    setShowGuide(false);
    try { localStorage.setItem(GUIDE_STORAGE_KEY, '1'); } catch { /* storage unavailable */ }
  };
  const openGuide = () => {
    setShowGuide(true);
    try { localStorage.removeItem(GUIDE_STORAGE_KEY); } catch { /* storage unavailable */ }
  };

  // Editor state
  const [activeDoc, setActiveDoc] = useState(null); // currently open doc
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [listWidth, setListWidth] = useState(readListWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const bodyRef = useRef(null);
  const draggingRef = useRef(false);

  // Remember the list width once a drag is finished (not on every pixel).
  useEffect(() => {
    if (isDragging) return;
    try { localStorage.setItem(LIST_WIDTH_KEY, String(listWidth)); } catch { /* storage unavailable */ }
  }, [listWidth, isDragging]);

  const onSplitterPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
  };
  const onSplitterPointerMove = (event) => {
    if (!draggingRef.current || !bodyRef.current) return;
    setListWidth(clampListWidth(event.clientX - bodyRef.current.getBoundingClientRect().left));
  };
  const endSplitterDrag = (event) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsDragging(false);
  };
  const onSplitterKeyDown = (event) => {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === 'ArrowLeft') setListWidth((w) => clampListWidth(w - step));
    else if (event.key === 'ArrowRight') setListWidth((w) => clampListWidth(w + step));
    else if (event.key === 'Home') setListWidth(LIST_WIDTH_MIN);
    else if (event.key === 'End') setListWidth(LIST_WIDTH_MAX);
    else if (event.key === 'Enter') setListWidth(LIST_WIDTH_DEFAULT);
    else return;
    event.preventDefault();
  };
  const [showMoreActions, setShowMoreActions] = useState(false);
  const hideChrome = isEditorFullscreen;

  useEffect(() => {
    if (!showMoreActions) return undefined;
    const closeMenu = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && moreActionsRef.current?.contains(event.target)) return;
      setShowMoreActions(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeMenu);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeMenu);
    };
  }, [showMoreActions]);

  // Modals
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    lawApi.getProjects(token, { limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setProjects(res?.data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => { cancelled = true; };
  }, [token]);

  // ── Fetch documents ─────────────────────────────────────────────────────────
  // Requests can resolve out of order (e.g. switching projects fires a new
  // call before the previous one's response lands) — fetchSeqRef lets a
  // response detect it's stale and skip updating state so it can't clobber
  // a newer, already-applied result with an older error or document list.
  const fetchSeqRef = useRef(0);
  const fetchDocs = useCallback(async (overrides = {}) => {
    const requestSeq = ++fetchSeqRef.current;
    setLoading(true);
    setError('');
    try {
      const nextFilterStatus = overrides.filterStatus ?? filterStatus;
      const nextFilterType = overrides.filterType ?? filterType;
      const nextFilterPriority = overrides.filterPriority ?? filterPriority;
      const nextSearchTerm = overrides.searchTerm ?? searchTerm;
      const nextSortBy = overrides.sortBy ?? sortBy;
      const params = {};
      params.limit = 100;
      if (nextFilterStatus) params.status = nextFilterStatus;
      if (nextFilterType) params.type = nextFilterType;
      if (nextFilterPriority) params.priority = nextFilterPriority;
      if (nextSearchTerm) params.search = nextSearchTerm;
      if (nextSortBy) params.sort = nextSortBy;

      // A single project is in view (locked via URL, or picked from the filter
      // dropdown) — show every document tagged to it, not just ones this user
      // authored, so teammates' documents for the project are visible too.
      const targetProjectId = selectedProjectId || (isRealProjectId(projectFilter) ? projectFilter : '');
      let res;
      if (targetProjectId) {
        params.projectId = targetProjectId;
        res = await getProjectDocuments(token, params);
      } else {
        params.scope = 'company';
        res = await getMyDocuments(token, params);
      }
      if (requestSeq !== fetchSeqRef.current) return;
      const items = getLegalListItems(res);
      const visibleItems = items.filter((doc) => {
        const docProjectId = String(doc.projectId || '');
        if (targetProjectId) return docProjectId === targetProjectId;
        return !docProjectId;
      });
      setDocs(visibleItems);
      if (!nextFilterStatus) setStatusSource({ key: targetProjectId || 'company', items: visibleItems });
    } catch (err) {
      if (requestSeq !== fetchSeqRef.current) return;
      setError(err.message || 'Failed to load documents');
    } finally {
      if (requestSeq === fetchSeqRef.current) setLoading(false);
    }
  }, [token, filterStatus, filterType, filterPriority, searchTerm, sortBy, selectedProjectId, projectFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchDocs(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchDocs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveDoc(null);
      setEditorContent('');
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedProjectId]);

  // ── Open a document for editing ─────────────────────────────────────────────
  const openDoc = async (id) => {
    setError('');
    try {
      const res = await getLegalDocumentById(token, id);
      const doc = getLegalResponseData(res);
      setLastSavedAt(null);
      setSaveStatus('idle');
      setActiveDoc(doc);
      setEditorContent(doc.latestContent || '');
      if (editorRef.current) {
        editorRef.current.setContent(doc.latestContent || '');
        editorRef.current.focus();
      }
    } catch (err) {
      const message = err.message || 'Unable to load document.';
      setError(message);
      toast.error(message);
    }
  };

  // ── Auto-save handler ───────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleAutoSave = useCallback(async (html) => {
    if (!activeDoc?._id || activeDoc.isLocked) return;
    setSaveStatus('saving');
    try {
      await autoSaveDocument(token, activeDoc._id, html);
      setActiveDoc((prev) => ({ ...prev, latestContent: html }));
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  }, [token, activeDoc]);

  // ── Manual Save Draft ───────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleSaveDraft = useCallback(async (html) => {
    if (!activeDoc?._id || activeDoc.isLocked) return;
    setSaveStatus('saving');
    try {
      const res = await saveDraft(token, activeDoc._id, {
        content: html,
        title: activeDoc.title,
        type: activeDoc.type,
        priority: activeDoc.priority,
        projectId: activeDoc.projectId || undefined,
        changeSummary: 'Draft saved',
      });
      const updatedDoc = getLegalResponseData(res);
      setActiveDoc(updatedDoc);
      setDocs((prev) => prev.map((d) => (d._id === updatedDoc._id ? { ...d, ...updatedDoc } : d)));
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
      setTimeout(() => setSaveStatus('idle'), 3000);
      toast.success('Your draft has been saved.');
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      toast.error(`${err.message || 'Save failed.'} Your changes are still available locally.`);
    }
  }, [token, activeDoc, toast]);

  // ── Submit to CEO ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Finalize this document?',
      message: `"${activeDoc?.title}" will be marked Approved and locked. You will not be able to edit it after this, but you can still view it and download the PDF.${activeDoc?.status === 'Rejected' ? ' Because changes were requested earlier, a new major version will be created.' : ''} Not ready yet? Choose "Not yet" and use Save draft instead.`,
      confirmLabel: 'Yes, finalize',
      cancelLabel: 'Not yet',
      tone: 'warning',
    });
    if (!confirmed) return;
    const html = editorRef.current?.getContent() || editorContent;
    setSaveStatus('saving');
    try {
      const res = await submitDocument(token, activeDoc._id, { content: html });
      const updatedDoc = getLegalResponseData(res);
      setActiveDoc(updatedDoc);
      setDocs((prev) => prev.map((d) => (d._id === updatedDoc._id ? { ...d, ...updatedDoc } : d)));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      toast.error(err.message || 'Submission failed. Your draft remains available.');
    }
  }, [token, activeDoc, editorContent, confirm, toast]);

  // ── Document created callback ───────────────────────────────────────────────
  const handleDocCreated = async (doc) => {
    setShowNewDocModal(false);
    toast.success(`"${doc?.title || 'Legal document'}" was created as a draft.`, 'Document created');
    setFilterStatus('');
    setFilterType('');
    setFilterPriority('');
    setSearchTerm('');
    setDocs((prev) => [doc, ...prev.filter((item) => item._id !== doc._id)]);
    const persistedId = doc?._id || doc?.id;
    if (persistedId) await openDoc(persistedId);
    await fetchDocs({ filterStatus: '', filterType: '', filterPriority: '', searchTerm: '' });
  };

  const canDelete = ['law_head', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());

  // ── Move a document to Trash (soft delete) ──────────────────────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleDeleteDoc = useCallback(async (doc) => {
    const shouldProceed = await confirm({
      title: 'Move to Trash?',
      message: `"${doc.title}" will be moved to Trash. It can be restored later.`,
      confirmLabel: 'Move to Trash',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!shouldProceed) return;
    try {
      await deleteLegalDocument(token, doc._id);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
      if (activeDoc?._id === doc._id) {
        setActiveDoc(null);
        setEditorContent('');
      }
      toast.success(`"${doc.title}" was moved to trash.`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  }, [token, activeDoc, confirm, toast]);

  // ── Record the project client's agreement to this document ─────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleSetCustomerAgreement = useCallback(async (agreed) => {
    if (!activeDoc?._id) return;
    if (agreed) {
      const confirmed = await confirm({
        title: 'Mark customer as agreed?',
        message: `Confirm that ${scope.projectName || 'the client'} has agreed to "${activeDoc.title}". This is recorded against the document.`,
        confirmLabel: 'Mark Agreed',
        cancelLabel: 'Cancel',
        tone: 'warning',
      });
      if (!confirmed) return;
    }
    try {
      const res = await setDocumentCustomerAgreement(token, activeDoc._id, agreed);
      const updatedDoc = getLegalResponseData(res);
      setActiveDoc((prev) => ({ ...prev, customerAgreement: updatedDoc.customerAgreement }));
      setDocs((prev) => prev.map((d) => (d._id === activeDoc._id ? { ...d, customerAgreement: updatedDoc.customerAgreement } : d)));
      toast.success(agreed ? 'Customer agreement recorded.' : 'Customer agreement cleared.');
    } catch (err) {
      toast.error(err.message || 'Failed to update customer agreement');
    }
  }, [token, activeDoc, confirm, toast, scope.projectName]);

  const handleDownloadPdf = useCallback(async () => {
    if (!activeDoc?._id) return;
    try {
      const { blob, filename } = await getLegalDocumentPdf(token, activeDoc._id);
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    }
  }, [token, activeDoc, toast]);

  // ── Filtered docs ────────────────────────────────────────────────────────────
  const filteredDocs = docs.filter((d) => {
    if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterPriority && d.priority !== filterPriority) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'updated-asc') return new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
    if (sortBy === 'created-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortBy === 'title-asc') return String(a.title || '').localeCompare(String(b.title || ''));
    if (sortBy === 'title-desc') return String(b.title || '').localeCompare(String(a.title || ''));
    if (sortBy === 'priority-desc') return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  const scopeKey = selectedProjectId || (isRealProjectId(projectFilter) ? projectFilter : 'company');
  const hasFilters = Boolean(filterStatus || filterType || filterPriority || searchTerm || sortBy !== 'updated-desc');
  const clearFilters = () => { setFilterStatus(''); setFilterType(''); setFilterPriority(''); setSearchTerm(''); setSortBy('updated-desc'); };

  // Chips keep showing real counts even while a status filter is applied.
  const stats = useMemo(() => {
    const source = filterStatus && statusSource.key === scopeKey ? statusSource.items : docs;
    return {
      total: source.length,
      draft: source.filter((d) => d.status === 'Draft').length,
      pending: source.filter((d) => d.status === 'Pending').length,
      approved: source.filter((d) => d.status === 'Approved').length,
      rejected: source.filter((d) => d.status === 'Rejected').length,
      projectLinked: source.filter((d) => d.projectId).length,
      company: source.filter((d) => !d.projectId).length,
    };
  }, [docs, statusSource, filterStatus, scopeKey]);

  // ── Determine if editor is editable ────────────────────────────────────────
  const isEditable = activeDoc && !activeDoc.isLocked && ['Draft', 'Rejected'].includes(activeDoc?.status);

  const STATUS_CHIPS = [
    { status: '', label: 'All', value: stats.total, icon: 'description', hint: 'Show every document', pill: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
    { status: 'Draft', label: 'Draft', value: stats.draft, icon: 'edit_note', hint: STATUS_INFO.Draft.hint, pill: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
    { status: 'Pending', label: STATUS_INFO.Pending.label, value: stats.pending, icon: 'hourglass_top', hint: STATUS_INFO.Pending.hint, pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
    { status: 'Approved', label: STATUS_INFO.Approved.label, value: stats.approved, icon: 'verified', hint: STATUS_INFO.Approved.hint, pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
    { status: 'Rejected', label: STATUS_INFO.Rejected.label, value: stats.rejected, icon: 'cancel', hint: STATUS_INFO.Rejected.hint, pill: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  ];

  const menuItemClass = 'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:text-neutral-100 dark:hover:bg-neutral-800';
  const filterSelectClass = 'h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-700 focus:border-[var(--portal-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300';
  const filterLabelClass = 'mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400';

  // ─────────────────────────────────────────────────────────────────────────────
  const showListInFlow = !hideChrome && (isDesktop ? !isNavCollapsed : !activeDoc);
  const showDrawer = !hideChrome && !isDesktop && Boolean(activeDoc) && drawerOpen;

  // Layout chain (see report): root has a fixed viewport-derived height; every flex level below
  // has min-h-0 + overflow-hidden, and only the document canvas / list scroll internally.
  return (
    <div className="flex h-[calc(100dvh-2rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 md:h-[calc(100dvh-3rem)] 2xl:h-[calc(100dvh-4rem)]">

      {/* ── TOP BAR ── */}
      {!hideChrome && (
      <div className="shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="h-1 w-full bg-[var(--portal-accent)]" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 lg:px-4">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-accent)] shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-white">gavel</span>
            </div>
            <h1 className="text-lg font-black leading-tight text-neutral-900 dark:text-neutral-100">Legal Documents</h1>
          </div>

          {/* Project switcher — always visible so you can switch projects or jump back
              to the aggregate view even when the URL is locked to one. */}
          <div className="flex items-center gap-2">
            <label htmlFor="legal-project-filter" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Project</label>
            <select
              id="legal-project-filter"
              value={selectedProjectId || projectFilter}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              title="Choose In-house for company-wide documents, or pick a project to see only its documents."
              className={`${lawControlClass} min-h-9 max-w-[16rem] bg-neutral-50`}
            >
              <option value="company">In-house (company-wide)</option>
              {projects.map((project) => {
                const id = project._id || project.id;
                const name = project.name || project.projectName || project.projectCode || id;
                return <option key={id} value={id}>{name}</option>;
              })}
            </select>
          </div>

          {/* Status chips — click one to filter the list */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter documents by status">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Show:</span>
            {STATUS_CHIPS.map(({ status, label, value, icon, hint, pill }) => {
              const active = filterStatus === status;
              return (
                <button
                  key={label}
                  type="button"
                  title={active && status ? `${hint} Click again to show all.` : hint}
                  aria-pressed={active}
                  onClick={() => setFilterStatus(active ? '' : status)}
                  className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] ${pill} ${active ? 'ring-2 ring-[var(--portal-accent)]' : 'hover:brightness-95'}`}
                >
                  <span className="material-symbols-outlined text-[15px]">{icon}</span>
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-sm font-bold">{value}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 2xl:flex">
              <span title="In-house documents are company-wide and not tied to a project" className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
                <span className="material-symbols-outlined text-[13px]">business</span>
                In-house: {stats.company}
              </span>
              <span title="Project documents belong to one client project" className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
                <span className="material-symbols-outlined text-[13px]">folder</span>
                Project: {stats.projectLinked}
              </span>
            </div>
            <CommonButton variant="secondary" onClick={showGuide ? dismissGuide : openGuide} title="Show or hide the quick guide" icon={<span className="material-symbols-outlined text-[17px]">help</span>}>Help</CommonButton>
            <CommonButton variant="accent" onClick={() => setShowNewDocModal(true)} title="Start a new legal document" icon={<span className="material-symbols-outlined text-[17px]">add</span>}>New document</CommonButton>
          </div>
        </div>
      </div>
      )}

      {/* ── QUICK GUIDE ── */}
      {!hideChrome && showGuide && (
        <section aria-label="Quick guide" className="max-h-[30vh] shrink-0 overflow-y-auto border-b border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-900/10 lg:px-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-[20px] text-sky-600 dark:text-sky-400">lightbulb</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-sky-900 dark:text-sky-200">Quick guide</p>
              <ul className="mt-1 grid gap-x-6 gap-y-1 text-xs text-sky-900/90 dark:text-sky-200/90 md:grid-cols-2">
                <li><strong>Create:</strong> click <em>New document</em>, pick a template, type a title and click <em>Create document</em>.</li>
                <li><strong>Save:</strong> your work saves by itself while you type. Click <em>Save draft</em> to save right now.</li>
                <li><strong>Finalize:</strong> when it is ready, click <em>Finalize document</em>. It becomes Approved and locked, so it can no longer be edited.</li>
                <li><strong>Find your drafts:</strong> they stay in the list on the left with a Draft label. Click <em>Draft</em> at the top to see only those.</li>
              </ul>
            </div>
            <button type="button" onClick={dismissGuide} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-sky-800 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-200 dark:hover:bg-sky-900/30" aria-label="Dismiss quick guide">
              Got it
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </section>
      )}

      <div ref={bodyRef} className={`relative flex min-h-0 flex-1 overflow-hidden ${isDragging ? 'select-none' : ''}`}>

        {/* ── LEFT PANEL: Document List (in-flow on desktop, slide-over drawer on narrow screens) ── */}
        {showDrawer && (
          <div className="absolute inset-0 z-20 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
        )}
        {(showListInFlow || showDrawer) && (
        <div
          id="legal-doc-list"
          style={showListInFlow && isDesktop ? { width: listWidth, maxWidth: '55%' } : undefined}
          className={showDrawer
            ? 'absolute inset-y-0 left-0 z-30 flex w-[min(88vw,360px)] flex-col border-r border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900'
            : `flex min-h-0 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${isDesktop ? '' : 'w-full'}`}
        >

          {/* Panel header */}
          <div className="shrink-0 border-b border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Your documents</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
                  {loading ? 'Loading…' : hasFilters ? `${filteredDocs.length} found` : `${filteredDocs.length} document${filteredDocs.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowNewDocModal(true)}
                  title="Start a new legal document"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  New
                </button>
                {(isDesktop || activeDoc) && (
                <button
                  type="button"
                  onClick={() => (isDesktop ? setIsNavCollapsed(true) : setDrawerOpen(false))}
                  title={isDesktop ? 'Hide the document list to get more room' : 'Close the document list'}
                  aria-label={isDesktop ? 'Hide the document list' : 'Close the document list'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:hover:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[18px]">{isDesktop ? 'left_panel_close' : 'close'}</span>
                </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
              <input
                type="search"
                aria-label="Search documents by title"
                placeholder="Search by title…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-10 pr-3 text-sm text-neutral-700 placeholder-neutral-400 focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              />
            </div>

            {/* Filters */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Filters</p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    Clear filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="legal-filter-status" className={filterLabelClass}>Status</label>
                  <select id="legal-filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={filterSelectClass}>
                    <option value="">Any status</option>
                    {['Draft', 'Pending', 'Approved', 'Rejected'].map((s) => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="legal-filter-type" className={filterLabelClass}>Type</label>
                  <select id="legal-filter-type" value={filterType} onChange={(e) => setFilterType(e.target.value)} className={filterSelectClass}>
                    <option value="">Any type</option>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="legal-filter-priority" className={filterLabelClass}>Priority</label>
                  <select id="legal-filter-priority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={filterSelectClass}>
                    <option value="">Any priority</option>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="legal-filter-sort" className={filterLabelClass}>Sort by</label>
                  <select id="legal-filter-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Document list */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
            {loading && (
              <div className="space-y-2 p-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div role="alert" className="m-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                <span className="material-symbols-outlined text-[15px] text-amber-500">warning</span>
                <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>
              </div>
            )}

            {!loading && filteredDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--portal-accent-soft)]">
                  <span className="material-symbols-outlined text-2xl text-[var(--portal-accent)]">{hasFilters ? 'search_off' : 'note_add'}</span>
                </div>
                {hasFilters ? (
                  <>
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">No documents match</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Try a different search, or clear the filters.</p>
                    <button type="button" onClick={clearFilters} className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Clear filters</button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">No documents yet</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Click <strong>New document</strong> to start.</p>
                    <button type="button" onClick={() => setShowNewDocModal(true)} className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--portal-accent)] px-3 text-xs font-semibold text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2">
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      New document
                    </button>
                  </>
                )}
              </div>
            )}

            {!loading && filteredDocs.map((doc) => (
              <div
                key={doc._id}
                role="button"
                tabIndex={0}
                aria-current={activeDoc?._id === doc._id ? 'true' : undefined}
                onClick={() => { openDoc(doc._id); setDrawerOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(doc._id); setDrawerOpen(false); } }}
                className={`group relative mb-1.5 w-full cursor-pointer rounded-xl border p-3 text-left transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] ${
                  activeDoc?._id === doc._id
                    ? 'border-y-neutral-200 border-r-neutral-200 border-l-[3px] border-l-[var(--portal-accent)] bg-[var(--portal-accent-soft)] dark:border-y-neutral-700 dark:border-r-neutral-700'
                    : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-semibold leading-snug text-neutral-900 line-clamp-2 dark:text-neutral-100">{doc.title}</p>
                  <StatusBadge status={doc.status} />
                </div>
                {doc.documentNumber && (
                  <p className="mb-1 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">{doc.documentNumber}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{doc.type} · {doc.currentVersion}</span>
                  <PriorityBadge priority={doc.priority} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="material-symbols-outlined text-[13px]">{doc.projectId ? 'folder' : 'business'}</span>
                  <span className="truncate">{doc.projectId ? (doc.projectName || 'Project legal') : 'In-house legal'}</span>
                  <span className="ml-auto shrink-0" title={doc.updatedAt ? `Last updated ${formatDate(doc.updatedAt)}` : ''}>{timeAgo(doc.updatedAt) ? `Updated ${timeAgo(doc.updatedAt)}` : ''}</span>
                </div>
                {doc.status === 'Rejected' && doc.ceoRemarks && (
                  <p className="mt-1.5 line-clamp-1 text-xs italic text-rose-600 dark:text-rose-400">
                    Remark: {doc.ceoRemarks}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {showListInFlow && isDesktop && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the document list"
            aria-controls="legal-doc-list"
            aria-valuemin={LIST_WIDTH_MIN}
            aria-valuemax={LIST_WIDTH_MAX}
            aria-valuenow={listWidth}
            tabIndex={0}
            title="Drag to resize the list. Double-click to reset."
            onPointerDown={onSplitterPointerDown}
            onPointerMove={onSplitterPointerMove}
            onPointerUp={endSplitterDrag}
            onPointerCancel={endSplitterDrag}
            onDoubleClick={() => setListWidth(LIST_WIDTH_DEFAULT)}
            onKeyDown={onSplitterKeyDown}
            className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none focus:outline-none pointer-coarse:-mx-1.5 pointer-coarse:w-3"
          >
            <span className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-all group-hover:w-[3px] group-hover:bg-[var(--portal-accent)] group-focus-visible:w-[3px] group-focus-visible:bg-[var(--portal-accent)] ${isDragging ? 'w-[3px] bg-[var(--portal-accent)]' : 'w-px bg-transparent'}`} />
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-neutral-600" />
          </div>
        )}

        {isDesktop && isNavCollapsed && !hideChrome && (
          <button
            type="button"
            onClick={() => setIsNavCollapsed(false)}
            title="Show the document list"
            aria-label="Show the document list"
            className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-r border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-[var(--portal-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--portal-accent)] dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="material-symbols-outlined text-[18px]">left_panel_open</span>
          </button>
        )}

        {/* ── RIGHT PANEL: Editor or Empty State ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!activeDoc ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-neutral-500 dark:text-neutral-400">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--portal-accent-soft)] shadow-inner">
                <span className="material-symbols-outlined text-4xl text-[var(--portal-accent)]">description</span>
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">No document open</h3>
                <p className="mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
                  Select a document on the left or create a new one.
                </p>
              </div>
              <CommonButton
                variant="accent"
                onClick={() => setShowNewDocModal(true)}
                icon={<span className="material-symbols-outlined text-[17px]">add</span>}
              >
                New document
              </CommonButton>
            </div>
          ) : (
            <>
              {/* Doc toolbar */}
              {!hideChrome && (
              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                {!isDesktop && (
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    title="Show the document list"
                    aria-label="Show the document list"
                    aria-expanded={drawerOpen}
                    aria-controls="legal-doc-list"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    <span className="material-symbols-outlined text-[18px] text-neutral-500">left_panel_open</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDoc(null)}
                  title="Back to the document list"
                  aria-label="Back to the document list"
                  className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:hover:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[18px] text-neutral-500">arrow_back</span>
                </button>
                <div className="min-w-0 flex-1 basis-48">
                  <h2 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100" title={activeDoc.title}>{activeDoc.title}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {activeDoc.documentNumber && <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{activeDoc.documentNumber}</span>}
                    <StatusBadge status={activeDoc.status} />
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{activeDoc.type} · {activeDoc.currentVersion}</span>
                    {activeDoc.projectName && <span className="text-xs text-neutral-500 dark:text-neutral-400">· {activeDoc.projectName}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorFullscreen(true)}
                    title="Full screen: edit the document using the whole screen (Esc to exit)"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <span className="material-symbols-outlined text-[17px]">fullscreen</span>Full screen
                  </button>
                  <div ref={moreActionsRef} className="relative">
                    <button type="button" onClick={() => setShowMoreActions((value) => !value)} aria-haspopup="menu" aria-expanded={showMoreActions} title="More actions: version history, download PDF, full screen" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                      <span className="material-symbols-outlined text-[17px]">more_horiz</span>More actions
                    </button>
                    {showMoreActions && <div role="menu" className="absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                      <button role="menuitem" type="button" onClick={() => { setShowMoreActions(false); setShowVersionHistory(true); }} className={menuItemClass}><span className="material-symbols-outlined text-[17px]">history</span>Version history</button>
                      <button role="menuitem" type="button" onClick={() => { setShowMoreActions(false); handleDownloadPdf(); }} className={menuItemClass}><span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>Download PDF</button>
                      <button role="menuitem" type="button" onClick={() => { setShowMoreActions(false); setIsEditorFullscreen(true); }} className={menuItemClass}><span className="material-symbols-outlined text-[17px]">fullscreen</span>Full-screen editing</button>
                      {activeDoc.projectId && <button role="menuitem" type="button" onClick={() => { setShowMoreActions(false); handleSetCustomerAgreement(!activeDoc.customerAgreement?.agreed); }} className={menuItemClass}><span className="material-symbols-outlined text-[17px]">verified_user</span>{activeDoc.customerAgreement?.agreed ? 'Clear customer agreement' : 'Mark customer as agreed'}</button>}
                      {canDelete && !activeDoc.isLocked && <><div className="my-1 border-t border-neutral-100 dark:border-neutral-800"/><button role="menuitem" type="button" onClick={() => { setShowMoreActions(false); handleDeleteDoc(activeDoc); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/30"><span className="material-symbols-outlined text-[17px]">delete</span>Move to Trash</button></>}
                    </div>}
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleSaveDraft(editorRef.current?.getContent() || editorContent)}
                      title="Save your changes now. Your work also saves automatically while you type."
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>Save draft
                    </button>
                  )}
                  {isEditable && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      title="Mark this document as Approved and lock it. You will be asked to confirm first."
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 text-xs font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Finalize document
                    </button>
                  )}
                  {activeDoc.status === 'Pending' && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 dark:bg-amber-900/30" title={STATUS_INFO.Pending.hint}>
                      <span className="material-symbols-outlined text-[15px] text-amber-600 dark:text-amber-400">hourglass_top</span>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Awaiting approval</span>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Status banners */}
              {!hideChrome && activeDoc.status === 'Rejected' && activeDoc.ceoRemarks && (
                <div className="flex shrink-0 items-start gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2 dark:border-rose-800 dark:bg-rose-900/20">
                  <span className="material-symbols-outlined mt-0.5 text-[17px] text-rose-500">cancel</span>
                  <div>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Changes requested</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">{activeDoc.ceoRemarks}</p>
                    <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">Make the changes below, then click Finalize document again.</p>
                  </div>
                </div>
              )}
              {!hideChrome && activeDoc.status === 'Approved' && (
                <div className="flex shrink-0 items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">verified</span>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="font-bold">Approved</span> by {activeDoc.approvedByName || 'Approver'} on {formatDate(activeDoc.approvedAt)}. This document is read-only.
                  </p>
                </div>
              )}

              {/* Editor */}
              <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${hideChrome ? '' : 'p-2 sm:p-3'}`}>
                <LegalDocEditor
                  ref={editorRef}
                  key={activeDoc._id}
                  initialContent={activeDoc.latestContent || ''}
                  isReadOnly={!isEditable}
                  document={{ ...activeDoc, projectName: scope.projectName || activeDoc.projectName }}
                  saveStatus={saveStatus}
                  lastSavedAt={lastSavedAt}
                  fullscreen={isEditorFullscreen}
                  onToggleFullscreen={setIsEditorFullscreen}
                  onContentChange={setEditorContent}
                  onAutoSave={isEditable ? handleAutoSave : undefined}
                  onSaveDraft={isEditable ? handleSaveDraft : undefined}
                  onDownloadPdf={handleDownloadPdf}
                  onOpenHistory={() => setShowVersionHistory(true)}
                />
              </div>
            </>
          )}
        </div>

        {/* ── MODALS ── */}
        {showNewDocModal && (
          <NewLegalDocumentModal scope={scope} projects={projects} onClose={() => setShowNewDocModal(false)} onCreated={handleDocCreated} />
        )}
        {showVersionHistory && activeDoc && (
          <LegalDocVersionHistory
            docId={activeDoc._id}
            isLocked={activeDoc.isLocked}
            currentVersion={activeDoc.currentVersion}
            onClose={() => setShowVersionHistory(false)}
            onRestored={async () => { await openDoc(activeDoc._id); fetchDocs(); }}
            onPreviewVersion={(v) => setPreviewVersion(v)}
          />
        )}
        {previewVersion && (
          <VersionPreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />
        )}
      </div>
    </div>
  );
};

export default LegalDocManagement;
