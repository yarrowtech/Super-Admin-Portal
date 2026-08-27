import { useLayoutEffect, useRef, useState } from 'react';
import { portfolioApi } from '../../services/portfolio';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../common/Button';
import { SectionEyebrow } from './PortfolioOverviewPanel';

// Swipeable / click-through "Strategy Playbook" — a richer presentation-style
// content type (Overview, Goals, Roadmap, Strategy...) distinct from the
// checklist-style pillars elsewhere on the portfolio page. Shared by
// AdminPortfolioPage (editable) and PortfolioViewerPage (read-only).

const TONE_STYLES = {
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'list', label: 'Bullet list' },
  { value: 'badge', label: 'Status badge' },
];

const TONE_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'success', label: 'Success (green)' },
  { value: 'warning', label: 'Warning (amber)' },
  { value: 'danger', label: 'Danger (red)' },
];

const parseGroupsText = (text) => {
  const lines = String(text || '').split('\n');
  const groups = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      current = { heading: line.slice(3).trim(), items: [] };
      groups.push(current);
    } else {
      if (!current) {
        current = { heading: '', items: [] };
        groups.push(current);
      }
      current.items.push(line.replace(/^-\s*/, ''));
    }
  }
  return groups;
};

const groupsToText = (groups = []) =>
  groups.map((g) => `## ${g.heading}\n${(g.items || []).map((i) => `- ${i}`).join('\n')}`).join('\n\n');

const emptyBlockForm = { mode: 'add', slideId: null, blockId: null, title: '', icon: '', subtitle: '', badgeNumber: '', footer: '', tone: 'neutral', type: 'list', textValue: '', itemsText: '', groupsText: '', useGroups: false };

