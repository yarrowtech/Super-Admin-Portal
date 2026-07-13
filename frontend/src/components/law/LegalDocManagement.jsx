import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from '../../api/legalDocument';
import { lawApi } from '../../services/law';
import LegalDocEditor from './LegalDocEditor';
import LegalDocVersionHistory from './LegalDocVersionHistory';

// ── Constants ─────────────────────────────────────────────────────────────────
const DOC_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

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
  { value: 'title-asc', label: 'Title A-Z' },
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

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Draft;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
};

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
      onCreated(res.data?.data || res.data);
    } catch (err) {
      setError(err.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-bold text-neutral-900 dark:text-neutral-100">
          New Legal Document
        </h2>
        <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <span className="font-semibold text-neutral-800 dark:text-neutral-100">Scope:</span> {scope.label}
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Document Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Non-Disclosure Agreement – Project Alpha"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-rose-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Word-style template</label>
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-rose-500">
              {Object.entries(LEGAL_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>{template.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-rose-500">
                {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-rose-500">
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
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-rose-500 disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:disabled:bg-neutral-800/60"
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
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            {loading ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">add</span>}
            Create Document
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Submit confirm modal ──────────────────────────────────────────────────────
const SubmitConfirmModal = ({ doc, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4">
        <span className="material-symbols-outlined text-2xl text-amber-600">send</span>
      </div>
      <h2 className="mb-2 text-base font-bold text-neutral-900 dark:text-neutral-100">Submit to CEO?</h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
        <span className="font-semibold text-neutral-700 dark:text-neutral-300">"{doc?.title}"</span> will be sent to the CEO for approval.
      </p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-5">
        You won't be able to edit it until CEO reviews it.
        {doc?.status === 'Rejected' && ' (Re-submission — new major version will be created)'}
      </p>
      <div className="flex gap-2 justify-center">
        <button onClick={onCancel} className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
          Yes, Submit
        </button>
      </div>
    </div>
  </div>
);

// ── Version Preview Modal ─────────────────────────────────────────────────────
const VersionPreviewModal = ({ version, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Preview: {version.version}</h2>
          <p className="text-xs text-neutral-500">By {version.editedByName} • {new Date(version.createdAt).toLocaleString()}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <span className="material-symbols-outlined text-neutral-500">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-3xl bg-white dark:bg-neutral-900 rounded-xl p-8 shadow"
          style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: version.content }} />
      </div>
    </div>
  </div>
);

// ── Main LegalDocManagement Component ─────────────────────────────────────────
const LegalDocManagement = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const selectedProjectId = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('projectId') || '';
    return isRealProjectId(raw) ? raw : '';
  }, [location.search]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState(selectedProjectId || 'company');

  // The dropdown is the single control for "which project am I looking at" —
  // picking a real project locks the URL to it (so it survives reload/sidebar
  // nav), picking In-house company legal clears that lock.
  const handleProjectFilterChange = (value) => {
    if (isRealProjectId(value)) {
      navigate(`${location.pathname}?projectId=${value}`);
      return;
    }
    setProjectFilter(value);
    if (selectedProjectId) navigate(location.pathname);
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
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);

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

  useEffect(() => {
    setProjectFilter(selectedProjectId || 'company');
  }, [selectedProjectId]);

  // ── Fetch documents ─────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      params.limit = 100;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (searchTerm) params.search = searchTerm;
      if (sortBy) params.sort = sortBy;

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
      const items = res.data?.data?.items || [];
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

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    setActiveDoc(null);
    setEditorContent('');
  }, [selectedProjectId]);

  // ── Open a document for editing ─────────────────────────────────────────────
  const openDoc = async (id) => {
    try {
      const res = await getLegalDocumentById(token, id);
      const doc = res.data?.data || res.data;
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
      const updatedDoc = res.data?.data || res.data;
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
    const html = editorRef.current?.getContent() || editorContent;
    setSaveStatus('saving');
    try {
      const res = await submitDocument(token, activeDoc._id, { content: html });
      const updatedDoc = res.data?.data || res.data;
      setActiveDoc(updatedDoc);
      setDocs((prev) => prev.map((d) => (d._id === updatedDoc._id ? { ...d, ...updatedDoc } : d)));
      setShowSubmitConfirm(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      alert(err.message || 'Submit failed');
    }
  }, [token, activeDoc, editorContent]);

  // ── Document created callback ───────────────────────────────────────────────
  const handleDocCreated = async (doc) => {
    setShowNewDocModal(false);
    setDocs((prev) => [doc, ...prev]);
    await openDoc(doc._id);
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
    if (sortBy === 'title-asc') return String(a.title || '').localeCompare(String(b.title || ''));
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
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-neutral-50 dark:bg-neutral-950">

      {/* ── TOP BAR ── */}
      <div className="overflow-hidden border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="h-1 w-full bg-rose-600" />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          {/* Title + Scope */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 shadow-sm">
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
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
          <select
            value={selectedProjectId || projectFilter}
            onChange={(e) => handleProjectFilterChange(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
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
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
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
        <div className="flex w-80 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">

          {/* Panel header */}
          <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Documents</p>
                <p className="mt-0.5 text-xs text-neutral-400">{docs.length} total</p>
              </div>
              <button
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
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
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
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
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-700 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
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
                    ? 'border-rose-400 bg-rose-50 shadow-sm dark:border-rose-700 dark:bg-rose-900/10'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                }`}
              >
                <div className="mb-1.5 flex items-start justify-between gap-1">
                  <p className="flex-1 text-xs font-semibold leading-snug text-neutral-900 line-clamp-2 dark:text-neutral-100">{doc.title}</p>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{doc.type} · {doc.currentVersion}</span>
                  <span className={`text-[10px] font-semibold ${PRIORITY_COLORS[doc.priority] || ''}`}>{doc.priority}</span>
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
                <span className="material-symbols-outlined text-4xl text-rose-400">description</span>
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-neutral-700 dark:text-neutral-300">Select or Create a Document</h3>
                <p className="mt-1 max-w-xs text-sm text-neutral-400 dark:text-neutral-500">
                  Pick a document from the {scope.isProjectScope ? 'project' : 'company'} legal list to start editing, or create a new one.
                </p>
              </div>
              <button
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 transition"
              >
                <span className="material-symbols-outlined text-[17px]">add</span>
                New Legal Document
              </button>
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
                      onClick={() => setShowSubmitConfirm(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                    >
                      <span className="material-symbols-outlined text-[15px]">send</span>
                      Submit to CEO
                    </button>
                  )}
                  {activeDoc.status === 'Pending' && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 dark:bg-amber-900/30">
                      <span className="material-symbols-outlined text-[15px] text-amber-600">hourglass_top</span>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Awaiting CEO Review</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status banners */}
              {activeDoc.status === 'Rejected' && activeDoc.ceoRemarks && (
                <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-900/20">
                  <span className="material-symbols-outlined mt-0.5 text-[17px] text-rose-500">cancel</span>
                  <div>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Rejected by CEO</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">{activeDoc.ceoRemarks}</p>
                  </div>
                </div>
              )}
              {activeDoc.status === 'Approved' && (
                <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">verified</span>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="font-bold">Approved</span> by {activeDoc.approvedByName || 'CEO'} on {formatDate(activeDoc.approvedAt)} — read-only.
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
                  onSubmit={isEditable ? () => setShowSubmitConfirm(true) : undefined}
                  onDownloadPdf={handleDownloadPdf}
                />
              </div>
            </>
          )}
        </div>

        {/* ── MODALS ── */}
        {showNewDocModal && (
          <DocFormModal scope={scope} projects={projects} onClose={() => setShowNewDocModal(false)} onCreated={handleDocCreated} />
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
        {showSubmitConfirm && (
          <SubmitConfirmModal doc={activeDoc} onConfirm={handleSubmit} onCancel={() => setShowSubmitConfirm(false)} />
        )}
        {previewVersion && (
          <VersionPreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />
        )}
      </div>
    </div>
  );
};

export default LegalDocManagement;
