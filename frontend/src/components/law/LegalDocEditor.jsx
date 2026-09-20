import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import LinkExtension from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import FontFamily from '@tiptap/extension-font-family';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import Ribbon from './editor/Ribbon';
import {
  FindPanel, LinkDialog, ImageDialog, ShortcutsDialog, ContextMenu,
} from './editor/EditorPanels';
import {
  FontSize, BlockFormat, PageBreak, LegalTableCell, LegalTableHeader, LegalImage,
  SearchReplace, LegalShortcuts, ListStyle,
} from './editor/extensions';
import {
  MM_TO_PX, LANGUAGES, getPageGeometry, normalizeMeta, parseDocContent, serializeDoc,
} from './editor/docMeta';
import { contentCss, DEFAULT_FONT } from './editor/docStyles';
import {
  exportWord, importWord, printDocument,
} from './editor/exportImport';
import { selectClass, Icon } from './editor/EditorUi';

const CLAUSE_LIBRARY = [
  { key: 'confidentiality', category: 'Confidentiality', title: 'Confidentiality', html: '<h2>Confidentiality</h2><p>Each party shall keep confidential all non-public information received from the other party and shall use such information only for the purposes of this document.</p>' },
  { key: 'ip', category: 'Intellectual Property', title: 'Intellectual Property', html: '<h2>Intellectual Property</h2><p>All intellectual property rights in deliverables, work product, materials, and related documentation shall be owned or licensed as expressly stated in this document.</p>' },
  { key: 'termination', category: 'Termination', title: 'Termination', html: '<h2>Termination</h2><p>Either party may terminate this document in accordance with the agreed notice period, provided that accrued obligations shall survive termination.</p>' },
  { key: 'liability', category: 'Liability', title: 'Limitation of Liability', html: '<h2>Limitation of Liability</h2><p>Neither party shall be liable for indirect, incidental, or consequential damages arising out of or related to this document.</p>' },
  { key: 'indemnity', category: 'Indemnity', title: 'Indemnification', html: '<h2>Indemnification</h2><p>Each party shall indemnify and hold harmless the other party from claims, damages, and expenses arising from a breach of this document.</p>' },
  { key: 'dataprotection', category: 'Data Protection', title: 'Data Protection', html: '<h2>Data Protection</h2><p>Each party shall comply with applicable data protection laws in the processing of personal data under this document.</p>' },
  { key: 'forcemajeure', category: 'Force Majeure', title: 'Force Majeure', html: '<h2>Force Majeure</h2><p>Neither party shall be liable for delay or failure to perform obligations due to causes beyond its reasonable control.</p>' },
  { key: 'dispute', category: 'Dispute Resolution', title: 'Dispute Resolution', html: '<h2>Dispute Resolution</h2><p>Any dispute arising out of this document shall first be resolved through good-faith negotiation, failing which it shall be referred to arbitration.</p>' },
  { key: 'governinglaw', category: 'Governing Law', title: 'Governing Law', html: '<h2>Governing Law</h2><p>This document shall be governed by and construed in accordance with the laws of the applicable jurisdiction.</p>' },
  { key: 'warranty', category: 'Warranty', title: 'Warranty', html: '<h2>Warranty</h2><p>Each party warrants that it has full authority to enter into this document and to perform its obligations hereunder.</p>' },
  { key: 'signature', category: 'Miscellaneous', title: 'Signature Block', html: '<h2>Execution</h2><table><tbody><tr><td>For Company<br><br>Name:<br>Title:<br>Date:</td><td>For Counterparty<br><br>Name:<br>Title:<br>Date:</td></tr></tbody></table>' },
  { key: 'pageBreak', category: 'Miscellaneous', title: 'Page Break', html: '<div data-page-break="true"></div><p></p>' },
];

const SIGNATURE_HTML = CLAUSE_LIBRARY.find((c) => c.key === 'signature').html;
const LISTED_CLAUSES = CLAUSE_LIBRARY.filter((c) => c.key !== 'pageBreak' && c.key !== 'signature');

const plainTextContent = (text) => {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  if (lines.length === 1) return lines[0] ? { type: 'text', text: lines[0] } : null;
  return lines.map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' }));
};

const clampZoom = (z) => Math.max(50, Math.min(200, Math.round(z)));
const FIT_WIDTH_MAX = 125; // "fit width" never blows the paper up beyond this
const RIBBON_STORAGE_KEY = 'legalEditorRibbonOpen';