export default function PortfolioPlaybook({ portfolio, token, editable = false, onUpdate }) {
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const slides = [...(portfolio?.playbook || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const [rawIndex, setActiveIndex] = useState(0);
  const activeIndex = Math.min(rawIndex, Math.max(0, slides.length - 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [slideModal, setSlideModal] = useState(null); // { mode, slideId?, title }
  const [blockModal, setBlockModal] = useState(null);
  const [templateGallery, setTemplateGallery] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const dragRef = useRef({ startX: 0, dragging: false });
  const slideRefs = useRef([]);
  const [trackHeight, setTrackHeight] = useState(null);

  // The carousel track lays every slide out side by side in one flex row, so
  // without this its height defaults to the tallest slide (e.g. Strategy) even
  // while a much shorter slide (e.g. Legal) is the one actually showing — this
  // measures just the active slide and animates the viewport to match it.
  useLayoutEffect(() => {
    const activeEl = slideRefs.current[activeIndex];
    if (!activeEl) return undefined;
    const measure = () => setTrackHeight(activeEl.scrollHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(activeEl);
    return () => observer.disconnect();
  });

  if (!portfolio) return null;

  const handleSyncMarketingPlan = async () => {
    const ok = await confirm({
      title: 'Sync from Marketing Plan?',
      message: 'This overwrites Overview, Goals, Roadmap & Strategy with the latest content from the Marketing Plan. Any manual edits to those slides will be replaced.',
      confirmLabel: 'Sync',
      tone: 'danger',
    });
    if (!ok) return;
    setSyncing(true);
    setError('');
    setSyncMessage('');
    try {
      const res = await portfolioApi.syncFromMarketingPlan(token, portfolio._id);
      onUpdate?.(res.data);
      setSyncMessage('Synced Overview, Goals, Roadmap & Strategy from the Marketing Plan.');
      toast.success('Synced from Marketing Plan.');
    } catch (err) {
      setError(err?.message || 'Failed to sync from Marketing Plan');
      toast.error(err?.message || 'Failed to sync from Marketing Plan');
    }
    setSyncing(false);
  };

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () => setActiveIndex((i) => Math.min(slides.length - 1, i + 1));

  const onPointerDown = (e) => {
    dragRef.current = { startX: e.clientX, dragging: true };
  };
  const onPointerUp = (e) => {
    if (!dragRef.current.dragging) return;
    const delta = e.clientX - dragRef.current.startX;
    dragRef.current.dragging = false;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goNext();
      else goPrev();
    }
  };

  const handleUpdated = (res) => {
    onUpdate?.(res.data);
  };

  // ---- Slide CRUD ----
  const openAddSlide = async () => {
    setTemplateGallery(true);
    if (templates) return;
    setTemplatesLoading(true);
    try {
      const res = await portfolioApi.getPlaybookTemplates(token);
      setTemplates(res?.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load slide templates');
    }
    setTemplatesLoading(false);
  };
  const openBlankSlide = () => {
    setTemplateGallery(false);
    setSlideModal({ mode: 'add', title: '' });
  };
  const chooseTemplate = async (key) => {
    setBusy(true);
    setError('');
    try {
      const res = await portfolioApi.addPlaybookSlideFromTemplate(token, portfolio._id, key);
      handleUpdated(res);
      setActiveIndex(slides.length);
      setTemplateGallery(false);
      toast.success('Slide added.');
    } catch (err) {
      setError(err?.message || 'Failed to add slide from template');
      toast.error(err?.message || 'Failed to add slide from template');
    }
    setBusy(false);
  };
  const openRenameSlide = (slide) => setSlideModal({ mode: 'rename', slideId: slide._id, title: slide.title });

  const submitSlide = async (e) => {
    e.preventDefault();
    if (!slideModal?.title?.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = slideModal.mode === 'add'
        ? await portfolioApi.addPlaybookSlide(token, portfolio._id, { title: slideModal.title.trim() })
        : await portfolioApi.updatePlaybookSlide(token, portfolio._id, slideModal.slideId, { title: slideModal.title.trim() });
      handleUpdated(res);
      if (slideModal.mode === 'add') setActiveIndex(slides.length);
      setSlideModal(null);
      toast.success(slideModal.mode === 'add' ? 'Slide added.' : 'Slide renamed.');
    } catch (err) {
      setError(err?.message || 'Failed to save slide');
      toast.error(err?.message || 'Failed to save slide');
    }
    setBusy(false);
  };

  const handleDeleteSlide = async (slide) => {
    const blockCount = (slide.blocks || []).length;
    const ok = await confirm({
      title: 'Delete slide?',
      message: `"${slide.title}"${blockCount ? ` contains ${blockCount} block${blockCount === 1 ? '' : 's'}` : ''}. This action cannot be undone.`,
      confirmLabel: 'Delete slide',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await portfolioApi.removePlaybookSlide(token, portfolio._id, slide._id);
      handleUpdated(res);
      setActiveIndex(0);
      toast.success('Slide deleted.');
    } catch (err) {
      setError(err?.message || 'Failed to delete slide');
      toast.error(err?.message || 'Failed to delete slide');
    }
    setBusy(false);
  };

  // ---- Block CRUD ----
  const openAddBlock = (slideId) => setBlockModal({ ...emptyBlockForm, mode: 'add', slideId });
  const openEditBlock = (slideId, block) => setBlockModal({
    mode: 'edit',
    slideId,
    blockId: block._id,
    title: block.title,
    icon: block.icon || '',
    subtitle: block.subtitle || '',
    badgeNumber: block.badgeNumber || '',
    footer: block.footer || '',
    tone: block.tone || 'neutral',
    type: block.type || 'list',
    textValue: block.text || '',
    itemsText: (block.items || []).join('\n'),
    groupsText: groupsToText(block.groups || []),
    useGroups: (block.groups || []).length > 0,
  });

  const submitBlock = async (e) => {
    e.preventDefault();
    if (!blockModal?.title?.trim()) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: blockModal.title.trim(),
        icon: blockModal.icon,
        subtitle: blockModal.subtitle,
        badgeNumber: blockModal.badgeNumber,
        footer: blockModal.footer,
        tone: blockModal.tone,
        type: blockModal.type,
      };
      if (blockModal.type === 'list') {
        if (blockModal.useGroups) {
          payload.groups = parseGroupsText(blockModal.groupsText);
          payload.items = [];
        } else {
          payload.items = blockModal.itemsText.split('\n').map((s) => s.trim()).filter(Boolean);
          payload.groups = [];
        }
      } else {
        payload.text = blockModal.textValue;
        payload.items = [];
        payload.groups = [];
      }
      const res = blockModal.mode === 'add'
        ? await portfolioApi.addPlaybookBlock(token, portfolio._id, blockModal.slideId, payload)
        : await portfolioApi.updatePlaybookBlock(token, portfolio._id, blockModal.slideId, blockModal.blockId, payload);
      handleUpdated(res);
      setBlockModal(null);
      toast.success(blockModal.mode === 'add' ? 'Block added.' : 'Block updated.');
    } catch (err) {
      setError(err?.message || 'Failed to save block');
      toast.error(err?.message || 'Failed to save block');
    }
    setBusy(false);
  };

  const handleDeleteBlock = async (slideId, block) => {
    const ok = await confirm({
      title: 'Delete block?',
      message: `"${block.title}" will be permanently removed from this slide.`,
      confirmLabel: 'Delete block',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await portfolioApi.removePlaybookBlock(token, portfolio._id, slideId, block._id);
      handleUpdated(res);
      toast.success('Block deleted.');
    } catch (err) {
      setError(err?.message || 'Failed to remove block');
      toast.error(err?.message || 'Failed to remove block');
    }
    setBusy(false);
  };

  if (slides.length === 0 && !editable) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 pt-4 dark:border-neutral-800 sm:px-5">
        <SectionEyebrow>Strategy Playbook</SectionEyebrow>
        {editable ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncMarketingPlan}
              disabled={syncing}
              title="Pull Overview, Goals, Roadmap & Strategy from this project's Marketing Plan in the Media portal — overwrites existing content in those slides"
              icon={<span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin-slow' : ''}`}>sync</span>}
            >
              {syncing ? 'Syncing…' : 'Sync from Marketing Plan'}
            </Button>
            <button
              type="button"
              onClick={openAddSlide}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add slide
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 sm:mx-5">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      ) : null}
      {syncMessage ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300 sm:mx-5">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {syncMessage}
        </div>
      ) : null}

      {slides.length === 0 ? (
        <div className="p-8 text-center">
          <span className="material-symbols-outlined mb-2 text-3xl text-neutral-300 dark:text-neutral-700">auto_stories</span>
          <p className="text-sm font-semibold text-neutral-500">No playbook slides yet.</p>
          {editable ? (
            <button type="button" onClick={openAddSlide} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add your first slide
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Slide tabs — click-by-click navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
              {slides.map((slide, index) => (
                <button
                  key={slide._id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`inline-flex shrink-0 items-center rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    index === activeIndex
                      ? 'bg-primary text-white shadow-[0_4px_14px_-4px_rgba(79,70,229,0.6)]'
                      : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  {slide.title}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {slides.length > 1 ? (
                <span className="text-xs font-semibold text-neutral-400">{activeIndex + 1} / {slides.length}</span>
              ) : null}
              {editable ? (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openRenameSlide(slides[activeIndex])}
                    title="Rename slide"
                    aria-label="Rename slide"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(slides[activeIndex])}
                    title="Delete slide"
                    aria-label="Delete slide"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Swipeable / draggable viewport */}
          <div className="relative px-1 pb-4 sm:px-2">
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  aria-label="Previous slide"
                  className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md transition hover:scale-110 disabled:pointer-events-none disabled:opacity-0 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={activeIndex === slides.length - 1}
                  aria-label="Next slide"
                  className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md transition hover:scale-110 disabled:pointer-events-none disabled:opacity-0 dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </>
            ) : null}

            <div
              className="overflow-hidden px-2 transition-[height] duration-300 ease-out-expo sm:px-8"
              style={trackHeight != null ? { height: trackHeight } : undefined}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
            >
              <div
                className="flex items-start transition-transform duration-300 ease-out-expo"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {slides.map((slide, index) => (
                  <div key={slide._id} ref={(el) => { slideRefs.current[index] = el; }} className="w-full shrink-0 px-0.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {[...(slide.blocks || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map((block) => (
                        <PlaybookBlockCard
                          key={block._id}
                          block={block}
                          editable={editable}
                          onEdit={() => openEditBlock(slide._id, block)}
                          onDelete={() => handleDeleteBlock(slide._id, block)}
                        />
                      ))}
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => openAddBlock(slide._id)}
                          className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-neutral-200 text-xs font-semibold text-neutral-400 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-neutral-700"
                        >
                          <span className="material-symbols-outlined text-xl">add</span>
                          Add block
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {slides.length > 1 ? (
            <div className="flex items-center justify-center gap-1.5 pb-4">
              {slides.map((slide, index) => (
                <button
                  key={slide._id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to ${slide.title}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-neutral-200 dark:bg-neutral-700'}`}
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* Add-slide: template gallery */}
      <Modal open={templateGallery} title="Add Slide" description="Start from a category starter-kit, or add a blank slide" onClose={() => setTemplateGallery(false)}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={openBlankSlide}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-neutral-200 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 dark:border-neutral-700"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
              <span className="material-symbols-outlined text-[18px]">note_add</span>
            </span>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">Blank slide</p>
              <p className="text-xs text-neutral-400">Start empty and add your own blocks</p>
            </div>
          </button>

          {templatesLoading ? (
            <p className="py-4 text-center text-sm text-neutral-400">Loading templates...</p>
          ) : (
            <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {(templates || []).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={busy}
                  onClick={() => chooseTemplate(t.key)}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-60 dark:border-neutral-700"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{t.label}</p>
                    <p className="text-xs text-neutral-400">{t.blockCount} starter blocks</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Slide add/rename modal */}
      <Modal open={Boolean(slideModal)} title={slideModal?.mode === 'add' ? 'Add Slide' : 'Rename Slide'} onClose={() => setSlideModal(null)}>
        <form onSubmit={submitSlide} className="space-y-3">
          <Input label="Slide title" name="title" value={slideModal?.title || ''} onChange={(e) => setSlideModal((s) => ({ ...s, title: e.target.value }))} autoFocus />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSlideModal(null)}>Cancel</Button>
            <Button type="submit" loading={busy}>{slideModal?.mode === 'add' ? 'Add slide' : 'Save changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Block add/edit modal */}
      <Modal open={Boolean(blockModal)} title={blockModal?.mode === 'add' ? 'Add Block' : 'Edit Block'} onClose={() => setBlockModal(null)} className="sm:max-w-xl">
        {blockModal ? (
          <form onSubmit={submitBlock} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Title" name="title" value={blockModal.title} onChange={(e) => setBlockModal((s) => ({ ...s, title: e.target.value }))} autoFocus />
              <Input label="Icon (Material Symbol name)" name="icon" value={blockModal.icon} onChange={(e) => setBlockModal((s) => ({ ...s, icon: e.target.value }))} placeholder="e.g. groups" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select label="Content type" name="type" options={TYPE_OPTIONS} value={blockModal.type} onChange={(e) => setBlockModal((s) => ({ ...s, type: e.target.value }))} />
              <Input label="Subtitle" name="subtitle" value={blockModal.subtitle} onChange={(e) => setBlockModal((s) => ({ ...s, subtitle: e.target.value }))} placeholder="optional" />
              <Input label="Badge number" name="badgeNumber" value={blockModal.badgeNumber} onChange={(e) => setBlockModal((s) => ({ ...s, badgeNumber: e.target.value }))} placeholder="e.g. 01" />
            </div>

            {blockModal.type === 'list' ? (
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                  <input type="checkbox" checked={blockModal.useGroups} onChange={(e) => setBlockModal((s) => ({ ...s, useGroups: e.target.checked }))} />
                  Group into sections (e.g. Organic / Paid / Direct)
                </label>
                {blockModal.useGroups ? (
                  <textarea
                    rows={7}
                    value={blockModal.groupsText}
                    onChange={(e) => setBlockModal((s) => ({ ...s, groupsText: e.target.value }))}
                    placeholder={'## Organic\n- Website, SEO\n- Blogs\n\n## Paid\n- Google Ads'}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                ) : (
                  <textarea
                    rows={6}
                    value={blockModal.itemsText}
                    onChange={(e) => setBlockModal((s) => ({ ...s, itemsText: e.target.value }))}
                    placeholder={'One item per line'}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">
                  {blockModal.type === 'badge' ? 'Badge text' : 'Text'}
                </label>
                <textarea
                  rows={blockModal.type === 'badge' ? 2 : 5}
                  value={blockModal.textValue}
                  onChange={(e) => setBlockModal((s) => ({ ...s, textValue: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Footer note" name="footer" value={blockModal.footer} onChange={(e) => setBlockModal((s) => ({ ...s, footer: e.target.value }))} placeholder="optional, shown as a pill at the bottom" />
              {blockModal.type === 'badge' ? (
                <Select label="Tone" name="tone" options={TONE_OPTIONS} value={blockModal.tone} onChange={(e) => setBlockModal((s) => ({ ...s, tone: e.target.value }))} />
              ) : null}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setBlockModal(null)}>Cancel</Button>
              <Button type="submit" loading={busy}>{blockModal.mode === 'add' ? 'Add block' : 'Save changes'}</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

const PlaybookBlockCard = ({ block, editable, onEdit, onDelete }) => {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
      {editable ? (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-white hover:text-neutral-700 dark:hover:bg-neutral-700" aria-label="Edit block">
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </button>
          <button type="button" onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20" aria-label="Delete block">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {block.badgeNumber ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{block.badgeNumber}</span>
        ) : block.icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[16px]">{block.icon}</span>
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-neutral-900 dark:text-white">{block.title}</h3>
          {block.subtitle ? <p className="text-xs text-neutral-400">{block.subtitle}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex-1">
        {block.type === 'badge' ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${TONE_STYLES[block.tone] || TONE_STYLES.neutral}`}>
            {block.text || '—'}
          </span>
        ) : block.type === 'text' ? (
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">{block.text || '—'}</p>
        ) : (block.groups || []).length > 0 ? (
          <div className="space-y-2.5">
            {block.groups.map((g, gi) => (
              <div key={`${g.heading}-${gi}`}>
                {g.heading ? <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{g.heading}</p> : null}
                <ul className="mt-1 space-y-1">
                  {(g.items || []).map((item, ii) => (
                    <li key={ii} className="flex items-start gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (block.items || []).length > 0 ? (
          <ul className="space-y-1.5">
            {block.items.map((item, ii) => (
              <li key={ii} className="flex items-start gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-400">No content yet.</p>
        )}
      </div>

      {block.footer ? (
        <div className="mt-3 rounded-lg bg-white px-2.5 py-1.5 text-center text-xs font-semibold text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          {block.footer}
        </div>
      ) : null}
    </div>
  );
};
