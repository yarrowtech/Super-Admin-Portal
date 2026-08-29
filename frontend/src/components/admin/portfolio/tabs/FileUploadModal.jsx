import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import Modal from '../../../ui/Modal';
import Button from '../../../common/Button';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';

const unwrap = (res) => res?.data ?? res ?? {};

// Handles both a new upload and a "replace" (when `replaceTarget` is set, the
// existing PortfolioFile gets a new version instead of a new document — spec §12).
const FileUploadModal = ({ open, onClose, portfolioId, categoryId, replaceTarget }) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [mode, setMode] = useState('file'); // 'file' | 'link'
  const [name, setName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [assetId, setAssetId] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const assetsQuery = useQuery({
    queryKey: QK.portfolioHierarchy.assets(categoryId, { limit: 100 }),
    queryFn: () => portfolioHierarchyApi.getAssets(token, categoryId, { limit: 100 }),
    enabled: Boolean(token && categoryId && open),
    ...cachePolicyFor(QK.portfolioHierarchy.assets(categoryId, { limit: 100 })),
  });
  const assets = unwrap(assetsQuery.data).items || [];

  const reset = () => { setMode('file'); setName(''); setLinkUrl(''); setAssetId(''); setNote(''); setFile(null); setError(''); };
  const close = () => { reset(); onClose(); };

  const invalidateFiles = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'files', categoryId] });
    invalidate({ portfolioId, categoryId });
  };

  const uploadMutation = useMutation({
    mutationFn: (formData) => (replaceTarget
      ? portfolioHierarchyApi.replaceFile(token, replaceTarget._id, formData)
      : portfolioHierarchyApi.uploadFile(token, categoryId, formData)),
    onSuccess: () => { toast.success(replaceTarget ? 'New version uploaded.' : 'File added.'); invalidateFiles(); close(); },
    onError: (err) => setError(err?.message || 'Upload failed'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'file' && !file) return setError('Choose a file to upload');
    if (mode === 'link' && !linkUrl.trim()) return setError('A link URL is required');

    const formData = new FormData();
    if (mode === 'file' && file) formData.append('file', file);
    if (mode === 'link') formData.append('linkUrl', linkUrl.trim());
    if (name.trim()) formData.append('name', name.trim());
    if (!replaceTarget && assetId) formData.append('assetId', assetId);
    if (note.trim()) formData.append('note', note.trim());
    uploadMutation.mutate(formData);
  };

  return (
    <Modal open={open} title={replaceTarget ? `Replace "${replaceTarget.name}"` : 'Upload File'} onClose={close}>
      <form className="space-y-3" onSubmit={submit}>
        {!replaceTarget || replaceTarget.fileType !== 'link' ? (
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
            {['file', 'link'].map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition ${mode === m ? 'bg-white shadow-sm dark:bg-neutral-800' : 'text-neutral-500'}`}>
                {m === 'file' ? 'Upload file' : 'Add link'}
              </button>
            ))}
          </div>
        ) : null}

        {mode === 'file' ? (
          <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-3 py-6 text-sm font-semibold text-neutral-400 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-neutral-700">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {file ? file.name : 'Choose a file'}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        ) : (
          <Input label="Link URL" name="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
        )}

        <Input label="Display name (optional)" name="name" value={name} onChange={(e) => setName(e.target.value)} />
        {!replaceTarget && (
          <Select
            label="Link to asset (optional)"
            name="assetId"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            options={[{ value: '', label: 'Not linked' }, ...assets.map((a) => ({ value: a._id, label: a.title }))]}
          />
        )}
        <Input label="Note (optional)" name="note" value={note} onChange={(e) => setNote(e.target.value)} />
        {error ? <p className="text-sm font-semibold text-rose-500">{error}</p> : null}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" loading={uploadMutation.isPending}>{replaceTarget ? 'Upload new version' : 'Add file'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default FileUploadModal;
