import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { useConfirmDialog } from '../../../../context/ConfirmDialogContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import DataTable from '../../../ui/DataTable';
import ErrorState from '../../../ui/ErrorState';
import Button from '../../../common/Button';
import FileUploadModal from './FileUploadModal';
import FileVersionHistoryModal from './FileVersionHistoryModal';

const unwrap = (res) => res?.data ?? res ?? [];

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Documents' },
  { value: 'link', label: 'Links' },
];

const TYPE_ICON = { image: 'image', pdf: 'picture_as_pdf', document: 'description', link: 'link' };

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// `assetId` scopes the tab to one asset's files (used inside Asset Detail's
// Files tab) — omit it for the category-wide Files tab.
const CategoryFilesTab = ({ portfolioId, categoryId, assetId }) => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [type, setType] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [historyFile, setHistoryFile] = useState(null);

  const params = { type, assetId };
  const query = useQuery({
    queryKey: QK.portfolioHierarchy.files(categoryId, params),
    queryFn: () => portfolioHierarchyApi.getFiles(token, categoryId, params),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.files(categoryId, params)),
  });
  const files = unwrap(query.data);

  const invalidateFiles = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'files', categoryId] });
    invalidate({ portfolioId, categoryId });
  };

  const archiveMutation = useMutation({
    mutationFn: (fileId) => portfolioHierarchyApi.archiveFile(token, fileId),
    onSuccess: () => { toast.success('File archived.'); invalidateFiles(); },
    onError: (err) => toast.error(err?.message || 'Failed to archive file'),
  });

  const handleArchive = async (file) => {
    const ok = await confirm({ title: 'Archive file?', message: `"${file.name}" will be hidden from this list.`, confirmLabel: 'Archive', tone: 'warning' });
    if (ok) archiveMutation.mutate(file._id);
  };

  if (query.isError) return <ErrorState title="Could not load files" description={query.error?.message} onRetry={() => query.refetch()} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
          {TYPE_FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setType(f.value)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${type === f.value ? 'bg-primary text-white' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setUploadOpen(true)} icon={<span className="material-symbols-outlined text-lg">upload</span>}>Upload File</Button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <DataTable
          columns={[
            { key: 'name', header: 'File', render: (f) => (
              <span className="inline-flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                <span className="material-symbols-outlined text-[18px] text-neutral-400">{TYPE_ICON[f.fileType] || 'draft'}</span>
                {f.name}
              </span>
            ) },
            { key: 'fileType', header: 'Type', render: (f) => <span className="capitalize">{f.fileType}</span> },
            { key: 'sizeBytes', header: 'Size', render: (f) => fmtSize(f.sizeBytes) },
            { key: 'currentVersion', header: 'Version', render: (f) => `v${f.currentVersion}` },
            { key: 'asset', header: 'Linked Asset', render: (f) => f.asset?.title || '—' },
            { key: 'uploadedBy', header: 'Uploaded By', render: (f) => f.uploadedBy?.name || '—' },
            { key: 'updatedAt', header: 'Date', render: (f) => fmtDate(f.updatedAt) },
          ]}
          rows={files}
          rowKey="_id"
          loading={query.isLoading}
          emptyTitle="No files yet"
          emptyDescription="Upload briefs, documents and media."
          emptyAction={{ label: 'Upload File', onClick: () => setUploadOpen(true) }}
          rowActions={(f) => [
            f.url ? { label: 'Preview', icon: 'visibility', onClick: () => window.open(f.url, '_blank', 'noopener') } : null,
            f.url ? { label: 'Download', icon: 'download', onClick: () => window.open(f.url, '_blank', 'noopener') } : null,
            { label: 'Replace', icon: 'sync', onClick: () => setReplaceTarget(f) },
            { label: 'Version history', icon: 'history', onClick: () => setHistoryFile(f) },
            { label: 'Archive', icon: 'archive', tone: 'danger', onClick: () => handleArchive(f) },
          ]}
        />
      </div>

      <FileUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} portfolioId={portfolioId} categoryId={categoryId} />
      <FileUploadModal open={Boolean(replaceTarget)} onClose={() => setReplaceTarget(null)} portfolioId={portfolioId} categoryId={categoryId} replaceTarget={replaceTarget} />
      <FileVersionHistoryModal open={Boolean(historyFile)} onClose={() => setHistoryFile(null)} file={historyFile} />
    </section>
  );
};

export default CategoryFilesTab;
