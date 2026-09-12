import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getApprovedDocuments,
  getLegalDocumentById,
  getDocumentVersions,
  getLegalDocumentPdf,
} from '../../api/legalDocument';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
import FilterToolbar from '../common/FilterToolbar';
import Modal from '../ui/Modal';
import useLawProjectContext from './useLawProjectContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const DOC_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];

const TYPE_ICON = {
  Contract: 'contract', Agreement: 'handshake', Policy: 'policy',
  NDA: 'lock', Compliance: 'verified_user', IP: 'copyright',
  Dispute: 'balance', Other: 'description',
};

const TYPE_COLORS = {
  Contract:   { pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',          icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'   },
  Agreement:  { pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-700', icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' },
  Policy:     { pill: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:ring-teal-700',          icon: 'bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400'   },
  NDA:        { pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',          icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'   },
  Compliance: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
  IP:         { pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-700', icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
  Dispute:    { pill: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:ring-orange-700', icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' },
  Other:      { pill: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700', icon: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

const normalizeLegalError = (err) => {
  const message = err?.message || 'Failed to load approved documents';
  if (/legal document routes are temporarily unavailable/i.test(message)) {
    return 'Legal document service is updated. Restart the backend server and refresh this page.';
  }
  return message;
};

// ─── Document Viewer Modal ────────────────────────────────────────────────────
const DocViewer = ({ doc, versions, token, onClose, toast }) => {
  const handleDownloadPdf = async () => {
    if (!doc?._id) return;
    try {
      const { blob, filename } = await getLegalDocumentPdf(token, doc._id);
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    }
  };

  const cfg = TYPE_COLORS[doc.type] || TYPE_COLORS.Other;

  return (
    <Modal
      open
      onClose={onClose}
      className="sm:max-w-5xl"
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.pill}`}>{doc.type}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700">
            <span className="material-symbols-outlined text-[12px]">verified</span>
            Approved
          </span>
        </span>
      }
      description={
        <>
          <span className="mt-1 block truncate text-base font-bold text-neutral-900 dark:text-neutral-100">{doc.title}</span>
          Version {doc.currentVersion} · {doc.projectName || 'General'} · Approved by {doc.approvedByName || 'Legal approver'}
        </>
      }
      footer={
        <div className="flex justify-end">
          <Button variant="danger" size="sm" onClick={handleDownloadPdf} icon={<span className="material-symbols-outlined text-sm">picture_as_pdf</span>}>
            Download PDF
          </Button>
        </div>
      }
    >
      <div className="-m-4 flex max-h-[65vh] overflow-hidden lg:-m-5">
          {/* Document content */}
          <div id="legal-print-area" className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 p-6">
            <div
              className="mx-auto max-w-3xl bg-white dark:bg-neutral-900 rounded-xl p-10 shadow border border-neutral-100 dark:border-neutral-800"
              style={{ fontFamily: "'Times New Roman', serif", fontSize: '12pt', lineHeight: 1.8 }}
            >
              <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: '4mm', marginBottom: '8mm', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '18pt', fontWeight: 700 }}>{doc.title}</div>
                  <div style={{ fontSize: '9pt', color: '#555', marginTop: '2mm' }}>{doc.type} · Version {doc.currentVersion} · {doc.projectName || 'General'}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '8pt', color: '#888' }}>
                  <div>✓ APPROVED</div>
                  <div>By: {doc.approvedByName || 'Legal approver'}</div>
                  <div>Date: {formatDate(doc.approvedAt)}</div>
                </div>
              </div>
              <div dangerouslySetInnerHTML={{ __html: doc.latestContent || '<p style="color:#aaa">No content available.</p>' }} />
              <div style={{ borderTop: '1px solid #ddd', marginTop: '8mm', paddingTop: '3mm', fontSize: '8pt', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>Approved on {formatDate(doc.approvedAt)}</span>
                <span>Version {doc.currentVersion}</span>
              </div>
            </div>
          </div>

          {/* Version sidebar */}
          {versions.length > 0 && (
            <div className="w-52 shrink-0 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col">
              <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Version History</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versions.map((v, i) => (
                  <div key={v._id} className={`rounded-xl border p-2.5 ${i === 0 ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/10' : 'border-neutral-200 dark:border-neutral-700'}`}>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{v.version}</p>
                    <p className="text-[10px] text-neutral-400">{v.editedByName}</p>
                    <p className="text-[10px] text-neutral-400">{formatDate(v.createdAt)}</p>
                    {i === 0 && <span className="mt-1 inline-block text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Current</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
      <style>{`@media print{body *{visibility:hidden}#legal-print-area,#legal-print-area *{visibility:visible}#legal-print-area{position:absolute;left:0;top:0;width:100%;padding:20mm}@page{size:A4;margin:15mm}}`}</style>
    </Modal>
  );
};

// ─── Document Card ────────────────────────────────────────────────────────────
const DocCard = ({ doc, onView }) => {
  const cfg = TYPE_COLORS[doc.type] || TYPE_COLORS.Other;
  return (
    <div className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-[var(--portal-accent)] dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cfg.icon}`}>
          <span className="material-symbols-outlined text-[22px]">{TYPE_ICON[doc.type] || 'description'}</span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{doc.currentVersion}</span>
      </div>

      <h3 className="mb-2 flex-1 text-sm font-bold leading-snug text-neutral-900 line-clamp-2 dark:text-neutral-100">{doc.title}</h3>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cfg.pill}`}>{doc.type}</span>
        {doc.projectName && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">{doc.projectName}</span>
        )}
      </div>

      <div className="mb-4 space-y-0.5 text-xs text-neutral-400 dark:text-neutral-500">
        <p>By <span className="text-neutral-600 dark:text-neutral-300">{doc.createdByName || '—'}</span></p>
        <p>Approved <span className="text-neutral-600 dark:text-neutral-300">{formatDate(doc.approvedAt)}</span></p>
      </div>

      <Button
        variant="accent"
        fullWidth
        onClick={() => onView(doc)}
        icon={<span className="material-symbols-outlined text-[15px]">open_in_new</span>}
      >
        View Document
      </Button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LSWLegalLibrary = () => {
  const { token } = useAuth();
  const toast = useToast();
  const { projectId, isProjectScoped } = useLawProjectContext();
  const [docs, setDocs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [searchTerm, setSearchTerm]   = useState('');
  const [viewDoc, setViewDoc]         = useState(null);
  const [viewVersions, setViewVersions] = useState([]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (isProjectScoped) params.projectId = projectId;
      params.sort = 'approved-desc';
      params.limit = 100;
      const res = await getApprovedDocuments(token, params);
      setDocs(res.data?.data?.items || []);
    } catch (err) {
      setError(normalizeLegalError(err));
    } finally {
      setLoading(false);
    }
  }, [token, filterType, isProjectScoped, projectId]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchDocs(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchDocs]);

  const handleView = async (doc) => {
    try {
      const [docRes, verRes] = await Promise.allSettled([
        getLegalDocumentById(token, doc._id),
        getDocumentVersions(token, doc._id),
      ]);
      setViewDoc(docRes.status === 'fulfilled' ? docRes.value.data?.data || docRes.value.data : doc);
      setViewVersions(verRes.status === 'fulfilled' ? verRes.value.data?.data || [] : []);
    } catch {
      setViewDoc(doc);
      setViewVersions([]);
    }
  };

  const projects = [...new Set(docs.map((d) => d.projectName).filter(Boolean))];

  const filtered = docs.filter((d) => {
    if (filterProject && d.projectName !== filterProject) return false;
    if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const grouped = DOC_TYPES.reduce((acc, type) => {
    const group = filtered.filter((d) => d.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  // Type breakdown for stat cards
  const topTypes = DOC_TYPES.map((t) => ({ type: t, count: docs.filter((d) => d.type === t).length }))
    .filter((t) => t.count > 0)
    .slice(0, 3);

  return (
    <main className="portal-page">
      <div className="portal-page-inner">

        <PortalHeader
          title="Approved Legal Library"
          subtitle={`Read-only approved document repository${isProjectScoped ? ' for the selected project' : ''}`}
          icon="library_books"
          showSearch={false}
          showNotifications={false}
          showThemeToggle
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700">
            <span className="material-symbols-outlined text-sm">verified</span>
            Approved
          </div>
          <Button variant="secondary" size="sm" onClick={fetchDocs} icon={<span className="material-symbols-outlined text-base">refresh</span>}>
            Refresh
          </Button>
        </PortalHeader>

        {/* KPI row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Total Approved" value={docs.length} icon="library_books" compact />
          <KPICard title="Document Types" value={topTypes.length > 0 ? DOC_TYPES.filter((t) => docs.some((d) => d.type === t)).length : 0} icon="folder_open" compact />
          <KPICard title="Projects Represented" value={projects.length || (isProjectScoped ? 1 : 0)} icon="category" compact />
          <KPICard title="Matching Filter" value={filtered.length} icon="search" compact />
        </div>

        {/* Search + Filters */}
        <FilterToolbar
          className="mb-5"
          search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Search documents…' }}
          primaryFilters={[
            { key: 'type', label: 'Type', value: filterType, onChange: setFilterType, options: [{ value: '', label: 'All Types' }, ...DOC_TYPES.map((t) => ({ value: t, label: t }))] },
            ...(projects.length > 0 ? [{ key: 'project', label: 'Project', value: filterProject, onChange: setFilterProject, options: [{ value: '', label: 'All Projects' }, ...projects.map((p) => ({ value: p, label: p }))] }] : []),
          ]}
          activeChips={[
            ...(filterType ? [{ key: 'type', label: `Type: ${filterType}`, onRemove: () => setFilterType('') }] : []),
            ...(filterProject ? [{ key: 'project', label: `Project: ${filterProject}`, onRemove: () => setFilterProject('') }] : []),
            ...(searchTerm ? [{ key: 'search', label: `"${searchTerm}"`, onRemove: () => setSearchTerm('') }] : []),
          ]}
          onClearAll={(searchTerm || filterType || filterProject) ? () => { setSearchTerm(''); setFilterType(''); setFilterProject(''); } : undefined}
        />

        {/* Error */}
        {!loading && error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-900/10">
            <span className="material-symbols-outlined mt-0.5 text-lg text-amber-500">warning</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Unable to load documents</p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">{error}</p>
            </div>
            <button type="button" onClick={fetchDocs} className="ml-auto shrink-0 text-xs font-semibold text-amber-700 underline hover:no-underline dark:text-amber-400">Retry</button>
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/20">
                <span className="material-symbols-outlined text-3xl text-emerald-500">library_books</span>
              </div>
              <p className="font-bold text-neutral-700 dark:text-neutral-300">No approved documents yet</p>
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                {searchTerm || filterType || filterProject
                  ? 'No documents match your current filters.'
                  : 'Documents will appear here after legal approval.'}
              </p>
              {(searchTerm || filterType || filterProject) && (
                <Button variant="accent" size="sm" onClick={() => { setSearchTerm(''); setFilterType(''); setFilterProject(''); }}>
                  Clear Filters
                </Button>
              )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mb-6 hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Approved By</th>
                  <th className="px-4 py-3">Approval Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((doc) => (
                  <tr key={`table-${doc._id}`} className="transition hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{doc.title}</p>
                      <p className="text-xs text-neutral-400">{doc.createdByName || 'Legal team'}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TYPE_COLORS[doc.type]?.pill || TYPE_COLORS.Other.pill}`}>{doc.type}</span></td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{doc.projectName || 'General'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{doc.currentVersion}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{doc.approvedByName || 'Legal approver'}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(doc.approvedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => handleView(doc)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)]">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grouped document cards */}
        {!loading && Object.keys(grouped).length > 0 && (
          <div className="space-y-6 lg:hidden">
            {Object.entries(grouped).map(([type, typeDocs]) => {
              const cfg = TYPE_COLORS[type] || TYPE_COLORS.Other;
              return (
                <div key={type}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.icon}`}>
                      <span className="material-symbols-outlined text-[17px]">{TYPE_ICON[type] || 'description'}</span>
                    </div>
                    <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{type}s</h2>
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                      {typeDocs.length}
                    </span>
                    <div className="ml-1 h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {typeDocs.map((doc) => (
                      <DocCard key={doc._id} doc={doc} onView={handleView} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="mt-6 text-center text-xs text-neutral-400">
            Showing {filtered.length} of {docs.length} approved documents
          </p>
        )}

      </div>

      {viewDoc && (
        <DocViewer
          doc={viewDoc}
          versions={viewVersions}
          token={token}
          toast={toast}
          onClose={() => { setViewDoc(null); setViewVersions([]); }}
        />
      )}
    </main>
  );
};

export default LSWLegalLibrary;
