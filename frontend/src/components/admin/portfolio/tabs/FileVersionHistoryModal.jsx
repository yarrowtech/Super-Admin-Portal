import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import Modal from '../../../ui/Modal';
import Skeleton from '../../../ui/Skeleton';
import EmptyState from '../../../ui/EmptyState';

const unwrap = (res) => res?.data ?? res ?? [];

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// History is never deleted on replace (spec §12) — this lists every version,
// newest first, with the actual file link so an older version can be opened.
const FileVersionHistoryModal = ({ open, onClose, file }) => {
  const { token } = useAuth();
  const query = useQuery({
    queryKey: QK.portfolioHierarchy.fileVersions(file?._id),
    queryFn: () => portfolioHierarchyApi.getFileVersions(token, file._id),
    enabled: Boolean(token && file?._id && open),
    ...cachePolicyFor(QK.portfolioHierarchy.fileVersions(file?._id)),
  });
  const versions = unwrap(query.data);

  return (
    <Modal open={open} title={`Version history — ${file?.name || ''}`} onClose={onClose}>
      {query.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : versions.length === 0 ? (
        <EmptyState icon="history" title="No versions yet" />
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.version} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">v{v.version}{v.version === file.currentVersion ? ' (current)' : ''}</p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {new Date(v.uploadedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {v.uploadedBy?.name ? ` · ${v.uploadedBy.name}` : ''}
                  {v.sizeBytes ? ` · ${fmtSize(v.sizeBytes)}` : ''}
                </p>
                {v.note && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{v.note}</p>}
              </div>
              {v.url && (
                <a href={v.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20">
                  Open
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default FileVersionHistoryModal;
