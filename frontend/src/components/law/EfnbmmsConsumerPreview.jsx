import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { policyService } from '../../services/policy';

// A demo of how a real EFNBMMS end user experiences this policy: styled after
// the live eFnbmms marketing site (dark ground, orange accent, scroll-to-agree
// consent), driven entirely by the database content/sections — not a mock.
export default function EfnbmmsConsumerPreview({ open, onClose, policy, detail, token, projectId }) {
  const scrollRef = useRef(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReachedEnd(false);
    setProgress(0);
    setAccepted(false);
    setError('');
    window.setTimeout(() => {
      const node = scrollRef.current;
      if (node && node.scrollHeight <= node.clientHeight + 16) { setReachedEnd(true); setProgress(100); }
    }, 0);
  }, [open, policy?._id]);

  if (!open) return null;

  const handleScroll = (event) => {
    const node = event.currentTarget;
    const max = node.scrollHeight - node.clientHeight;
    setProgress(max > 0 ? Math.min(100, Math.round((node.scrollTop / max) * 100)) : 100);
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) setReachedEnd(true);
  };

  const agree = async () => {
    setAccepting(true); setError('');
    try {
      if (token && projectId && policy?._id) {
        await policyService.accept(token, policy._id, projectId);
      }
      setAccepted(true);
    } catch (requestError) {
      setError(requestError?.message || 'Could not record acceptance.');
    } finally { setAccepting(false); }
  };

  const sections = detail?.sections?.length ? detail.sections : (detail?.currentVersion?.sections || []);
  const content = detail?.currentVersion?.content || '';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0f1712]" role="dialog" aria-modal="true" aria-label={`Preview: ${policy?.title || 'Policy'}`}>
      {/* eFnbmms-styled header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white">
            <span className="text-[#f2a93b]">e</span>Fnbmms
          </span>
          <span className="ml-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">Demo preview</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Close preview"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* Reading progress */}
      <div className="h-1 w-full shrink-0 bg-white/5">
        <div className="h-full bg-[#f2a93b] transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      {/* Scrollable consumer-facing document */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-[#f2a93b]">EFNBMMS · {policy?.policyCode}</p>
          <h1 className="mt-2 text-3xl font-black text-white">{policy?.title || 'Policy'}</h1>
          {detail?.description && <p className="mt-3 text-sm leading-6 text-white/70">{detail.description}</p>}

          {content && (
            <article className="mt-6 whitespace-pre-wrap text-sm leading-7 text-white/80">{content}</article>
          )}

          {sections.map((section) => (
            <section key={section._id || section.key} className="mt-6 border-t border-white/10 pt-6">
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/70">{section.content}</p>
            </section>
          ))}

          {!content && !sections.length && (
            <p className="mt-8 text-sm text-white/50">This policy has no published content yet. Add content when creating or editing the policy.</p>
          )}

          <div className="mt-10 h-1 w-16 rounded-full bg-white/10" aria-hidden="true" />
          <p className="mt-4 text-xs text-white/40">— end of document —</p>
        </div>
      </div>

      {/* Sticky accept bar */}
      <footer className="shrink-0 border-t border-white/10 bg-[#101c15] px-5 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {accepted ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <span className="material-symbols-outlined text-base">check_circle</span>
              You have agreed to this policy.
            </p>
          ) : (
            <p className="text-xs text-white/50">{reachedEnd ? 'You have reached the end of the document.' : 'Scroll to the end to enable agreement.'}</p>
          )}
          {error && <p className="text-xs text-rose-400">{error}</p>}
          {!accepted && (
            <button
              type="button"
              disabled={!reachedEnd || accepting}
              onClick={agree}
              className="rounded-xl bg-[#f2a93b] px-5 py-2.5 text-sm font-bold text-[#101c15] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {accepting ? 'Saving…' : 'I have read and agree'}
            </button>
          )}
        </div>
      </footer>
    </div>,
    document.body,
  );
}
