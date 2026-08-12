import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import IconButton from '../common/IconButton';
import Button from '../common/Button';
import FilterDrawer from '../common/FilterDrawer';
import {
  getAllDocuments,
  getLegalDocumentById,
  deleteLegalDocument,
  getLegalDocumentPdf,
} from '../../api/legalDocument';

const STATUS_TONE = { Draft: 'neutral', Pending: 'warning', Approved: 'success', Rejected: 'danger' };
const STATUS_ICON = { Draft: 'edit_note', Pending: 'hourglass_empty', Approved: 'verified', Rejected: 'cancel' };

const TYPE_ICON = {
  Contract: 'contract', Agreement: 'handshake', Policy: 'policy',
  NDA: 'lock', Compliance: 'verified_user', IP: 'copyright',
  Dispute: 'balance', Other: 'description',
};

const DOC_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];
const STATUS_OPTIONS = ['Draft', 'Pending', 'Approved', 'Rejected'];

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

// ── Document View Modal ────────────────────────────────────────────────────────
const DocViewModal = ({ doc, token, onClose, toast }) => {
  const handleDownloadPdf = async () => {
    if (!doc?._id) return;
    try {
      const { blob, filename } = await getLegalDocumentPdf(token, doc._id);
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-5xl flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden" style={{ maxHeight: '95vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{doc.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge tone={STATUS_TONE[doc.status]} label={doc.status} />
              <span className="text-xs text-neutral-400">{doc.type} • {doc.currentVersion}</span>
              {doc.projectName && <span className="text-xs text-neutral-400">• {doc.projectName}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="danger" size="sm" onClick={handleDownloadPdf} icon={<span className="material-symbols-outlined text-sm">picture_as_pdf</span>}>
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <IconButton icon="close" tooltip="Close" onClick={onClose} />
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

// ── Filters (shared content between inline row and mobile drawer) ──────────────
const RegistryFilters = ({ searchTerm, setSearchTerm, filterStatus, setFilterStatus, filterType, setFilterType }) => (
  <div className="flex flex-1 flex-col gap-3 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center">
    <div className="relative min-w-0 flex-1 min-[900px]:max-w-xs">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-400">search</span>
      <input
        type="text"
        placeholder="Search documents…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="app-input pl-10 pr-9"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => setSearchTerm('')}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
    <select
      value={filterStatus}
      onChange={(e) => setFilterStatus(e.target.value)}
      className="app-input min-[900px]:w-44"
    >
      <option value="">All Status</option>
      {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
    </select>
    <select
      value={filterType}
      onChange={(e) => setFilterType(e.target.value)}
      className="app-input min-[900px]:w-44"
    >
      <option value="">All Types</option>
      {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
    </select>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminLegalRegistry = () => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await getAllDocuments(token, params);
      setDocs(res.data?.data?.items || []);
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
      setViewDoc(res.data?.data || res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load document');
    }
  };

  const handleDelete = async (doc) => {
    const shouldProceed = await confirm({
      title: 'Delete document?',
      message: `This will permanently delete "${doc.title}". This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!shouldProceed) return;

    try {
      await deleteLegalDocument(token, doc._id);
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
      toast.success('Document deleted.');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const filtered = docs.filter((d) =>
    !searchTerm || d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = STATUS_OPTIONS.map((s) => ({
    label: s, count: docs.filter((d) => d.status === s).length,
  }));

  const filterProps = { searchTerm, setSearchTerm, filterStatus, setFilterStatus, filterType, setFilterType };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Legal Document Registry"
          subtitle="Manage organization-wide legal documents"
          icon="folder_open"
          showSearch={false}
          showNotifications={false}
          showThemeToggle
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => setFiltersOpen(true)}
            className="min-h-11 min-[900px]:hidden"
            icon={<span className="material-symbols-outlined text-lg">tune</span>}
          >
            Filters
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={fetchDocs}
            className="min-h-11"
            icon={<span className="material-symbols-outlined text-lg">refresh</span>}
          >
            Refresh
          </Button>
        </PortalHeader>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ label, count }) => (
            <KPICard
              key={label}
              title={label}
              value={count}
              icon={STATUS_ICON[label]}
              compact
            />
          ))}
        </div>

        {/* Filters (inline, desktop/tablet ≥900px) */}
        <div className="mb-5 hidden rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 min-[900px]:flex">
          <RegistryFilters {...filterProps} />
        </div>

        {/* Table / Cards */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white py-20 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined mb-3 text-5xl text-neutral-300 dark:text-neutral-600">folder_open</span>
            <h3 className="mb-1 text-base font-semibold text-neutral-700 dark:text-neutral-300">No documents found</h3>
            <p className="mb-4 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
              Try adjusting your search or filters, or check back after new documents are registered.
            </p>
            <Button variant="secondary" size="sm" onClick={fetchDocs} icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
              Refresh
            </Button>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Desktop/tablet table */}
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Document</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Created By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Version</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filtered.map((doc) => (
                      <tr key={doc._id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-neutral-400">
                              {TYPE_ICON[doc.type] || 'description'}
                            </span>
                            <div className="min-w-0">
                              <p className="line-clamp-1 font-medium text-neutral-900 dark:text-neutral-100">{doc.title}</p>
                              {doc.projectName && (
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">{doc.projectName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{doc.type}</td>
                        <td className="px-4 py-3"><StatusBadge tone={STATUS_TONE[doc.status]} label={doc.status} /></td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{doc.createdByName || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-500">{doc.currentVersion}</td>
                        <td className="px-4 py-3 text-xs text-neutral-500">{formatDate(doc.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton icon="visibility" tooltip="View document" size="sm" onClick={() => handleView(doc._id)} />
                            {!doc.isLocked && (
                              <IconButton icon="delete" tone="danger" tooltip="Delete document" size="sm" onClick={() => handleDelete(doc)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filtered.map((doc) => (
                <div key={doc._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 material-symbols-outlined text-xl text-neutral-400">
                      {TYPE_ICON[doc.type] || 'description'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{doc.title}</p>
                      {doc.projectName && <p className="truncate text-xs text-neutral-400">{doc.projectName}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={STATUS_TONE[doc.status]} label={doc.status} />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{doc.type}</span>
                        <span className="text-xs text-neutral-400">v{doc.currentVersion}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">
                        By {doc.createdByName || '—'} · {formatDate(doc.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <IconButton icon="visibility" tooltip="View document" onClick={() => handleView(doc._id)} />
                    {!doc.isLocked && (
                      <IconButton icon="delete" tone="danger" tooltip="Delete document" onClick={() => handleDelete(doc)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        subtitle="Refine the document registry"
        hiddenAbove="min-[900px]:hidden"
      >
        <RegistryFilters {...filterProps} />
      </FilterDrawer>

      {/* View Modal */}
      {viewDoc && <DocViewModal doc={viewDoc} token={token} onClose={() => setViewDoc(null)} toast={toast} />}
    </main>
  );
};

export default AdminLegalRegistry;
