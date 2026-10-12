import { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../common/Button';
import { departmentApi } from '../../services/departments';
import { uploadAssetBatch } from './bulkAssetUpload';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.mov,.webm,.avi,.pdf,.txt,.zip,.docx,.pptx';
const statusLabels = { queued: 'Ready', uploading: 'Uploading file...', creating: 'Creating asset...', complete: 'Created', failed: 'Failed' };

export default function BulkAssetUploadModal({ token, projectId, projectName, moduleType = 'asset', label = 'Asset', createFn = 'createMediaAsset', initialFiles = [], initialTitle = '', initialCategory = '', initialDescription = '', initialMetadata = {}, onClose, onCreated, onFinished }) {
  const [entries, setEntries] = useState(() => initialFiles.map(file => ({ id: crypto.randomUUID(), file, title: initialTitle.trim() ? `${initialTitle.trim()} - ${file.name.replace(/\.[^.]+$/, '') || file.name}` : file.name.replace(/\.[^.]+$/, '') || file.name, status: 'queued' })));
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState(initialDescription);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const started = entries.some(entry => entry.uploaded || entry.status === 'complete');
  const pending = entries.filter(entry => entry.status !== 'complete');
  const completed = entries.filter(entry => entry.status === 'complete').length;
  const addFiles = files => {
    if (running.current) return;
    setError('');
    setEntries(previous => {
      const next = [...previous];
      for (const file of files) {
        if (next.some(entry => entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified)) continue;
        next.push({ id: crypto.randomUUID(), file, title: file.name.replace(/\.[^.]+$/, '') || file.name, status: 'queued' });
      }
      return next;
    });
  };
  const run = async () => {
    if (running.current || !pending.length) return;
    if (!projectId || pending.some(entry => !entry.title.trim())) { setError('Select a project and give every file a title.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      await uploadAssetBatch({ entries, projectId, moduleType, metadata: initialMetadata, category, description,
        uploadFile: (file, id) => departmentApi.uploadMediaFile(token, file, { section: moduleType, projectId: id }),
        createAsset: payload => departmentApi[createFn](token, payload),
        onChange: changed => setEntries(previous => previous.map(entry => entry.id === changed.id ? changed : entry)),
        onCreated,
      });
    } catch (err) { setError(err.message || 'Bulk upload failed.'); }
    finally { running.current = false; setBusy(false); onFinished(); }
  };
  const close = () => { if (!running.current) onClose(); };
  return <Modal open title={`Bulk upload ${label.toLowerCase()} files`} description="Create one record per file. Titles start with the filenames; shared details apply to the batch." onClose={close} className="sm:max-w-3xl" footer={<>
    <Button variant="secondary" disabled={busy} onClick={close}>{pending.length ? 'Cancel' : 'Done'}</Button>
    {!!pending.length && <Button variant="accent" disabled={busy || !pending.length} onClick={run}>{busy ? 'Uploading...' : entries.some(entry => entry.status === 'failed') ? 'Retry unfinished files' : `Upload ${pending.length} ${pending.length === 1 ? 'file' : 'files'}`}</Button>}
  </>}>
    <div className="space-y-4">
      <div><p className="text-xs font-bold uppercase text-slate-500">Project</p><p className="font-semibold">{projectName || 'Selected project'}</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Category<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3" value={category} disabled={busy || started} onChange={event => setCategory(event.target.value)} placeholder="Category for all files" /></label>
        <label className="text-sm font-semibold">Description<textarea className="mt-1 block w-full rounded-xl border border-slate-300 bg-transparent p-3" value={description} disabled={busy || started} onChange={event => setDescription(event.target.value)} placeholder="Shared notes or approval context" /></label></div>
      <div className="rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 p-5 dark:bg-teal-950/20" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }}>
        <label className="block font-semibold">Choose files or drop them here<input aria-label="Files for bulk upload" type="file" multiple accept={ACCEPT} disabled={busy} className="mt-3 block w-full text-sm" onChange={event => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} /></label>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Images, videos, PDFs, text, ZIP, DOCX and PPTX. Each file uses the existing upload size limit.</p>
      </div>
      {!!entries.length && <p role="status" aria-live="polite" className="text-sm">{completed} of {entries.length} records created{busy ? ' — please keep this window open.' : '.'}</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <ul className="space-y-3">{entries.map(entry => <li key={entry.id} className="rounded-xl border border-slate-200 p-3 dark:border-neutral-700">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="break-all text-xs text-slate-500">{entry.file.name} ({(entry.file.size / 1024 / 1024).toFixed(2)} MB)</p><label className="mt-2 block text-sm">{label} title<input aria-label={`Title for ${entry.file.name}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2" value={entry.title} disabled={busy || entry.status === 'complete'} onChange={event => setEntries(previous => previous.map(item => item.id === entry.id ? { ...item, title: event.target.value } : item))} /></label></div>
          {!busy && entry.status !== 'complete' && <button type="button" className="text-sm text-rose-600" aria-label={`Remove ${entry.file.name}`} onClick={() => setEntries(previous => previous.filter(item => item.id !== entry.id))}>Remove</button>}</div>
        <p className={`mt-2 text-sm ${entry.status === 'failed' ? 'text-rose-600' : entry.status === 'complete' ? 'text-teal-700' : 'text-slate-500'}`}>{statusLabels[entry.status]}{entry.error ? `: ${entry.error}` : ''}</p>
      </li>)}</ul>
    </div>
  </Modal>;
}
