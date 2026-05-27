import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getApprovedDocuments,
  getLegalDocumentById,
  getDocumentVersions,
} from '../../api/legalDocument';

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const DOC_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];

const TYPE_ICON = {
  Contract: 'contract', Agreement: 'handshake', Policy: 'policy',
  NDA: 'lock', Compliance: 'verified_user', IP: 'copyright',
  Dispute: 'balance', Other: 'description',
};

const TYPE_COLORS = {
  Contract:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Agreement:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Policy:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  NDA:        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Compliance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  IP:         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Dispute:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Other:      'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
};

// ── Document Viewer Modal ─────────────────────────────────────────────────────
const DocViewer = ({ doc, versions, onClose }) => {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-5xl flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
        style={{ maxHeight: '95vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-5 py-4">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[doc.type] || TYPE_COLORS.Other}`}>
                {doc.type}
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                ✓ Approved
              </span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">{doc.title}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Version {doc.currentVersion} • {doc.projectName || 'General'} • Approved by {doc.approvedByName || 'CEO'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Download PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-neutral-400">close</span>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Document content */}
          <div id="legal-print-area" className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 p-6">
            <div
              className="mx-auto max-w-3xl bg-white dark:bg-neutral-900 rounded-xl p-10 shadow border border-neutral-100 dark:border-neutral-800"
              style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: 1.8 }}
            >
              {/* Header */}
              <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: '4mm', marginBottom: '8mm' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '18pt', fontWeight: 700 }}>{doc.title}</div>
                    <div style={{ fontSize: '9pt', color: '#555', marginTop: '2mm' }}>
                      {doc.type} • Version {doc.currentVersion} • {doc.projectName || 'General'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '8pt', color: '#888' }}>
                    <div>✓ APPROVED</div>
                    <div>By: {doc.approvedByName}</div>
                    <div>Date: {formatDate(doc.approvedAt)}</div>
                  </div>
                </div>
              </div>
              <div dangerouslySetInnerHTML={{ __html: doc.latestContent || '<p style="color:#aaa">No content</p>' }} />
              {/* Footer */}
              <div style={{ borderTop: '1px solid #ddd', marginTop: '8mm', paddingTop: '3mm', fontSize: '8pt', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>Approved on {formatDate(doc.approvedAt)}</span>
                <span>Version {doc.currentVersion}</span>
              </div>
            </div>
          </div>

          {/* Version sidebar */}
          {versions.length > 0 && (
            <div className="w-52 shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col">
              <div className="border-b border-neutral-200 dark:border-neutral-700 px-3 py-3">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Version History</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versions.map((v, i) => (
                  <div key={v._id} className={`rounded-lg border p-2.5 ${i === 0 ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/10' : 'border-neutral-200 dark:border-neutral-700'}`}>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{v.version}</p>
                    <p className="text-[10px] text-neutral-400">{v.editedByName}</p>
                    <p className="text-[10px] text-neutral-400">{formatDate(v.createdAt)}</p>
                    {i === 0 && (
                      <span className="mt-1 inline-block text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Current</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #legal-print-area, #legal-print-area * { visibility: visible; }
          #legal-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20mm; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
};

// ── Document Card ─────────────────────────────────────────────────────────────
const DocCard = ({ doc, onView }) => (
  <div className="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TYPE_COLORS[doc.type] || TYPE_COLORS.Other}`}>
        <span className="material-symbols-outlined text-xl">
          {TYPE_ICON[doc.type] || 'description'}
        </span>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">{doc.currentVersion}</span>
      </div>
    </div>

    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 mb-2 flex-1">{doc.title}</h3>

    <div className="flex items-center gap-1.5 mb-3">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[doc.type] || TYPE_COLORS.Other}`}>
        {doc.type}
      </span>
      {doc.projectName && (
        <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
          {doc.projectName}
        </span>
      )}
    </div>

    <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-4 space-y-0.5">
      <p>By: <span className="text-neutral-600 dark:text-neutral-400">{doc.createdByName || '—'}</span></p>
      <p>Approved: <span className="text-neutral-600 dark:text-neutral-400">{formatDate(doc.approvedAt)}</span></p>
    </div>

    <button
      onClick={() => onView(doc)}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
    >
      <span className="material-symbols-outlined text-sm">open_in_new</span>
      View Document
    </button>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const LSWLegalLibrary = () => {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [viewVersions, setViewVersions] = useState([]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterType) params.type = filterType;
      const res = await getApprovedDocuments(token, params);
      setDocs(res.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load approved documents');
    } finally {
      setLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleView = async (doc) => {
    try {
      const [docRes, verRes] = await Promise.allSettled([
        getLegalDocumentById(token, doc._id),
        getDocumentVersions(token, doc._id),
      ]);
      if (docRes.status === 'fulfilled') setViewDoc(docRes.value.data);
      else setViewDoc(doc);
      setViewVersions(verRes.status === 'fulfilled' ? verRes.value.data || [] : []);
    } catch {
      setViewDoc(doc);
      setViewVersions([]);
    }
  };

  // Group by type
  const projects = [...new Set(docs.map((d) => d.projectName).filter(Boolean))];

  const filtered = docs.filter((d) => {
    if (filterProject && d.projectName !== filterProject) return false;
    if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Group by type for library view
  const grouped = DOC_TYPES.reduce((acc, type) => {
    const group = filtered.filter((d) => d.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">library_books</span>
              Approved Legal Library
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {docs.length} approved document{docs.length !== 1 ? 's' : ''} — read-only access
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                All documents approved by CEO
              </span>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">search</span>
            <input
              type="text"
              placeholder="Search documents…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-9 pr-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 outline-none focus:border-emerald-400"
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 outline-none">
            <option value="">All Types</option>
            {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          {projects.length > 0 && (
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 outline-none">
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-900/20 mb-4">
              <span className="material-symbols-outlined text-4xl text-emerald-400">library_books</span>
            </div>
            <p className="text-base font-medium text-neutral-600 dark:text-neutral-400 mb-1">No approved documents yet</p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Documents will appear here after CEO approval</p>
          </div>
        )}

        {!loading && Object.keys(grouped).length > 0 && (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, typeDocs]) => (
              <div key={type}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TYPE_COLORS[type] || TYPE_COLORS.Other}`}>
                    <span className="material-symbols-outlined text-base">{TYPE_ICON[type] || 'description'}</span>
                  </div>
                  <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{type}s</h2>
                  <span className="rounded-full bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                    {typeDocs.length}
                  </span>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700 ml-1" />
                </div>
                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {typeDocs.map((doc) => (
                    <DocCard key={doc._id} doc={doc} onView={handleView} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer */}
      {viewDoc && (
        <DocViewer
          doc={viewDoc}
          versions={viewVersions}
          onClose={() => { setViewDoc(null); setViewVersions([]); }}
        />
      )}
    </div>
  );
};

export default LSWLegalLibrary;
