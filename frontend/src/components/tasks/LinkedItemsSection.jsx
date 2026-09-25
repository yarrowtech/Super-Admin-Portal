import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import StatusBadge from '../common/StatusBadge';
import { MODULE_LABELS, humanize } from './LinkedItemsPicker';
import TaskDocumentWorkspace from './TaskDocumentWorkspace';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '');
export const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (['approved', 'active', 'validated', 'completed', 'ready'].includes(s)) return 'success';
  if (['pending', 'in review', 'pending approval', 'draft'].includes(s)) return 'warning';
  if (['rejected', 'expired', 'terminated', 'attention', 'cancelled'].includes(s)) return 'danger';
  return 'neutral';
};

export const ItemDetail = ({ taskId, item }) => {
  const { token } = useAuth();
  const [fileError, setFileError] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['law', 'task-item', taskId, item.recordId],
    queryFn: () => lawApi.getTaskItem(token, taskId, item.recordId),
    enabled: Boolean(token),
  });
  const detail = data?.data;

  const openFile = async (file, download) => {
    setFileError('');
    try {
      const blob = await lawApi.getTaskItemFile(token, taskId, item.recordId, file.index, { download });
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'file';
        a.click();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setFileError(err?.message || 'Unable to open file');
    }
  };

  if (isLoading) return <p className="px-3 pb-3 text-sm text-neutral-400">Loading details...</p>;
  if (isError || !detail) return <p className="px-3 pb-3 text-sm text-rose-600">This item is no longer available.</p>;
  const rows = [
    ['Reference', detail.referenceNumber],
    ['Priority', detail.priority && humanize(detail.priority)],
    ['Approval', detail.approvalStatus && humanize(detail.approvalStatus)],
    ['Law review', detail.lawStatus && humanize(detail.lawStatus)],
    ['Version', detail.version],
    ['Confidentiality', detail.confidentiality],
    ['Owner', detail.owner],
    ['Due / expiry', formatDate(detail.dueDate)],
    ['Updated', formatDate(detail.updatedAt)],
  ].filter(([, v]) => v);
  return (
    <div className="space-y-2 px-3 pb-3 text-sm">
      {detail.description && <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{detail.description}</p>}
      {rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          {rows.map(([k, v]) => (<div key={k}><dt className="text-xs text-neutral-400">{k}</dt><dd>{v}</dd></div>))}
        </dl>
      )}
      {detail.files?.length > 0 && (
        <ul className="space-y-1">
          {detail.files.map((file) => (
            <li key={file.index} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-neutral-400">attach_file</span>
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => openFile(file, false)} className="text-xs font-semibold text-primary hover:underline">View</button>
              <button type="button" onClick={() => openFile(file, true)} className="text-xs font-semibold text-primary hover:underline">Download</button>
            </li>
          ))}
        </ul>
      )}
      {fileError && <p role="alert" className="text-xs text-rose-600">{fileError}</p>}
      <p className="text-[11px] text-neutral-400">Read-only view shared through this task.</p>
    </div>
  );
};

/**
 * "Documents & linked items" for a Law task. Server-side access is by task assignment + link;
 * documents the head shared with "Can edit" open in the full editor with notes / key points.
 */
const LinkedItemsSection = ({ taskId, taskTitle, hasLinks }) => {
  const { token } = useAuth();
  const [openKey, setOpenKey] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['law', 'task-items', taskId],
    queryFn: () => lawApi.getTaskItems(token, taskId),
    enabled: Boolean(token && taskId && hasLinks),
  });
  const items = data?.data || [];
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Documents &amp; linked items</p>
      {!hasLinks ? (
        <p className="text-sm text-neutral-400">No documents or contracts linked to this task.</p>
      ) : isLoading ? (
        <p className="text-sm text-neutral-400">Loading linked items...</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">Unable to load linked items.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const key = `${item.module}:${item.recordId}`;
            const open = openKey === key;
            return (
              <li key={key} className="rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button type="button" disabled={item.missing} onClick={() => setOpenKey(open ? null : key)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60" aria-expanded={open}>
                    <span className="material-symbols-outlined text-neutral-400">{item.module === 'document' ? 'description' : 'contract'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="block text-xs text-neutral-500">
                        {item.missing ? 'No longer available' : `${MODULE_LABELS[item.module] || 'Item'} · ${humanize(item.type)}${item.projectName ? ` · ${item.projectName}` : ''}${item.fileCount ? ` · ${item.fileCount} file${item.fileCount === 1 ? '' : 's'}` : ''}`}
                      </span>
                      {item.module === 'document' && !item.missing && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${item.canEdit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>{item.canEdit ? 'Can edit' : 'Read-only'}</span>
                          {item.annotationCount > 0 && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{item.annotationCount} note{item.annotationCount === 1 ? '' : 's'}</span>}
                          {item.criticalCount > 0 && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{item.criticalCount} critical</span>}
                        </span>
                      )}
                    </span>
                    {item.status && <StatusBadge tone={statusTone(item.status)} label={humanize(item.status)} dot={false} />}
                  </button>
                  {item.module === 'document' && !item.missing && (
                    <button type="button" onClick={() => setWorkspaceId(item.recordId)} className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                      {item.canEdit ? 'Open & edit' : 'Open'}
                    </button>
                  )}
                </div>
                {open && <ItemDetail taskId={taskId} item={item} />}
              </li>
            );
          })}
        </ul>
      )}
      {workspaceId && (
        <TaskDocumentWorkspace taskId={taskId} taskTitle={taskTitle} recordId={workspaceId} onClose={() => setWorkspaceId(null)} />
      )}
    </div>
  );
};

export default LinkedItemsSection;
