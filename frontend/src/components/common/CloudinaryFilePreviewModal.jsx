import { useEffect, useState } from 'react';
import Button from '../common/Button';
import Modal from '../ui/Modal';

const bytes = (value) => {
  const size = Number(value) || 0;
  if (!size) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const previewKind = (file) => {
  const mime = String(file?.mimeType || '').toLowerCase();
  const name = String(file?.originalName || file?.storageUrl || '').split('?')[0].toLowerCase();
  if (mime.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(name)) return 'image';
  if (mime.startsWith('video/') || /\.(mov|m4v|mp4|webm|ogv)$/.test(name)) return 'video';
  if (mime.startsWith('audio/') || /\.(aac|m4a|mp3|oga|ogg|wav)$/.test(name)) return 'audio';
  if (mime === 'application/pdf' || /\.pdf$/.test(name)) return 'pdf';
  return 'file';
};

// fl_attachment changes only the delivery disposition. It does not resize,
// recompress, or otherwise transform the uploaded Cloudinary original.
const originalDownloadUrl = (url = '') => {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/fl_attachment/');
};

export default function CloudinaryFilePreviewModal({ open, file, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setFailed(false);
    }
  }, [open, file?.storageUrl]);

  if (!file?.storageUrl) return null;
  const kind = previewKind(file);
  const title = file.title || file.originalName || 'File preview';
  const details = [file.mimeType, bytes(file.fileSizeBytes), file.originalName].filter(Boolean).join(' · ');
  const downloadUrl = originalDownloadUrl(file.storageUrl);

  return (
    <Modal
      open={open}
      title={title}
      description={details}
      onClose={onClose}
      className="sm:max-w-6xl"
      footer={(
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <a
            href={downloadUrl}
            download={file.originalName || true}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download original
          </a>
          <a
            href={file.storageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--portal-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Open original
          </a>
        </div>
      )}
    >
      {kind === 'image' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Original-quality preview</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800" aria-label="Zoom out"><span className="material-symbols-outlined text-[19px]">remove</span></button>
              <button type="button" onClick={() => setZoom(1)} className="min-w-14 rounded-lg px-2 py-1.5 text-xs font-bold hover:bg-slate-200 dark:hover:bg-neutral-800">{Math.round(zoom * 100)}%</button>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800" aria-label="Zoom in"><span className="material-symbols-outlined text-[19px]">add</span></button>
            </div>
          </div>
          <div className="flex h-[62dvh] min-h-80 items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-200 p-6 dark:border-neutral-800 dark:bg-neutral-950">
            {failed ? (
              <div className="text-center"><span className="material-symbols-outlined text-5xl text-slate-400">broken_image</span><p className="mt-3 font-semibold">The image could not be loaded.</p></div>
            ) : (
              <img src={file.storageUrl} alt={title} onError={() => setFailed(true)} className="block max-h-full max-w-full rounded-lg bg-white object-contain shadow-xl transition-transform duration-200" style={{ transform: `scale(${zoom})` }} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-neutral-800 dark:bg-neutral-950">
          {kind === 'video' ? <video src={file.storageUrl} controls className="max-h-[68dvh] max-w-full" />
            : kind === 'audio' ? <audio src={file.storageUrl} controls className="w-full max-w-xl" />
              : kind === 'pdf' ? <iframe src={file.storageUrl} title={title} className="h-[68dvh] w-full border-0 bg-white" />
                : <div className="p-8 text-center"><span className="material-symbols-outlined text-5xl text-slate-400">draft</span><p className="mt-3 font-semibold">Preview is unavailable for this file type.</p><p className="mt-1 text-sm text-slate-500">Download the original file to view it.</p></div>}
        </div>
      )}
    </Modal>
  );
}
