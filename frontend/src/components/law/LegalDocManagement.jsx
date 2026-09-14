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
const CATEGORY_OPTIONS = ['Corporate', 'Commercial', 'Employment', 'Compliance', 'Intellectual Property', 'Finance', 'Vendor', 'Client', 'Internal', 'Regulatory', 'Other'];
const CONFIDENTIALITY_OPTIONS = ['Internal', 'Confidential', 'Restricted'];
const LEGAL_TEAMS = ['Corporate Legal', 'Contracts', 'Compliance', 'IP & Copyright', 'Disputes', 'External Counsel'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const SUPPORTING_ATTACHMENT_TYPES = new Set([
  ...ATTACHMENT_TYPES,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

const STATUS_STYLES = {
  Draft:    { bg: 'bg-neutral-100 dark:bg-neutral-800',    text: 'text-neutral-600 dark:text-neutral-400',  dot: 'bg-neutral-400', pill: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700' },
  Pending:  { bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',      dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700' },
  Approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400',  dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700' },
  Rejected: { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-400',          dot: 'bg-red-500',     pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700' },
};

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

const TEMPLATE_OPTIONS = [
  { value: 'blank', label: 'Create from Blank Document' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'agreement', label: 'Service Agreement' },
  { value: 'policy', label: 'Company Policy' },
];

const FieldError = ({ error }) => error ? <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p> : null;

const FormSection = ({ title, icon, children }) => (
  <section className="space-y-3 border-t border-neutral-200 pt-4 first:border-t-0 first:pt-0 dark:border-neutral-800">
    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      <span className="material-symbols-outlined text-[16px] text-[var(--portal-accent)]">{icon}</span>
      {title}
    </h3>
    {children}
  </section>
);

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

const StatusBadge = ({ status }) => (
  <CommonStatusBadge tone={STATUS_TONE[status] || 'neutral'} label={status} />
);

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

const DocFormModal = ({ doc, scope, projects, onClose, onCreated }) => {
  const [title, setTitle] = useState(doc?.title || '');
  const [type, setType] = useState(doc?.type || 'Other');
  const [priority, setPriority] = useState(doc?.priority || 'Medium');
  const [selectedProjectId, setSelectedProjectId] = useState(doc?.projectId || scope.projectId || '');
  const [templateKey, setTemplateKey] = useState('blank');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const chosenProject = projects.find((item) => String(item._id || item.id) === String(selectedProjectId));
      const payload = {
        title,
        type,
        priority,
        content: LEGAL_TEMPLATES[templateKey]?.content || '',
        projectName: chosenProject ? (chosenProject.name || chosenProject.projectName || chosenProject.projectCode || '') : '',
      };
      if (selectedProjectId) payload.projectId = selectedProjectId;
      const res = await createLegalDocument(token, payload);
      onCreated(getLegalResponseData(res));
    } catch (err) {
      setError(err.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Legal Document"
      footer={
        <div className="flex justify-end gap-2">
          <CommonButton variant="secondary" onClick={onClose}>Cancel</CommonButton>
          <CommonButton variant="accent" onClick={handleSave} disabled={loading} icon={<span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : 'add'}</span>}>
            {loading ? 'Creating…' : 'Create Document'}
          </CommonButton>
        </div>
      }
    >
      <div>
        <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <span className="font-semibold text-neutral-800 dark:text-neutral-100">Scope:</span> {scope.label}
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Document Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Non-Disclosure Agreement – Project Alpha"
              className={`${lawControlClass} w-full`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Word-style template</label>
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}
              className={`${lawControlClass} w-full`}>
              {Object.entries(LEGAL_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>{template.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className={`${lawControlClass} w-full`}>
                {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className={`${lawControlClass} w-full`}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Project (optional)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={scope.isProjectScope}
              className={`${lawControlClass} w-full disabled:bg-neutral-100 disabled:text-neutral-500 dark:disabled:bg-neutral-800/60`}
            >
              <option value="">In-house Company Legal (no project)</option>
              {projects.map((project) => {
                const id = project._id || project.id;
                const name = project.name || project.projectName || project.projectCode || id;
                return <option key={id} value={id}>{name}</option>;
              })}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Version Preview Modal ─────────────────────────────────────────────────────
const NewLegalDocumentModal = ({ scope, projects, user, onClose, onCreated }) => {
  const { token } = useAuth();
  const { confirm } = useConfirmDialog();
  const [form, setForm] = useState(() => ({
    title: '',
    documentNumber: `LEG-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    description: '',
    type: 'Agreement',
    category: 'Commercial',
    priority: 'Medium',
    documentScope: scope.isProjectScope ? 'project' : 'company',
    projectId: scope.projectId || '',
    assignedTo: '',
    owner: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || '',
    legalTeam: 'Contracts',
    effectiveDate: '',
    expiryDate: '',
    reviewDate: '',
    signedDate: '',
    sourceType: 'blank',
    templateKey: 'blank',
    confidentiality: 'Internal',
    internalNotes: '',
  }));
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sourceFile, setSourceFile] = useState(null);
  const [supportingAttachments, setSupportingAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [touched, setTouched] = useState(false);

  const update = (key, value) => {
    setTouched(true);
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'documentScope' && value === 'company' ? { projectId: '' } : {}),
      ...(key === 'sourceType' && value === 'template' ? { templateKey: 'nda' } : {}),
      ...(key === 'sourceType' && value !== 'template' ? { templateKey: 'blank' } : {}),
    }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleClose = async () => {
    if (!touched) return onClose();
    const discard = await confirm({ title: 'Discard unsaved changes?', message: 'Your changes have not been saved.', confirmLabel: 'Discard Changes', cancelLabel: 'Keep Editing', tone: 'warning' });
    if (discard) onClose();
  };

  const validateAttachment = (file) => {
    if (!file) return '';
    const extensionOk = /\.(pdf|doc|docx)$/i.test(file.name || '');
    if (!ATTACHMENT_TYPES.has(file.type) && !extensionOk) return 'Only PDF, DOC, or DOCX files are supported.';
    if (file.size > MAX_ATTACHMENT_BYTES) return 'Attachment must be 10 MB or smaller.';
    return '';
  };

  const selectAttachment = (file) => {
    setTouched(true);
    const message = validateAttachment(file);
    setErrors((prev) => ({ ...prev, sourceFile: message }));
    if (!message) setSourceFile(file);
  };

  const validateSupportingAttachment = (file) => {
    if (!file) return '';
    const extensionOk = /\.(pdf|doc|docx|xlsx|png|jpe?g)$/i.test(file.name || '');
    if (!SUPPORTING_ATTACHMENT_TYPES.has(file.type) && !extensionOk) return 'Only PDF, DOC, DOCX, XLSX, PNG, or JPG files are supported.';
    if (file.size > MAX_ATTACHMENT_BYTES) return 'Each attachment must be 10 MB or smaller.';
    return '';
  };

  const selectSupportingAttachments = (files = []) => {
    const incoming = Array.from(files).filter(Boolean);
    if (!incoming.length) return;
    setTouched(true);
    const firstError = incoming.map(validateSupportingAttachment).find(Boolean) || '';
    setErrors((prev) => ({ ...prev, supportingAttachments: firstError }));
    if (firstError) return;
    setSupportingAttachments((prev) => [...prev, ...incoming].slice(0, 10));
  };

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    setTouched(true);
    setTags((prev) => (prev.includes(next) ? prev : [...prev, next].slice(0, 20)));
    setTagInput('');
  };

  const validate = (mode = 'create') => {
    const next = {};
    if (!form.title.trim()) next.title = 'Document title is required.';
    else if (form.title.trim().length < 3) next.title = 'Document title must be at least 3 characters.';
    if (mode === 'create' && !form.type) next.type = 'Select a document type.';
    if (form.documentScope === 'project' && !isRealProjectId(form.projectId)) next.projectId = 'Select a project for a project legal document.';
    if (mode === 'create' && form.sourceType === 'template' && (!form.templateKey || form.templateKey === 'blank')) next.templateKey = 'Select a legal template.';
    if (mode === 'create' && form.sourceType === 'upload' && !sourceFile) next.sourceFile = 'Upload an existing document file, or choose Blank Document.';
    if (form.effectiveDate && form.expiryDate && new Date(form.expiryDate) < new Date(form.effectiveDate)) next.expiryDate = 'Expiry date must be after effective date.';
    if (form.reviewDate && form.expiryDate && new Date(form.reviewDate) > new Date(form.expiryDate)) next.reviewDate = 'Review date should be before expiry date.';
    const sourceFileError = validateAttachment(sourceFile);
    if (sourceFileError) next.sourceFile = sourceFileError;
    const supportingError = supportingAttachments.map(validateSupportingAttachment).find(Boolean);
    if (supportingError) next.supportingAttachments = supportingError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (mode = 'create') => {
    if (loadingAction || !validate(mode)) return;
    setLoadingAction(mode);
    setApiError('');
    try {
      const chosenProject = projects.find((item) => String(item._id || item.id) === String(form.projectId));
      const template = LEGAL_TEMPLATES[form.templateKey] || LEGAL_TEMPLATES.blank;
      const payload = {
        title: form.title.trim(),
        documentNumber: form.documentNumber.trim(),
        description: form.description.trim(),
        type: form.type,
        category: form.category,
        priority: form.priority,
        scope: form.documentScope === 'project' ? 'project' : 'company',
        projectName: chosenProject ? (chosenProject.name || chosenProject.projectName || chosenProject.projectCode || '') : '',
        assignedTo: form.assignedTo.trim(),
        owner: form.owner.trim(),
        legalTeam: form.legalTeam,
        effectiveDate: form.effectiveDate,
        expiryDate: form.expiryDate,
        reviewDate: form.reviewDate,
        signedDate: form.signedDate,
        sourceType: form.sourceType,
        templateId: form.sourceType === 'template' ? form.templateKey : '',
        templateName: form.sourceType === 'template' ? template.label : '',
        content: form.sourceType === 'template' ? template.content : '',
        tags,
        confidentiality: form.confidentiality,
        internalNotes: form.internalNotes.trim(),
      };
      if (form.documentScope === 'project') payload.projectId = form.projectId;
      if (sourceFile) payload.sourceFile = sourceFile;
      if (supportingAttachments.length) payload.supportingAttachments = supportingAttachments;
      const res = await createLegalDocument(token, payload);
      onCreated(getLegalResponseData(res));
    } catch (err) {
      setApiError(err.message || 'Unable to create legal document.');
    } finally {
      setLoadingAction('');
    }
  };

  const projectDisabled = form.documentScope === 'company';
  const loading = Boolean(loadingAction);

  return (
    <Modal open onClose={handleClose} title="New Legal Document" description="Create a new legal document and assign its classification, ownership and workflow details." className="w-[calc(100%-24px)] sm:max-w-[860px]" footer={<div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end"><CommonButton variant="secondary" onClick={handleClose} disabled={loading}>Cancel</CommonButton><CommonButton variant="secondary" onClick={() => handleSubmit('draft')} disabled={loading}>{loadingAction === 'draft' ? 'Saving...' : 'Save as Draft'}</CommonButton><CommonButton variant="accent" onClick={() => handleSubmit('create')} disabled={loading} icon={<span className={`material-symbols-outlined text-sm ${loadingAction === 'create' ? 'animate-spin' : ''}`}>{loadingAction === 'create' ? 'progress_activity' : 'add'}</span>}>{loadingAction === 'create' ? 'Creating...' : 'Create Document'}</CommonButton></div>}>
      <div className="space-y-5">
        {apiError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">{apiError}</div>}
        <FormSection title="Basic Information" icon="article">
          <div><label htmlFor="legal-title" className={labelClass}>Document Title *</label><input id="legal-title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Non-Disclosure Agreement - Project Alpha" className={fieldBaseClass} /><FieldError error={errors.title} /></div>
          <div className="grid gap-3 md:grid-cols-2"><div><label htmlFor="legal-number" className={labelClass}>Document Number</label><input id="legal-number" value={form.documentNumber} onChange={(e) => update('documentNumber', e.target.value)} placeholder="LEG-2026-00124" className={fieldBaseClass} /></div><div><label htmlFor="legal-type" className={labelClass}>Document Type *</label><select id="legal-type" value={form.type} onChange={(e) => update('type', e.target.value)} className={fieldBaseClass}>{LAW_DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><FieldError error={errors.type} /></div></div>
          <div><label htmlFor="legal-description" className={labelClass}>Description</label><textarea id="legal-description" maxLength={1000} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Enter a short description of this document..." rows={3} className={`${fieldBaseClass} min-h-24 resize-y`} /><div className="mt-1 flex justify-between text-xs text-neutral-400"><FieldError error={errors.description} /><span>{form.description.length}/1000</span></div></div>
        </FormSection>
        <FormSection title="Classification" icon="category">
          <div className="grid gap-3 md:grid-cols-2"><div><label htmlFor="legal-category" className={labelClass}>Category</label><select id="legal-category" value={form.category} onChange={(e) => update('category', e.target.value)} className={fieldBaseClass}>{CATEGORY_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="legal-priority" className={labelClass}>Priority *</label><select id="legal-priority" value={form.priority} onChange={(e) => update('priority', e.target.value)} className={fieldBaseClass}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></div></div>
          <div><span className={labelClass}>Document Scope *</span><div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Document scope">{[{ value: 'project', label: 'Project', icon: 'folder', text: 'Attach this document to a selected project.' }, { value: 'company', label: 'In-house / Internal', icon: 'business', text: 'Use for internal company legal records.' }].map((item) => <button key={item.value} type="button" role="radio" aria-checked={form.documentScope === item.value} onClick={() => update('documentScope', item.value)} className={`rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/30 ${form.documentScope === item.value ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]' : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900'}`}><span className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100"><span className="material-symbols-outlined text-[18px] text-[var(--portal-accent)]">{item.icon}</span>{item.label}</span><span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{item.text}</span></button>)}</div></div>
        </FormSection>
        <FormSection title="Scope & Project" icon="folder">
          <div><label htmlFor="legal-project" className={labelClass}>Project {form.documentScope === 'project' ? '*' : ''}</label><select id="legal-project" value={form.projectId} onChange={(e) => update('projectId', e.target.value)} disabled={projectDisabled} className={`${fieldBaseClass} disabled:bg-neutral-100 disabled:text-neutral-500 dark:disabled:bg-neutral-800/60`}><option value="">Select project</option>{projects.map((project) => { const id = project._id || project.id; const name = project.name || project.projectName || project.projectCode || id; return <option key={id} value={id}>{name}</option>; })}</select><FieldError error={errors.projectId} /></div>
        </FormSection>
        <FormSection title="Ownership" icon="groups">
          <div className="grid gap-3 md:grid-cols-2"><div><label htmlFor="legal-owner" className={labelClass}>Document Owner</label><input id="legal-owner" value={form.owner} onChange={(e) => update('owner', e.target.value)} className={fieldBaseClass} /></div><div><label htmlFor="legal-assigned" className={labelClass}>Assigned To</label><input id="legal-assigned" value={form.assignedTo} onChange={(e) => update('assignedTo', e.target.value)} placeholder="Name or email" className={fieldBaseClass} /></div><div><label htmlFor="legal-team" className={labelClass}>Legal Department / Team</label><select id="legal-team" value={form.legalTeam} onChange={(e) => update('legalTeam', e.target.value)} className={fieldBaseClass}>{LEGAL_TEAMS.map((item) => <option key={item}>{item}</option>)}</select></div></div>
        </FormSection>
        <FormSection title="Important Dates" icon="event"><div className="grid gap-3 md:grid-cols-2">{[['effectiveDate', 'Effective Date'], ['expiryDate', 'Expiry Date'], ['reviewDate', 'Review Date'], ['signedDate', 'Signed Date']].map(([key, label]) => <div key={key}><label htmlFor={`legal-${key}`} className={labelClass}>{label}</label><input id={`legal-${key}`} type="date" value={form[key]} onChange={(e) => update(key, e.target.value)} className={fieldBaseClass} /><FieldError error={errors[key]} /></div>)}</div></FormSection>
        <FormSection title="Document Source" icon="edit_document"><div className="grid gap-2 md:grid-cols-3">{[{ value: 'blank', label: 'Blank Document', icon: 'draft' }, { value: 'template', label: 'Use Template', icon: 'description' }, { value: 'upload', label: 'Upload Existing Document', icon: 'upload_file' }].map((item) => <button key={item.value} type="button" onClick={() => update('sourceType', item.value)} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${form.sourceType === item.value ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300'}`}><span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">{item.icon}</span>{item.label}</span></button>)}</div>{form.sourceType === 'template' && <div><label htmlFor="legal-template" className={labelClass}>Legal Template *</label><select id="legal-template" value={form.templateKey} onChange={(e) => update('templateKey', e.target.value)} className={fieldBaseClass}>{TEMPLATE_OPTIONS.filter((item) => item.value !== 'blank').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><FieldError error={errors.templateKey} /></div>}{form.sourceType === 'upload' && <div><label htmlFor="legal-source-file" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectAttachment(e.dataTransfer.files?.[0]); }} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center transition hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900/60"><span className="material-symbols-outlined text-3xl text-[var(--portal-accent)]">upload_file</span><span className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">Upload Legal Document</span><span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">PDF / DOC / DOCX up to 10 MB</span><input id="legal-source-file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => selectAttachment(e.target.files?.[0])} /></label>{sourceFile && !errors.sourceFile && <div className="mt-2 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"><span className="material-symbols-outlined text-[18px] text-[var(--portal-accent)]">description</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{sourceFile.name}</p><p className="text-xs text-neutral-400">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB - Ready to upload</p></div><button type="button" onClick={() => setSourceFile(null)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 dark:hover:bg-neutral-800" aria-label="Remove uploaded document"><span className="material-symbols-outlined text-[18px]">delete</span></button></div>}<FieldError error={errors.sourceFile} /></div>}</FormSection>
        <FormSection title="Tags & Notes" icon="sell"><div><label htmlFor="legal-tags" className={labelClass}>Tags</label><div className="rounded-lg border border-neutral-200 bg-white p-2 focus-within:border-[var(--portal-accent)] focus-within:ring-2 focus-within:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900"><div className="mb-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--portal-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--portal-accent)]">{tag}<button type="button" onClick={() => setTags((prev) => prev.filter((item) => item !== tag))} aria-label={`Remove ${tag}`}><span className="material-symbols-outlined text-[13px]">close</span></button></span>)}</div><input id="legal-tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="Type tag and press Enter" className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100" /></div></div><div className="grid gap-3 md:grid-cols-2"><div><label htmlFor="legal-confidentiality" className={labelClass}>Confidentiality</label><select id="legal-confidentiality" value={form.confidentiality} onChange={(e) => update('confidentiality', e.target.value)} className={fieldBaseClass}>{CONFIDENTIALITY_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div></div><div><label htmlFor="legal-notes" className={labelClass}>Internal Notes</label><textarea id="legal-notes" value={form.internalNotes} onChange={(e) => update('internalNotes', e.target.value)} rows={3} placeholder="Internal notes are visible only to authorized portal users." className={`${fieldBaseClass} min-h-24 resize-y`} /></div></FormSection>
        <FormSection title="Attachments" icon="attach_file"><label htmlFor="legal-supporting-attachments" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectSupportingAttachments(e.dataTransfer.files); }} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center transition hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900/60"><span className="material-symbols-outlined text-3xl text-[var(--portal-accent)]">attach_file</span><span className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">Drop supporting files here or browse</span><span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">PDF / DOCX / XLSX / PNG / JPG up to 10 MB each</span><input id="legal-supporting-attachments" multiple type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg" className="sr-only" onChange={(e) => selectSupportingAttachments(e.target.files)} /></label>{supportingAttachments.length > 0 && <div className="space-y-2">{supportingAttachments.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"><span className="material-symbols-outlined text-[18px] text-[var(--portal-accent)]">description</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{file.name}</p><p className="text-xs text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB - Ready to upload</p></div><button type="button" onClick={() => setSupportingAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 dark:hover:bg-neutral-800" aria-label={`Remove ${file.name}`}><span className="material-symbols-outlined text-[18px]">delete</span></button></div>)}</div>}<FieldError error={errors.supportingAttachments} /></FormSection>
      </div>
    </Modal>
  );
};

const VersionPreviewModal = ({ version, onClose }) => (
  <Modal open onClose={onClose} title={`Preview: ${version.version}`} description={`By ${version.editedByName} • ${new Date(version.createdAt).toLocaleString()}`} className="sm:max-w-4xl">
    <div className="-m-4 lg:-m-5 flex max-h-[70vh] flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-3xl bg-white dark:bg-neutral-900 rounded-xl p-8 shadow"
          style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: 1.8 }}
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

  // Editor state
  const [activeDoc, setActiveDoc] = useState(null); // currently open doc
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');

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
  const fetchDocs = useCallback(async (overrides = {}) => {
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
      const items = getLegalListItems(res);
      setDocs(items.filter((doc) => {
        const docProjectId = String(doc.projectId || '');
        if (targetProjectId) return docProjectId === targetProjectId;
        return !docProjectId;
      }));
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
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
    try {
      const res = await getLegalDocumentById(token, id);
      const doc = getLegalResponseData(res);
      setActiveDoc(doc);
      setEditorContent(doc.latestContent || '');
      if (editorRef.current) {
        editorRef.current.setContent(doc.latestContent || '');
        editorRef.current.focus();
      }
    } catch (err) {
      alert(err.message || 'Failed to open document');
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
        projectName: activeDoc.projectName || '',
        changeSummary: 'Draft saved',
      });
      const updatedDoc = getLegalResponseData(res);
      setActiveDoc(updatedDoc);
      setDocs((prev) => prev.map((d) => (d._id === updatedDoc._id ? { ...d, ...updatedDoc } : d)));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      alert(err.message || 'Save failed');
    }
  }, [token, activeDoc]);

  // ── Submit to CEO ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Submit for approval?',
      message: `"${activeDoc?.title}" will enter the configured approval workflow. You won't be able to edit it until the approver reviews it.${activeDoc?.status === 'Rejected' ? ' (Re-submission — a new major version will be created.)' : ''}`,
      confirmLabel: 'Yes, Submit',
      cancelLabel: 'Cancel',
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
      alert(err.message || 'Submit failed');
    }
  }, [token, activeDoc, editorContent, confirm]);

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

  const handleDownloadPdf = useCallback(async () => {
    if (!activeDoc?._id) return;
    try {
      const { blob, filename } = await getLegalDocumentPdf(token, activeDoc._id);
      downloadBlob(blob, filename);
    } catch (err) {
      alert(err.message || 'PDF download failed');
    }
  }, [token, activeDoc]);

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

  const stats = useMemo(() => ({
    total: docs.length,
    draft: docs.filter((d) => d.status === 'Draft').length,
    pending: docs.filter((d) => d.status === 'Pending').length,
    approved: docs.filter((d) => d.status === 'Approved').length,
    rejected: docs.filter((d) => d.status === 'Rejected').length,
    projectLinked: docs.filter((d) => d.projectId).length,
    company: docs.filter((d) => !d.projectId).length,
  }), [docs]);

  // ── Determine if editor is editable ────────────────────────────────────────
  const isEditable = activeDoc && !activeDoc.isLocked && ['Draft', 'Rejected'].includes(activeDoc?.status);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-neutral-950">

      {/* ── TOP BAR ── */}
      <div className="overflow-hidden border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="h-1 w-full bg-[var(--portal-accent)]" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
          {/* Title + Scope */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-accent)] shadow-sm">
              <span className="material-symbols-outlined text-[20px] text-white">gavel</span>
            </div>
            <div>
              <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">Legal Documents</h1>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px] text-neutral-400">{scope.isProjectScope ? 'folder' : 'business'}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{scope.label}</span>
              </div>
            </div>
          </div>

          {/* KPI chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Total',    value: stats.total,    icon: 'description',   pill: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' },
              { label: 'Pending',  value: stats.pending,  icon: 'hourglass_top', pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
              { label: 'Approved', value: stats.approved, icon: 'verified',      pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
              { label: 'Rejected', value: stats.rejected, icon: 'cancel',        pill: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
            ].map(({ label, value, icon, pill }) => (
              <div key={label} className={`flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-1.5 dark:border-neutral-700 ${pill}`}>
                <span className="material-symbols-outlined text-[15px]">{icon}</span>
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-sm font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scope / Sort bar — always visible so you can switch projects or
            jump back to the aggregate view even when the URL is locked to one. */}
        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800 lg:px-5">
          <select
            value={selectedProjectId || projectFilter}
            onChange={(e) => handleProjectFilterChange(e.target.value)}
            className={`${lawControlClass} bg-neutral-50`}
          >
            <option value="company">In-house company legal</option>
            {projects.map((project) => {
              const id = project._id || project.id;
              const name = project.name || project.projectName || project.projectCode || id;
              return <option key={id} value={id}>{name}</option>;
            })}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`${lawControlClass} bg-neutral-50`}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-2 ml-auto text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
              <span className="material-symbols-outlined text-[13px]">business</span>
              In-house: {stats.company}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
              <span className="material-symbols-outlined text-[13px]">folder</span>
              Project: {stats.projectLinked}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Document List ── */}
        <div className="flex w-full shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:w-80 xl:w-88">

          {/* Panel header */}
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Documents</p>
                <p className="mt-0.5 text-xs text-neutral-400">{docs.length} total</p>
              </div>
              <button
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                New
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
              <input
                type="text"
                placeholder="Search documents…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs text-neutral-700 placeholder-neutral-400 focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              />
            </div>

            {/* Filter grid */}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                { value: filterStatus,   onChange: (v) => setFilterStatus(v),   options: ['', ...['Draft','Pending','Approved','Rejected']], placeholder: 'All Status' },
                { value: filterType,     onChange: (v) => setFilterType(v),     options: ['', ...DOC_TYPES],  placeholder: 'All Types' },
                { value: filterPriority, onChange: (v) => setFilterPriority(v), options: ['', ...PRIORITIES], placeholder: 'All Priority' },
                { value: sortBy,         onChange: (v) => setSortBy(v),         options: null, sortOptions: SORT_OPTIONS },
              ].map((f, i) => (
                <select key={i} value={f.value} onChange={(e) => f.onChange(e.target.value)}
                  className="h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-xs text-neutral-700 focus:border-[var(--portal-accent)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                  {f.sortOptions
                    ? f.sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
                    : f.options.map((o) => <option key={o} value={o}>{o || f.placeholder}</option>)
                  }
                </select>
              ))}
            </div>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {loading && (
              <div className="space-y-2 p-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="m-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                <span className="material-symbols-outlined text-[15px] text-amber-500">warning</span>
                <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>
              </div>
            )}

            {!loading && filteredDocs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20">
                  <span className="material-symbols-outlined text-2xl text-rose-400">description</span>
                </div>
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">No documents found</p>
                <p className="mt-1 text-center text-[11px] text-neutral-400">Create one to get started.</p>
              </div>
            )}

            {!loading && filteredDocs.map((doc) => (
              <button
                key={doc._id}
                onClick={() => openDoc(doc._id)}
                className={`group mb-1.5 w-full rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                  activeDoc?._id === doc._id
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-1">
                  <p className="flex-1 text-xs font-semibold leading-snug text-neutral-900 line-clamp-2 dark:text-neutral-100">{doc.title}</p>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{doc.type} · {doc.currentVersion}</span>
                  <PriorityBadge priority={doc.priority} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                  <span className="material-symbols-outlined text-[11px]">{doc.projectId ? 'folder' : 'business'}</span>
                  <span>{doc.projectId ? (doc.projectName || 'Project legal') : 'In-house legal'}</span>
                  <span className="ml-auto">{formatDate(doc.updatedAt)}</span>
                </div>
                {doc.status === 'Rejected' && doc.ceoRemarks && (
                  <p className="mt-1.5 line-clamp-1 text-[10px] italic text-rose-500 dark:text-rose-400">
                    Remark: {doc.ceoRemarks}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Bottom status summary */}
          <div className="grid grid-cols-4 gap-1 border-t border-neutral-200 p-3 dark:border-neutral-800">
            {['Draft','Pending','Approved','Rejected'].map((s) => {
              const ss = STATUS_STYLES[s];
              const count = docs.filter((d) => d.status === s).length;
              return (
                <div key={s} className={`rounded-lg px-2 py-1.5 ${ss.bg}`}>
                  <p className={`text-[9px] font-semibold uppercase ${ss.text}`}>{s}</p>
                  <p className={`text-base font-bold ${ss.text}`}>{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL: Editor or Empty State ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!activeDoc ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-neutral-400 dark:text-neutral-600">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 shadow-inner dark:bg-rose-900/10">
                <span className="material-symbols-outlined text-4xl text-[var(--portal-accent)]">description</span>
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-neutral-700 dark:text-neutral-300">Select or Create a Document</h3>
                <p className="mt-1 max-w-xs text-sm text-neutral-400 dark:text-neutral-500">
                  Pick a document from the {scope.isProjectScope ? 'project' : 'company'} legal list to start editing, or create a new one.
                </p>
              </div>
              <CommonButton
                variant="accent"
                onClick={() => setShowNewDocModal(true)}
                icon={<span className="material-symbols-outlined text-[17px]">add</span>}
              >
                New Legal Document
              </CommonButton>
            </div>
          ) : (
            <>
              {/* Doc toolbar */}
              <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  onClick={() => setActiveDoc(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[18px] text-neutral-500">arrow_back</span>
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{activeDoc.title}</h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StatusBadge status={activeDoc.status} />
                    <span className="text-xs text-neutral-400">{activeDoc.type} · {activeDoc.currentVersion}</span>
                    {activeDoc.projectName && <span className="text-xs text-neutral-400">· {activeDoc.projectName}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setShowVersionHistory(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <span className="material-symbols-outlined text-[15px]">history</span>
                    History
                  </button>
                  {isEditable && (
                    <button
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
                    >
                      <span className="material-symbols-outlined text-[15px]">send</span>
                      Submit for Approval
                    </button>
                  )}
                  {activeDoc.status === 'Pending' && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 dark:bg-amber-900/30">
                      <span className="material-symbols-outlined text-[15px] text-amber-600">hourglass_top</span>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Awaiting Approval</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status banners */}
              {activeDoc.status === 'Rejected' && activeDoc.ceoRemarks && (
                <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-900/20">
                  <span className="material-symbols-outlined mt-0.5 text-[17px] text-rose-500">cancel</span>
                  <div>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Changes requested</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">{activeDoc.ceoRemarks}</p>
                  </div>
                </div>
              )}
              {activeDoc.status === 'Approved' && (
                <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">verified</span>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="font-bold">Approved</span> by {activeDoc.approvedByName || 'Approver'} on {formatDate(activeDoc.approvedAt)} — read-only.
                  </p>
                </div>
              )}

              {/* Editor */}
              <div className="flex-1 overflow-hidden p-4">
                <LegalDocEditor
                  ref={editorRef}
                  key={activeDoc._id}
                  initialContent={activeDoc.latestContent || ''}
                  isReadOnly={!isEditable}
                  document={activeDoc}
                  saveStatus={saveStatus}
                  onContentChange={setEditorContent}
                  onAutoSave={isEditable ? handleAutoSave : undefined}
                  onSaveDraft={isEditable ? handleSaveDraft : undefined}
                  onSubmit={isEditable ? handleSubmit : undefined}
                  onDownloadPdf={handleDownloadPdf}
                />
              </div>
            </>
          )}
        </div>

        {/* ── MODALS ── */}
        {showNewDocModal && (
          <NewLegalDocumentModal scope={scope} projects={projects} user={user} onClose={() => setShowNewDocModal(false)} onCreated={handleDocCreated} />
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
