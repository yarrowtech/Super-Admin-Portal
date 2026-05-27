import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllDocuments,
  getLegalDocumentById,
  deleteLegalDocument,
} from '../../api/legalDocument';

const STATUS_STYLES = {
  Draft:    { bg: 'bg-neutral-100 dark:bg-neutral-800',    text: 'text-neutral-600 dark:text-neutral-400',  dot: 'bg-neutral-400' },
  Pending:  { bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',      dot: 'bg-amber-500' },
  Approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400',  dot: 'bg-emerald-500' },
  Rejected: { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-400',          dot: 'bg-red-500' },
};

const TYPE_ICON = {
  Contract: 'contract', Agreement: 'handshake', Policy: 'policy',
  NDA: 'lock', Compliance: 'verified_user', IP: 'copyright',
  Dispute: 'balance', Other: 'description',
};

const DOC_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Draft;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
};

// ── Document View Modal ────────────────────────────────────────────────────────
const DocViewModal = ({ doc, onClose }) => {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-5xl flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden" style={{ maxHeight: '95vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{doc.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={doc.status} />
              <span className="text-xs text-neutral-400">{doc.type} • {doc.currentVersion}</span>
              {doc.projectName && <span className="text-xs text-neutral-400">• {doc.projectName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Download PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-neutral-400">close</span>
            </button>
          </div>
        </div>

        {/* Approval info banner */}
        {doc.status === 'Approved' && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2.5 border-b border-emerald-200 dark:border-emerald-800">
            <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              Approved by <strong>{doc.approvedByName || 'CEO'}</strong> on {formatDate(doc.approvedAt)}
            </span>
          </div>
        )}

        {/* Document content */}
        <div id="legal-print-area" className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 p-6">
          <div
            className="mx-auto max-w-3xl bg-white dark:bg-neutral-900 rounded-xl p-10 shadow-sm border border-neutral-100 dark:border-neutral-800"
            style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: 1.8 }}
          >
            {/* Document Header */}
            <div style={{ borderBottom: '2px solid #333', paddingBottom: '4mm', marginBottom: '8mm' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '18pt', fontWeight: 700, color: '#1a1a1a' }}>{doc.title}</div>
                  <div style={{ fontSize: '9pt', color: '#666', marginTop: '2mm' }}>
                    {doc.type} • Version {doc.currentVersion} • {doc.projectName || 'General'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '8pt', color: '#888' }}>
                  <div>Status: {doc.status}</div>
                  <div>Created by: {doc.createdByName}</div>
                  {doc.approvedAt && <div>Approved: {formatDate(doc.approvedAt)}</div>}
                </div>
              </div>
            </div>
            {/* Body */}
            <div dangerouslySetInnerHTML={{ __html: doc.latestContent || '<p style="color:#aaa">No content</p>' }} />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #legal-print-area, #legal-print-area * { visibility: visible; }
          #legal-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20mm 25mm; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminLegalRegistry = () => {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await getAllDocuments(token, params);
      setDocs(res.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, filterType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleView = async (id) => {
    try {
      const res = await getLegalDocumentById(token, id);
      setViewDoc(res.data);
    } catch (err) {
      showToast(err.message || 'Failed to load document', 'error');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await deleteLegalDocument(token, doc._id);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
      showToast('Document deleted', 'success');
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const filtered = docs.filter((d) =>
    !searchTerm || d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = ['Draft', 'Pending', 'Approved', 'Rejected'].map((s) => ({
    label: s, count: docs.filter((d) => d.status === s).length,
  }));

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500">folder_open</span>
              Legal Document Registry
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              All legal documents across the organization — {docs.length} total
            </p>
          </div>
          <button onClick={fetchDocs} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {stats.map(({ label, count }) => {
            const s = STATUS_STYLES[label];
            return (
              <div key={label} className={`rounded-xl ${s.bg} px-4 py-3`}>
                <p className={`text-xs font-medium ${s.text} mb-1`}>{label}</p>
                <p className={`text-2xl font-bold ${s.text}`}>{count}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">search</span>
            <input
              type="text"
              placeholder="Search documents…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 outline-none focus:border-rose-400"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 outline-none">
            <option value="">All Status</option>
            {['Draft', 'Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 outline-none">
            <option value="">All Types</option>
            {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <span className="material-symbols-outlined text-5xl mb-3">folder_open</span>
            <p className="text-sm">No documents found</p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((doc) => (
                  <tr key={doc._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-400 text-base">
                          {TYPE_ICON[doc.type] || 'description'}
                        </span>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">{doc.title}</p>
                          {doc.projectName && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">{doc.projectName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{doc.type}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{doc.createdByName || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-neutral-500">{doc.currentVersion}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{formatDate(doc.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(doc._id)}
                          title="View Document"
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          <span className="material-symbols-outlined text-sm text-neutral-500">visibility</span>
                        </button>
                        {!doc.isLocked && (
                          <button
                            onClick={() => handleDelete(doc)}
                            title="Delete Document"
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <span className="material-symbols-outlined text-sm text-red-500">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewDoc && <DocViewModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

export default AdminLegalRegistry;
