import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getPendingDocuments,
  getLegalDocumentById,
  approveDocument,
  rejectDocument,
  getDocumentVersions,
} from '../../api/legalDocument';

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const relativeTime = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
};

const PRIORITY_BADGE = {
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const TYPE_ICON = {
  Contract: 'contract', Agreement: 'handshake', Policy: 'policy',
  NDA: 'lock', Compliance: 'verified_user', IP: 'copyright',
  Dispute: 'balance', Other: 'description',
};

// ── Reject Modal ──────────────────────────────────────────────────────────────
const RejectModal = ({ doc, onReject, onCancel, loading }) => {
  const [remarks, setRemarks] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <span className="material-symbols-outlined text-red-600">cancel</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Reject Document</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xs">"{doc?.title}"</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Rejection Remarks <span className="text-red-500">*</span>
          </label>
          <textarea
            autoFocus
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Explain why this document is being rejected. This will be visible to the LAW team…"
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-red-400 resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading} className="rounded-lg px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Cancel
          </button>
          <button
            onClick={() => onReject(remarks)}
            disabled={!remarks.trim() || loading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-sm">cancel</span>}
            Reject Document
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Document Preview Panel ────────────────────────────────────────────────────
const DocPreviewPanel = ({ doc, versions, onApprove, onRejectClick, actionLoading, onClose }) => {
  if (!doc) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-700 p-5">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-rose-500 text-base">
              {TYPE_ICON[doc.type] || 'description'}
            </span>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{doc.type}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE[doc.priority] || ''}`}>
              {doc.priority}
            </span>
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{doc.title}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">person</span>
              {doc.createdByName || 'LAW Team'}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              Submitted {relativeTime(doc.submittedAt)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">folder</span>
              {doc.projectName || 'General'}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">history</span>
              {doc.currentVersion}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0">
          <span className="material-symbols-outlined text-neutral-400">close</span>
        </button>
      </div>

      {/* CEO Action Buttons */}
      <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-700 px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50">
        <button
          onClick={onApprove}
          disabled={actionLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all"
        >
          {actionLoading === 'approve' ? (
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-base">check_circle</span>
          )}
          Approve
        </button>
        <button
          onClick={onRejectClick}
          disabled={!!actionLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 shadow-sm transition-all"
        >
          {actionLoading === 'reject' ? (
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-base">cancel</span>
          )}
          Reject
        </button>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto p-5 bg-neutral-50 dark:bg-neutral-950">
        <div
          className="mx-auto max-w-3xl rounded-xl bg-white dark:bg-neutral-900 p-8 shadow-sm border border-neutral-100 dark:border-neutral-800"
          style={{
            fontFamily: "'Times New Roman', 'Georgia', serif",
            fontSize: '12pt',
            lineHeight: 1.8,
            color: '#1a1a1a',
          }}
        >
          {/* Doc Header */}
          <div style={{ borderBottom: '2px solid #333', paddingBottom: '4mm', marginBottom: '8mm' }}>
            <div style={{ fontSize: '18pt', fontWeight: 700 }}>{doc.title}</div>
            <div style={{ fontSize: '9pt', color: '#666', marginTop: '2mm' }}>
              {doc.type} • Version {doc.currentVersion} • {doc.projectName || 'General'}
            </div>
            <div style={{ fontSize: '9pt', color: '#888', marginTop: '1mm' }}>
              Submitted by {doc.createdByName} on {formatDate(doc.submittedAt)}
            </div>
          </div>
          {/* Content */}
          <div
            dangerouslySetInnerHTML={{ __html: doc.latestContent || '<p style="color:#aaa">No content</p>' }}
            style={{ minHeight: '100px' }}
          />
        </div>

        {/* Version Timeline */}
        {versions.length > 0 && (
          <div className="mx-auto max-w-3xl mt-6">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Version Timeline
            </h3>
            <div className="space-y-2">
              {versions.slice(0, 5).map((v, i) => (
                <div key={v._id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-4 w-4 rounded-full border-2 ${i === 0 ? 'border-rose-500 bg-rose-500' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900'}`} />
                    {i < versions.length - 1 && <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-700 mt-1" style={{ height: '16px' }} />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{v.version}</span>
                      <span className="text-[10px] text-neutral-400">{relativeTime(v.createdAt)}</span>
                    </div>
                    <p className="text-[10px] text-neutral-500">{v.editedByName} — {v.changeSummary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const CEOLegalApproval = () => {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterPriority) params.priority = filterPriority;
      const res = await getPendingDocuments(token, params);
      setDocs(res.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending documents');
    } finally {
      setLoading(false);
    }
  }, [token, filterType, filterPriority]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const openDoc = async (id) => {
    try {
      const [docRes, verRes] = await Promise.allSettled([
        getLegalDocumentById(token, id),
        getDocumentVersions(token, id),
      ]);
      if (docRes.status === 'fulfilled') setSelectedDoc(docRes.value.data);
      if (verRes.status === 'fulfilled') setVersions(verRes.value.data || []);
    } catch (err) {
      alert(err.message || 'Failed to load document');
    }
  };

  const handleApprove = async () => {
    if (!selectedDoc) return;
    setActionLoading('approve');
    try {
      await approveDocument(token, selectedDoc._id, '');
      showToast(`"${selectedDoc.title}" approved successfully.`, 'success');
      setSelectedDoc(null);
      fetchPending();
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (remarks) => {
    if (!selectedDoc) return;
    setActionLoading('reject');
    try {
      await rejectDocument(token, selectedDoc._id, remarks);
      showToast(`"${selectedDoc.title}" rejected and sent back to LAW team.`, 'info');
      setShowRejectModal(false);
      setSelectedDoc(null);
      fetchPending();
    } catch (err) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex overflow-hidden bg-white dark:bg-neutral-900" style={{ height: 'calc(100vh - 0px)' }}>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── LEFT: Queue Panel ── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow">
              <span className="material-symbols-outlined text-white text-lg">gavel</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Legal Approval Queue</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {docs.length} pending review{docs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* Filters */}
          <div className="space-y-1.5">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none">
              <option value="">All Document Types</option>
              {['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 outline-none">
              <option value="">All Priorities</option>
              {['Low', 'Medium', 'High', 'Critical'].map((p) => (<option key={p}>{p}</option>))}
            </select>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-600 dark:text-red-400">{error}</div>
          )}
          {!loading && docs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-600">
              <span className="material-symbols-outlined text-5xl mb-3 text-emerald-400">check_circle</span>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">All clear!</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mt-1">No documents pending approval</p>
            </div>
          )}
          {!loading && docs.map((doc) => (
            <button
              key={doc._id}
              onClick={() => openDoc(doc._id)}
              className={`w-full text-left mb-2 rounded-xl border p-3.5 transition-all hover:shadow-sm ${
                selectedDoc?._id === doc._id
                  ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/10'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
              }`}
            >
              {/* Type + Priority */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-rose-500 text-sm">
                  {TYPE_ICON[doc.type] || 'description'}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{doc.type}</span>
                <div className="ml-auto">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_BADGE[doc.priority] || ''}`}>
                    {doc.priority}
                  </span>
                </div>
              </div>
              {/* Title */}
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 mb-1">{doc.title}</p>
              {/* Meta */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">
                  {doc.createdByName || 'LAW'} • {doc.currentVersion}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {relativeTime(doc.submittedAt)}
                </span>
              </div>
              {doc.projectName && (
                <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                  📁 {doc.projectName}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2">
              <p className="text-lg font-bold text-amber-600">{docs.length}</p>
              <p className="text-[9px] text-amber-500">Pending</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
              <p className="text-lg font-bold text-red-600">{docs.filter((d) => d.priority === 'Critical').length}</p>
              <p className="text-[9px] text-red-500">Critical</p>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2">
              <p className="text-lg font-bold text-orange-600">{docs.filter((d) => d.priority === 'High').length}</p>
              <p className="text-[9px] text-orange-500">High</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Document Preview ── */}
      <div className="flex-1 overflow-hidden">
        {!selectedDoc ? (
          <div className="flex h-full flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 p-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 mb-5 shadow-inner">
              <span className="material-symbols-outlined text-5xl text-amber-500">gavel</span>
            </div>
            <h3 className="text-lg font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
              Select a Document to Review
            </h3>
            <p className="text-sm text-center max-w-xs text-neutral-400 dark:text-neutral-500">
              Choose a document from the approval queue to view its full content and take action.
            </p>
          </div>
        ) : (
          <DocPreviewPanel
            doc={selectedDoc}
            versions={versions}
            actionLoading={actionLoading}
            onApprove={handleApprove}
            onRejectClick={() => setShowRejectModal(true)}
            onClose={() => setSelectedDoc(null)}
          />
        )}
      </div>

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <RejectModal
          doc={selectedDoc}
          loading={actionLoading === 'reject'}
          onReject={handleReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
    </div>
  );
};

export default CEOLegalApproval;