// Ribbon starts open on roomy screens and collapsed on short ones (it is a lot of chrome
// on a 768px-high laptop); whatever the user picks afterwards is remembered.
const initialRibbonOpen = () => {
  try {
    const saved = localStorage.getItem(RIBBON_STORAGE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch { /* storage unavailable */ }
  if (typeof window === 'undefined') return true;
  return window.innerHeight >= 800 && window.innerWidth >= 1280;
};

const LegalDocEditor = forwardRef(function LegalDocEditor(
  {
    initialContent = '',
    isReadOnly = false,
    onContentChange,
    onAutoSave,
    onSaveDraft,
    onDownloadPdf,
    onOpenClauseLibrary,
    onOpenHistory,
    onOpenComments,
    document: doc,
    saveStatus = 'idle',
    lastSavedAt,
    fullscreen = false,
    onToggleFullscreen,
  },
  ref
) {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const isFullscreen = Boolean(fullscreen);

  // Stored content = html body + an invisible settings comment (see editor/docMeta.js).
  const [initialParsed] = useState(() => parseDocContent(initialContent));
  const [meta, setMeta] = useState(initialParsed.meta);
  const metaRef = useRef(initialParsed.meta);

  const autoSaveTimer = useRef(null);
  const callbacks = useRef({});
  const editorRef = useRef(null);
  const scrollRef = useRef(null);
  const sheetRef = useRef(null);
  const headerInputRef = useRef(null);
  const footerInputRef = useRef(null);
  const importInputRef = useRef(null);
  const contentPxRef = useRef(1);
  const pageCountRef = useRef(1);

  const [tab, setTab] = useState(isReadOnly ? 'view' : 'home');
  const [ribbonOpen, setRibbonOpen] = useState(initialRibbonOpen);
  const [fitMode, setFitMode] = useState('width'); // 'width' | 'page' | null (manual zoom)
  // Start from a rough fit; the ResizeObserver below refines it once the canvas is measured.
  const [zoom, setZoom] = useState(() => {
    const geo = getPageGeometry(initialParsed.meta);
    const available = (typeof window !== 'undefined' ? window.innerWidth : 1200) - 48;
    const sheet = geo.width * MM_TO_PX;
    return available < sheet ? clampZoom((available / sheet) * 100) : 100;
  });
  const [viewMode, setViewMode] = useState('print');
  const [spell, setSpell] = useState(true);
  const [find, setFind] = useState({ open: false, replace: false, seed: 0, term: '' });
  const [dialog, setDialog] = useState(null); // 'link' | 'image' | 'shortcuts'
  const [painter, setPainter] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [now, setNow] = useState(0);
  const [lastEditAt, setLastEditAt] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    callbacks.current = { onContentChange, onAutoSave, onSaveDraft, onDownloadPdf, isReadOnly };
  });

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const exitFullscreen = (event) => {
      if (event.key !== 'Escape') return;
      onToggleFullscreen?.(false);
    };
    window.document.addEventListener('keydown', exitFullscreen);
    return () => window.document.removeEventListener('keydown', exitFullscreen);
  }, [isFullscreen, onToggleFullscreen]);

  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  // Push a change (text or page settings) to the parent and schedule the autosave.
  const emitChange = useCallback((ed) => {
    const html = serializeDoc(ed.getHTML(), metaRef.current);
    callbacks.current.onContentChange?.(html);
    setLastEditAt(Date.now());
    if (!callbacks.current.isReadOnly && callbacks.current.onAutoSave) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        const current = editorRef.current;
        if (!current || current.isDestroyed) return;
        callbacks.current.onAutoSave?.(serializeDoc(current.getHTML(), metaRef.current));
      }, 2000);
    }
  }, []);

  const editor = useEditor({
    editable: !isReadOnly,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      LegalTableCell,
      LegalTableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      LegalImage.configure({ allowBase64: true }),
      PageBreak,
      BlockFormat,
      ListStyle,
      SearchReplace,
      LegalShortcuts,
      Placeholder.configure({ placeholder: 'Start typing your legal document here…' }),
      CharacterCount,
    ],
    content: initialParsed.body || '',
    editorProps: {
      attributes: { 'aria-label': 'Document text', role: 'textbox', 'aria-multiline': 'true' },
      // Ctrl+click (Cmd+click) follows a link, like Word.
      handleClick: (view, pos, event) => {
        if (!(event.ctrlKey || event.metaKey)) return false;
        const anchor = event.target?.closest?.('a[href]');
        if (!anchor) return false;
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => emitChange(ed),
  }, []);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getContent: () => (editor ? serializeDoc(editor.getHTML(), metaRef.current) : ''),
    setContent: (html) => {
      const parsed = parseDocContent(html);
      metaRef.current = parsed.meta;
      setMeta(parsed.meta);
      editor?.commands.setContent(parsed.body || '', false);
    },
    focus: () => editor?.commands.focus(),
  }), [editor]);

  // Sync content when switching documents
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const parsed = parseDocContent(initialContent);
      if (editor.getHTML() !== parsed.body) editor.commands.setContent(parsed.body || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?._id]);

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [isReadOnly, editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    dom.setAttribute('spellcheck', spell ? 'true' : 'false');
    dom.setAttribute('lang', meta.lang);
  }, [editor, spell, meta.lang]);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  // ── Page settings ───────────────────────────────────────────────────────────
  const geo = useMemo(() => getPageGeometry(meta), [meta]);
  const contentPx = geo.contentHeight * MM_TO_PX;
  useEffect(() => {
    contentPxRef.current = contentPx;
  }, [contentPx]);

  const changeMeta = useCallback((patch) => {
    if (callbacks.current.isReadOnly) return;
    const next = normalizeMeta({ ...metaRef.current, ...patch });
    metaRef.current = next;
    setMeta(next);
    if (editorRef.current) emitChange(editorRef.current);
  }, [emitChange]);

  // ── Live page count / current page ──────────────────────────────────────────
  const measure = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;
    try {
      const dom = ed.view.dom;
      const per = contentPxRef.current || 1;
      const pages = Math.max(1, Math.ceil((dom.offsetHeight - 2) / per));
      pageCountRef.current = pages;
      setPageCount(pages);
      const rect = dom.getBoundingClientRect();
      const scale = dom.offsetHeight ? rect.height / dom.offsetHeight : 1;
      const caret = ed.view.coordsAtPos(ed.state.selection.head);
      const y = (caret.top - rect.top) / (scale || 1);
      setCurrentPage(Math.min(pages, Math.max(1, Math.floor(y / per) + 1)));
      if (sheetRef.current) setSheetHeight(sheetRef.current.offsetHeight);
    } catch {
      /* view not ready yet */
    }
  }, []);

  useEffect(() => {
    if (!editor) return undefined;
    editor.on('selectionUpdate', measure);
    editor.on('update', measure);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(editor.view.dom);
      if (sheetRef.current) observer.observe(sheetRef.current);
    }
    const t = window.setTimeout(measure, 0);
    return () => {
      editor.off('selectionUpdate', measure);
      editor.off('update', measure);
      observer?.disconnect();
      window.clearTimeout(t);
    };
  }, [editor, measure, contentPx]);

  // ── Fit width / fit page: follows the canvas size (pane resize, list splitter, ribbon toggle) ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !fitMode || typeof ResizeObserver === 'undefined') return undefined;
    const sheetW = geo.width * MM_TO_PX;
    const sheetH = geo.height * MM_TO_PX;
    const fit = () => {
      const cs = window.getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (w <= 0 || h <= 0) return;
      const pct = fitMode === 'page' ? Math.min(w / sheetW, h / sheetH) * 100 : Math.min((w / sheetW) * 100, FIT_WIDTH_MAX);
      setZoom(clampZoom(Math.floor(pct)));
    };
    const observer = new ResizeObserver(fit); // also fires once on observe()
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor, fitMode, geo.width, geo.height]);

  // Current page follows the scroll position (the caret still wins while typing).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const per = contentPxRef.current || 1;
        const top = geo.margins.top * MM_TO_PX;
        const wrapper = el.firstElementChild;
        const offset = wrapper ? wrapper.offsetTop : 0;
        const y = (el.scrollTop + el.clientHeight * 0.4 - offset) / (zoom / 100) - top;
        setCurrentPage(Math.min(pageCountRef.current, Math.max(1, Math.floor(y / per) + 1)));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [editor, zoom, geo.margins.top]);

  // ── Format painter ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!painter || !editor) return undefined;
    const dom = editor.view.dom;
    const apply = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      const tr = editor.state.tr.removeMark(from, to);
      painter.forEach((mark) => tr.addMark(from, to, mark));
      editor.view.dispatch(tr);
      setPainter(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPainter(null); };
    dom.addEventListener('mouseup', apply);
    window.document.addEventListener('keydown', onKey);
    return () => {
      dom.removeEventListener('mouseup', apply);
      window.document.removeEventListener('keydown', onKey);
    };
  }, [painter, editor]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const currentHtml = () => (editor ? serializeDoc(editor.getHTML(), metaRef.current) : '');

  const saveNow = useCallback(() => {
    if (callbacks.current.isReadOnly || !callbacks.current.onSaveDraft) return;
    clearTimeout(autoSaveTimer.current);
    const ed = editorRef.current;
    if (ed && !ed.isDestroyed) callbacks.current.onSaveDraft(serializeDoc(ed.getHTML(), metaRef.current));
  }, []);

  const openFind = (withReplace) => {
    const { from, to, empty } = editor.state.selection;
    const selected = empty ? '' : editor.state.doc.textBetween(from, to, ' ').trim();
    setFind((f) => ({ open: true, replace: Boolean(withReplace) && !isReadOnly, seed: f.seed + 1, term: selected && selected.length < 80 && !selected.includes('\n') ? selected : '' }));
  };

  const flushAndExportPdf = async () => {
    try {
      if (!isReadOnly && onAutoSave) {
        clearTimeout(autoSaveTimer.current);
        await onAutoSave(currentHtml());
      }
    } catch {
      /* the PDF path below still uses the last saved copy */
    }
    if (onDownloadPdf) onDownloadPdf();
    else printDocument({ title: doc?.title, bodyHtml: editor.getHTML(), meta });
  };

  const insertPlain = (text) => {
    const content = plainTextContent(text);
    if (content) editor.chain().focus().insertContent(content).run();
  };

  const pasteFromClipboard = async (plain) => {
    try {
      if (!plain && navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const html = await (await item.getType('text/html')).text();
            editor.chain().focus().insertContent(html).run();
            return;
          }
        }
      }
      insertPlain(await navigator.clipboard.readText());
    } catch {
      toast.info('Your browser did not allow pasting from this button. Press Ctrl+V to paste instead.', 'Paste');
    }
  };

  const runClipboardCommand = (command) => {
    editor.view.focus();
    window.document.execCommand(command);
  };

  const togglePainter = () => {
    if (painter) { setPainter(null); return; }
    const { from, empty, $from } = editor.state.selection;
    const marks = empty ? (editor.state.storedMarks || $from.marks()) : (editor.state.doc.nodeAt(from)?.marks || []);
    setPainter(Array.from(marks));
    toast.info('Now select the text you want to give the same look. Press Esc to cancel.', 'Format painter');
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes()
      .resetAttributes('paragraph', ['textAlign', 'lineHeight', 'spaceBefore', 'spaceAfter', 'indent'])
      .run();
  };

  const applyLegalList = (style) => {
    const chain = editor.chain().focus();
    if (!editor.isActive('orderedList')) chain.toggleOrderedList();
    chain.updateAttributes('orderedList', { legalStyle: style === 'decimal' ? null : style }).run();
  };

  const insertToc = () => {
    const items = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading' && node.textContent.trim()) items.push({ level: node.attrs.level, text: node.textContent.trim() });
      return true;
    });
    if (!items.length) {
      toast.info('Add some headings first (Home > Styles), then insert the table of contents.', 'No headings yet');
      return;
    }
    editor.chain().focus().insertContent([
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Table of Contents' }] },
      ...items.map((item) => ({ type: 'paragraph', attrs: { indent: Math.max(0, item.level - 2) }, content: [{ type: 'text', text: item.text }] })),
    ]).run();
  };

  const focusHeaderFooter = (which) => {
    setViewMode('print');
    window.requestAnimationFrame(() => {
      const input = which === 'header' ? headerInputRef.current : footerInputRef.current;
      input?.scrollIntoView({ block: 'center' });
      input?.focus();
    });
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    try {
      const { html, warnings } = await importWord(file);
      if (!editor.isEmpty) {
        const ok = await confirm({
          title: 'Replace this draft?',
          message: `Everything currently in this draft will be replaced by the text of "${file.name}". You can press Ctrl+Z straight afterwards to undo it.`,
          confirmLabel: 'Replace draft',
          cancelLabel: 'Keep my draft',
          tone: 'warning',
        });
        if (!ok) return;
      }
      editor.chain().focus().setContent(html, true).run();
      toast.success(warnings ? 'Imported. Some Word formatting could not be carried over, so please check the result.' : 'The Word file was imported.', 'Word file opened');
    } catch (err) {
      toast.error(err.message || 'The Word file could not be opened.');
    }
  };

  const actions = {
    save: !isReadOnly && onSaveDraft ? saveNow : null,
    exportPdf: flushAndExportPdf,
    exportWord: async () => {
      try {
        await exportWord({ title: doc?.title, bodyHtml: editor.getHTML(), meta });
      } catch (err) {
        toast.error(err.message || 'The Word file could not be created.');
      }
    },
    print: () => printDocument({ title: doc?.title, bodyHtml: editor.getHTML(), meta }),
    importWord: () => importInputRef.current?.click(),
    openFind,
    openLink: () => setDialog('link'),
    openImage: () => setDialog('image'),
    openShortcuts: () => setDialog('shortcuts'),
    insertSignature: () => editor.chain().focus().insertContent(SIGNATURE_HTML).run(),
    insertHtml: (html) => editor.chain().focus().insertContent(html).run(),
    insertToc,
    focusHeaderFooter,
    cut: () => runClipboardCommand('cut'),
    copy: () => runClipboardCommand('copy'),
    paste: () => pasteFromClipboard(false),
    pastePlain: () => pasteFromClipboard(true),
    togglePainter,
    painterActive: Boolean(painter),
    clearFormatting,
    applyLegalList,
  };

  // ── Zoom ────────────────────────────────────────────────────────────────────
  // Any manual zoom switches auto-fit off; the fit buttons switch it back on.
  const setZoomManual = useCallback((value) => {
    setFitMode(null);
    setZoom((z) => clampZoom(typeof value === 'function' ? value(z) : value));
  }, []);
  const fitWidth = () => setFitMode('width');
  const fitPage = () => setFitMode('page');
  const toggleRibbon = () => {
    setRibbonOpen((open) => {
      try { localStorage.setItem(RIBBON_STORAGE_KEY, open ? '0' : '1'); } catch { /* storage unavailable */ }
      return !open;
    });
  };

  // ── Keyboard: Ctrl+S / F / H / K (the rest live in the editor extensions) ───
  const onContainerKeyDown = (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      saveNow();
    } else if (key === 'f' && !e.shiftKey) {
      e.preventDefault();
      openFind(false);
    } else if (key === 'h' && !isReadOnly) {
      e.preventDefault();
      openFind(true);
    } else if (key === 'k' && !isReadOnly) {
      e.preventDefault();
      setDialog('link');
    }
  };

  // ── Right-click menu (tables, links, pictures; everything else keeps the browser menu with spelling suggestions) ──
  const onContextMenu = (e) => {
    if (isReadOnly || !editor || !e.target.closest?.('.ProseMirror')) return;
    const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (pos) {
      const { from, to } = editor.state.selection;
      if (pos.pos < from || pos.pos > to) editor.commands.setTextSelection(pos.pos);
    }
    if (!editor.isActive('table') && !editor.isActive('link') && !editor.isActive('image')) return;
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  const buildContextItems = () => {
    const c = () => editor.chain().focus();
    const items = [
      { icon: 'content_cut', label: 'Cut', run: actions.cut },
      { icon: 'content_copy', label: 'Copy', run: actions.copy },
      { icon: 'content_paste', label: 'Paste', run: actions.paste },
      { icon: 'content_paste_go', label: 'Paste as plain text', run: actions.pastePlain },
    ];
    if (editor.isActive('link')) {
      items.push({ divider: true });
      items.push({ icon: 'link', label: 'Edit link', run: () => setDialog('link') });
      items.push({ icon: 'link_off', label: 'Remove link', run: () => c().extendMarkRange('link').unsetLink().run() });
    }
    if (editor.isActive('table')) {
      items.push({ divider: true });
      items.push({ icon: 'keyboard_double_arrow_up', label: 'Insert row above', run: () => c().addRowBefore().run() });
      items.push({ icon: 'keyboard_double_arrow_down', label: 'Insert row below', run: () => c().addRowAfter().run() });
      items.push({ icon: 'keyboard_double_arrow_left', label: 'Insert column left', run: () => c().addColumnBefore().run() });
      items.push({ icon: 'keyboard_double_arrow_right', label: 'Insert column right', run: () => c().addColumnAfter().run() });
      items.push({ icon: 'cell_merge', label: 'Merge cells', run: () => c().mergeCells().run() });
      items.push({ icon: 'call_split', label: 'Split cell', run: () => c().splitCell().run() });
      items.push({ icon: 'table_rows', label: 'Delete row', run: () => c().deleteRow().run() });
      items.push({ icon: 'view_column', label: 'Delete column', run: () => c().deleteColumn().run() });
      items.push({ icon: 'delete', label: 'Delete table', run: () => c().deleteTable().run() });
    }
    if (editor.isActive('image')) {
      items.push({ divider: true });
      items.push({ icon: 'delete', label: 'Remove picture', run: () => c().deleteSelection().run() });
    }
    return items;
  };

  // ── Status / save indicator ─────────────────────────────────────────────────
  const words = editor?.storage.characterCount.words() || 0;
  const savedAgo = useMemo(() => {
    if (!lastSavedAt) return '';
    const secs = Math.max(0, Math.round((now - lastSavedAt) / 1000));
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.round(secs / 60)} min ago`;
  }, [lastSavedAt, now]);

  const hasUnsavedEdits = lastEditAt > (lastSavedAt || 0);
  let saveIndicator = { label: 'Changes save automatically', icon: 'cloud_sync', color: 'text-neutral-500 dark:text-neutral-400', hint: 'Your work is saved automatically a couple of seconds after you stop typing.', spin: false };
  if (saveStatus === 'saving') saveIndicator = { label: 'Saving…', icon: 'progress_activity', color: 'text-amber-600 dark:text-amber-400', hint: 'Saving your changes.', spin: true };
  else if (saveStatus === 'error') saveIndicator = { label: 'Could not save. Try Save draft', icon: 'error', color: 'text-rose-600 dark:text-rose-400', hint: 'The last save failed. Your text is still on screen; click Save draft to try again.', spin: false };
  else if (hasUnsavedEdits) saveIndicator = { label: 'Unsaved changes', icon: 'edit_note', color: 'text-amber-600 dark:text-amber-400', hint: 'You have changes that are not saved yet. They save automatically in a moment.', spin: false };
  else if (lastSavedAt) saveIndicator = { label: `Saved ${savedAgo}`, icon: 'cloud_done', color: 'text-emerald-600 dark:text-emerald-400', hint: 'All your changes are saved.', spin: false };

  if (!editor) return null;

  const zoomFactor = zoom / 100;
  const sheetWidthPx = geo.width * MM_TO_PX;
  const printView = viewMode === 'print';
  const headerFooterEditable = !isReadOnly;
  const inTable = editor.isActive('table');
  const inImage = editor.isActive('image');
  const marginBoxTop = Math.max(3, geo.margins.top / 2 - 3);
  const marginBoxBottom = Math.max(3, geo.margins.bottom / 2 - 3);

  const hfInputClass = 'w-full rounded border border-transparent bg-transparent px-1 text-center text-[9pt] text-neutral-500 outline-none placeholder:text-neutral-300 hover:border-neutral-300 hover:border-dashed focus:border-[var(--portal-accent)] focus:bg-white read-only:hover:border-transparent';

  return (
    <div
      onKeyDown={onContainerKeyDown}
      className={`legal-editor-root flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all dark:border-neutral-700 dark:bg-neutral-900 ${painter ? 'legal-painter' : ''} ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'min-h-0 flex-1'
      }`}
      style={isFullscreen ? { height: '100dvh' } : undefined}
    >
      {/* ── RIBBON ── */}
      <Ribbon
        editor={editor}
        isReadOnly={isReadOnly}
        tab={tab}
        onTab={setTab}
        open={ribbonOpen}
        onToggleOpen={toggleRibbon}
        inTable={inTable && !isReadOnly}
        inImage={inImage && !isReadOnly}
        actions={actions}
        view={{ viewMode, setViewMode, zoom, setZoom: setZoomManual, fitWidth, fitPage, isFullscreen, onToggleFullscreen, openShortcuts: () => setDialog('shortcuts') }}
        meta={meta}
        onMeta={changeMeta}
        pages={pageCount}
        spell={spell}
        onSpell={setSpell}
        clauses={LISTED_CLAUSES}
        onOpenClauseLibrary={onOpenClauseLibrary}
        onOpenComments={onOpenComments}
        onOpenHistory={onOpenHistory}
        saveIndicator={saveIndicator}
      />

      {/* ── READ-ONLY BANNER ── */}
      {isReadOnly && (
        <div className="no-print flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
          <span className="material-symbols-outlined text-base text-amber-500">lock</span>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Read-only — Document is {doc?.status === 'Approved' ? 'approved and locked' : 'locked'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isFullscreen && (
              <button type="button" title="Exit full screen (Esc)" aria-label="Exit full screen" onClick={() => onToggleFullscreen?.(false)} className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700">
                <span className="material-symbols-outlined text-sm">fullscreen_exit</span>
                Exit full screen
              </button>
            )}
            <button type="button" title="Download PDF" onClick={flushAndExportPdf} className="flex items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* ── PAGE AREA ── */}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="absolute inset-0 overflow-auto overscroll-contain bg-neutral-200 p-3 [scrollbar-gutter:stable] dark:bg-neutral-950 md:p-6" onContextMenu={onContextMenu}>
          <div style={{ width: sheetWidthPx * zoomFactor, height: sheetHeight ? sheetHeight * zoomFactor : undefined, margin: '0 auto' }}>
            <div
              id="legal-print-area"
              ref={sheetRef}
              className="legal-sheet"
              style={{
                background: 'white',
                width: `${geo.width}mm`,
                minHeight: printView ? `${geo.height}mm` : undefined,
                padding: `${geo.margins.top}mm ${geo.margins.right}mm ${geo.margins.bottom}mm ${geo.margins.left}mm`,
                boxSizing: 'border-box',
                boxShadow: '0 1px 6px rgba(15,23,42,0.25)',
                fontFamily: DEFAULT_FONT,
                fontSize: '12pt',
                lineHeight: '1.8',
                color: '#1a1a1a',
                position: 'relative',
                transform: `scale(${zoomFactor})`,
                transformOrigin: 'top left',
              }}
            >
              {printView && (
                <>
                  <div className="no-print" style={{ position: 'absolute', top: `${marginBoxTop}mm`, left: `${geo.margins.left}mm`, right: `${geo.margins.right}mm` }}>
                    <input
                      ref={headerInputRef}
                      value={meta.header}
                      readOnly={!headerFooterEditable}
                      onChange={(e) => changeMeta({ header: e.target.value })}
                      maxLength={200}
                      placeholder={headerFooterEditable ? 'Click to add a header' : ''}
                      aria-label="Page header (shown on every page in the PDF and print)"
                      title="Header: shown at the top of every page in the PDF and print"
                      className={hfInputClass}
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    />
                  </div>
                  {Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (
                    <div
                      key={i}
                      aria-hidden="true"
                      className="no-print"
                      style={{ position: 'absolute', left: 0, right: 0, top: `${geo.margins.top + (i + 1) * geo.contentHeight}mm`, borderTop: '1px dashed #b8bcc4', pointerEvents: 'none', zIndex: 2 }}
                    >
                      <span style={{ position: 'absolute', right: 8, top: 2, fontSize: 10, color: '#9aa0aa', fontFamily: 'Arial, sans-serif', lineHeight: 1.2 }}>{`Page ${i + 2} starts here (approx.)`}</span>
                    </div>
                  ))}
                </>
              )}

              <EditorContent editor={editor} className="legal-editor-body" />

              {printView && (
                <div className="no-print" style={{ position: 'absolute', bottom: `${marginBoxBottom}mm`, left: `${geo.margins.left}mm`, right: `${geo.margins.right}mm`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={footerInputRef}
                    value={meta.footer}
                    readOnly={!headerFooterEditable}
                    onChange={(e) => changeMeta({ footer: e.target.value })}
                    maxLength={200}
                    placeholder={headerFooterEditable ? 'Click to add a footer' : ''}
                    aria-label="Page footer (shown on every page in the PDF and print)"
                    title="Footer: shown at the bottom of every page in the PDF and print"
                    className={hfInputClass}
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  />
                  {meta.pageNumbers && <span style={{ fontSize: '9pt', color: '#666', whiteSpace: 'nowrap', fontFamily: 'Arial, sans-serif' }}>{`Page ${currentPage} of ${pageCount}`}</span>}
                </div>
              )}

              {doc?.status === 'Draft' && (
                <div aria-hidden="true" style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: '64pt', fontWeight: 900, color: 'rgba(0,0,0,0.04)', pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>DRAFT</div>
              )}
              {doc?.status === 'Approved' && (
                <div aria-hidden="true" style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: '64pt', fontWeight: 900, color: 'rgba(0, 128, 0, 0.05)', pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>APPROVED</div>
              )}
            </div>
          </div>
        </div>

        {find.open && (
          <FindPanel key={find.seed} editor={editor} withReplace={find.replace} canReplace={!isReadOnly} initialTerm={find.term} onClose={() => { setFind((f) => ({ ...f, open: false })); editor.commands.focus(); }} />
        )}
      </div>

      {/* ── STATUS BAR ── */}
      <div className="no-print flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        <span title="Page where the cursor is, and total pages (approximate)">Page {currentPage} of {pageCount}</span>
        <span>{words.toLocaleString()} {words === 1 ? 'word' : 'words'}</span>
        <select
          aria-label="Language"
          title="Language used for spelling"
          value={meta.lang}
          disabled={isReadOnly}
          onChange={(e) => changeMeta({ lang: e.target.value })}
          className={`${selectClass} h-7 max-w-[10rem] border-transparent bg-transparent py-0 text-xs`}
        >
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <span className="hidden sm:inline">Version {doc?.currentVersion || 'v1.0'}</span>
        {lastSavedAt && !isReadOnly && <span className="hidden md:inline">Autosaved {savedAgo}</span>}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setZoomManual((z) => z - 10)} title="Zoom out" aria-label="Zoom out" className="flex h-7 w-7 items-center justify-center rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"><Icon name="remove" size={16} /></button>
          <input type="range" min={50} max={200} step={5} value={zoom} onChange={(e) => setZoomManual(Number(e.target.value))} aria-label="Zoom" className="w-24 accent-[var(--portal-accent)] sm:w-36" />
          <button type="button" onClick={() => setZoomManual((z) => z + 10)} title="Zoom in" aria-label="Zoom in" className="flex h-7 w-7 items-center justify-center rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"><Icon name="add" size={16} /></button>
          <span className="ml-1 min-w-[3rem] text-center font-semibold" aria-live="polite">{zoom}%</span>
          <button type="button" onClick={fitWidth} title="Fit width: the page fills the window width" aria-label="Fit width" aria-pressed={fitMode === 'width'} className={`flex h-7 items-center gap-1 rounded px-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${fitMode === 'width' ? 'text-[var(--portal-accent)]' : ''}`}><Icon name="fit_screen" size={16} /><span className="hidden lg:inline">Fit width</span></button>
          <button type="button" onClick={fitPage} title="Fit page: one whole page is visible" aria-label="Fit page" aria-pressed={fitMode === 'page'} className={`flex h-7 items-center gap-1 rounded px-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${fitMode === 'page' ? 'text-[var(--portal-accent)]' : ''}`}><Icon name="fit_page" size={16} /><span className="hidden lg:inline">Fit page</span></button>
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; handleImportFile(file); }}
      />

      {/* ── DIALOGS ── */}
      {dialog === 'link' && <LinkDialog editor={editor} onClose={() => setDialog(null)} />}
      {dialog === 'image' && (
        <ImageDialog
          onClose={() => setDialog(null)}
          onInsert={({ src, alt, width }) => {
            editor.chain().focus().insertContent({ type: 'image', attrs: { src, alt, width } }).run();
            setDialog(null);
          }}
        />
      )}
      {dialog === 'shortcuts' && <ShortcutsDialog onClose={() => setDialog(null)} />}
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={buildContextItems()} onClose={() => setCtx(null)} />}

      {/* ── Editor styles ── */}
      <style>{`
        ${contentCss('.legal-editor-body .ProseMirror')}
        .legal-editor-body .ProseMirror { outline: none; min-height: ${geo.contentHeight}mm; caret-color: #c01; position: relative; z-index: 1; }
        .legal-editor-body p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #aaa; float: left; height: 0; pointer-events: none; }
        .legal-editor-body [data-page-break] { border-top: 1px dashed #bbb; height: 1px; margin: 18px 0; }
        .legal-editor-body [data-page-break]::after { content: 'Page break'; display: block; text-align: center; font: 10px Arial, sans-serif; color: #999; margin-top: 3px; }
        .legal-editor-body .search-match { background: #fde68a; border-radius: 2px; }
        .legal-editor-body .search-match-current { background: #fb923c; }
        .legal-editor-body .selectedCell::after { content: ''; position: absolute; inset: 0; background: rgba(59,130,246,0.22); pointer-events: none; }
        .legal-editor-body .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: -2px; width: 4px; background: #60a5fa; pointer-events: none; }
        .legal-editor-body .tableWrapper { overflow-x: auto; }
        .legal-editor-body.resize-cursor, .legal-editor-body .resize-cursor { cursor: col-resize; }
        .legal-editor-body img.ProseMirror-selectednode { outline: 2px solid var(--portal-accent, #2563eb); }
        .legal-editor-body .ProseMirror-selectednode[data-page-break] { outline: 2px solid var(--portal-accent, #2563eb); }
        .legal-painter .ProseMirror { cursor: copy; }
      `}</style>
    </div>
  );
});

LegalDocEditor.CLAUSE_LIBRARY = CLAUSE_LIBRARY;

export default LegalDocEditor;
