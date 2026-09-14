import React, {
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
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import FontFamily from '@tiptap/extension-font-family';

// ── Print / PDF CSS ───────────────────────────────────────────────────────────
const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #legal-print-area, #legal-print-area * { visibility: visible; }
    #legal-print-area {
      position: absolute; left: 0; top: 0;
      width: 210mm; min-height: 297mm;
      background: #fff; color: #000;
      padding: 20mm 25mm;
      font-family: 'Times New Roman', serif;
      font-size: 12pt; line-height: 1.6;
    }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }
`;

const FONT_FAMILIES = [
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
];

const FONT_SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt'];

const ZOOM_LEVELS = [75, 100, 125, 150];

const LEGAL_LIST_STYLES = [
  { key: 'decimal', label: '1. 2. 3.' },
  { key: 'lower-alpha', label: '(a) (b) (c)' },
  { key: 'lower-roman', label: '(i) (ii) (iii)' },
];

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
  { key: 'pageBreak', category: 'Miscellaneous', title: 'Page Break', html: '<div data-page-break="true" style="page-break-after:always;border-top:1px dashed #bbb;margin:18px 0;height:1px"></div><p></p>' },
];

// ── Save status badge ─────────────────────────────────────────────────────────
const saveStatusLabel = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Save failed' };
const saveStatusColor = {
  idle: '', saving: 'text-amber-500', saved: 'text-emerald-500', error: 'text-red-500',
};

const ToolbarBtn = ({ title, active, onClick, disabled, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
    className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-all disabled:cursor-not-allowed disabled:opacity-30 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
      active ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]' : 'text-neutral-600 dark:text-neutral-400'
    }`}
  >
    {children}
  </button>
);

const Sep = () => <div className="mx-1 h-6 w-px bg-neutral-300 dark:bg-neutral-600" />;

const LegalDocEditor = forwardRef(function LegalDocEditor(
  {
    initialContent = '',
    isReadOnly = false,
    onContentChange,
    onSaveDraft,
    onAutoSave,
    onSubmit,
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
  const autoSaveTimer = useRef(null);
  const isFullscreen = Boolean(fullscreen);
  const [zoom, setZoom] = useState(100);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showClauseMenu, setShowClauseMenu] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showFind, setShowFind] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const exitFullscreen = (event) => {
      if (event.key !== 'Escape') return;
      onToggleFullscreen?.(false);
    };
    document.addEventListener('keydown', exitFullscreen);
    return () => document.removeEventListener('keydown', exitFullscreen);
  }, [isFullscreen, onToggleFullscreen]);

  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  const editor = useEditor({
    editable: !isReadOnly,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Start typing your legal document here…' }),
      CharacterCount,
    ],
    content: initialContent || '',
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onContentChange?.(html);
      if (!isReadOnly && onAutoSave) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => onAutoSave(html), 2000);
      }
    },
  }, []);

  useImperativeHandle(ref, () => ({
    getContent: () => editor?.getHTML() || '',
    setContent: (html) => editor?.commands.setContent(html || '', false),
    focus: () => editor?.commands.focus(),
  }), [editor]);

  // Sync content when switching documents
  useEffect(() => {
    if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?._id]);

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [isReadOnly, editor]);

  useEffect(() => {
    let style = window.document.getElementById('legal-print-css');
    if (!style) {
      style = window.document.createElement('style');
      style.id = 'legal-print-css';
      style.textContent = PRINT_STYLE;
      window.document.head.appendChild(style);
    }
  }, []);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  const insertClause = (html) => {
    editor?.chain().focus().insertContent(html).run();
    setShowClauseMenu(false);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const insertTable = () => {
    const r = Math.max(1, Math.min(tableRows, 20));
    const c = Math.max(1, Math.min(tableCols, 10));
    editor?.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: false }).run();
    setShowTableDialog(false);
  };

  const applyLegalList = (style) => {
    editor?.chain().focus().toggleOrderedList().run();
    // mark the list node with a data-style so CSS can render (a) (i) numbering
    const { state } = editor.view;
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'orderedList') {
        const pos = $from.before(d);
        editor.view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, 'data-legal-style': style }));
        break;
      }
    }
  };

  const runFind = () => {
    if (!editor || !findTerm) return;
    const { state } = editor;
    const text = state.doc.textBetween(0, state.doc.content.size, ' ');
    if (!text.toLowerCase().includes(findTerm.toLowerCase())) return;
  };

  const handlePrint = () => {
    if (onDownloadPdf) { onDownloadPdf(); return; }
    window.print();
  };

  const handleSaveDraft = () => onSaveDraft?.(editor?.getHTML() || '');
  const handleSubmit = () => onSubmit?.(editor?.getHTML() || '');

  const toggleFS = () => {
    onToggleFullscreen?.(!isFullscreen);
  };

  const wordCount = editor?.storage.characterCount.words() || 0;
  const charCount = editor?.storage.characterCount.characters() || 0;
  const estimatedPages = Math.max(1, Math.ceil(charCount / 3200));

  const savedAgo = useMemo(() => {
    if (!lastSavedAt) return '';
    const secs = Math.max(0, Math.round((now - lastSavedAt) / 1000));
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.round(secs / 60);
    return `${mins}m ago`;
  }, [lastSavedAt, now]);

  if (!editor) return null;

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all dark:border-neutral-700 dark:bg-neutral-900 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      style={{ height: isFullscreen ? '100dvh' : 'calc(100dvh - 220px)', minHeight: isFullscreen ? undefined : 480 }}
    >
      {/* ── TOOLBAR ── */}
      {!isReadOnly && (
        <div className="no-print sticky top-0 z-10 flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 md:flex-wrap dark:border-neutral-700 dark:bg-neutral-800" role="toolbar" aria-label="Legal document formatting toolbar">
          {/* Undo/redo */}
          <ToolbarBtn title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </ToolbarBtn>
          <ToolbarBtn title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </ToolbarBtn>
          <Sep />

          {/* Font family / size */}
          <select
            title="Font family"
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="mr-1 h-8 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-700 outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
            defaultValue={FONT_FAMILIES[0].value}
          >
            {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select
            title="Font size"
            onChange={(e) => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}
            className="mr-1 h-8 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-700 outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
            defaultValue="12pt"
          >
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Sep />

          {/* Paragraph style */}
          <select
            title="Paragraph style"
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'p') editor.chain().focus().setParagraph().run();
              else if (v.startsWith('h')) editor.chain().focus().toggleHeading({ level: Number(v[1]) }).run();
              else if (v === 'clause') editor.chain().focus().toggleHeading({ level: 3 }).run();
            }}
            className="mr-1 h-8 rounded border border-neutral-300 bg-white px-2 text-xs text-neutral-700 outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
            defaultValue="p"
          >
            <option value="p">Normal</option>
            <option value="h1">Title</option>
            <option value="h2">Heading 1</option>
            <option value="h3">Heading 2</option>
            <option value="h4">Heading 3</option>
            <option value="clause">Clause Heading</option>
          </select>
          <Sep />

          {/* Text formatting */}
          <ToolbarBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <span className="material-symbols-outlined text-[18px]">format_bold</span>
          </ToolbarBtn>
          <ToolbarBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <span className="material-symbols-outlined text-[18px]">format_italic</span>
          </ToolbarBtn>
          <ToolbarBtn title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <span className="material-symbols-outlined text-[18px]">format_underlined</span>
          </ToolbarBtn>
          <ToolbarBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
          </ToolbarBtn>
          <ToolbarBtn title="Superscript" active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <span className="material-symbols-outlined text-[18px]">superscript</span>
          </ToolbarBtn>
          <ToolbarBtn title="Subscript" active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <span className="material-symbols-outlined text-[18px]">subscript</span>
          </ToolbarBtn>
          <ToolbarBtn title="Clear Formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
            <span className="material-symbols-outlined text-[18px]">format_clear</span>
          </ToolbarBtn>
          <Sep />

          {/* Colors */}
          <label title="Text color" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700">
            <span className="material-symbols-outlined text-[18px]">format_color_text</span>
            <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
          </label>
          <label title="Highlight color" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700">
            <span className="material-symbols-outlined text-[18px]">ink_highlighter</span>
            <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
          </label>
          <Sep />

          {/* Alignment */}
          {['left', 'center', 'right', 'justify'].map((a) => (
            <ToolbarBtn key={a} title={`Align ${a}`} active={editor.isActive({ textAlign: a })} onClick={() => editor.chain().focus().setTextAlign(a).run()}>
              <span className="material-symbols-outlined text-[18px]">{`format_align_${a}`}</span>
            </ToolbarBtn>
          ))}
          <Sep />

          {/* Lists */}
          <ToolbarBtn title="Bulleted List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
          </ToolbarBtn>
          <ToolbarBtn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
          </ToolbarBtn>
          <select
            title="Legal numbering style"
            onChange={(e) => { if (e.target.value) applyLegalList(e.target.value); e.target.value = ''; }}
            className="h-8 rounded border border-neutral-300 bg-white px-1 text-xs text-neutral-700 outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
            defaultValue=""
          >
            <option value="" disabled>Legal #</option>
            {LEGAL_LIST_STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <ToolbarBtn title="Increase Indent" onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
            <span className="material-symbols-outlined text-[18px]">format_indent_increase</span>
          </ToolbarBtn>
          <ToolbarBtn title="Decrease Indent" onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
            <span className="material-symbols-outlined text-[18px]">format_indent_decrease</span>
          </ToolbarBtn>
          <Sep />

          {/* Insert menu */}
          <ToolbarBtn title="Insert Link" onClick={() => setShowLinkDialog(true)}>
            <span className="material-symbols-outlined text-[18px]">link</span>
          </ToolbarBtn>
          <ToolbarBtn title="Insert Table" onClick={() => setShowTableDialog(true)}>
            <span className="material-symbols-outlined text-[18px]">table</span>
          </ToolbarBtn>
          <ToolbarBtn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <span className="material-symbols-outlined text-[18px]">horizontal_rule</span>
          </ToolbarBtn>
          <ToolbarBtn title="Page Break" onClick={() => insertClause(CLAUSE_LIBRARY.find((c) => c.key === 'pageBreak').html)}>
            <span className="material-symbols-outlined text-[18px]">insert_page_break</span>
          </ToolbarBtn>
          <ToolbarBtn title="Insert Date" onClick={() => editor.chain().focus().insertContent(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })).run()}>
            <span className="material-symbols-outlined text-[18px]">event</span>
          </ToolbarBtn>
          <ToolbarBtn title="Signature Block" onClick={() => insertClause(CLAUSE_LIBRARY.find((c) => c.key === 'signature').html)}>
            <span className="material-symbols-outlined text-[18px]">draw</span>
          </ToolbarBtn>
          <div className="relative">
            <ToolbarBtn title="Insert Clause" onClick={() => setShowClauseMenu((s) => !s)}>
              <span className="material-symbols-outlined text-[18px]">library_add</span>
            </ToolbarBtn>
            {showClauseMenu && (
              <div className="absolute left-0 top-9 z-20 max-h-72 w-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {onOpenClauseLibrary ? (
                  <button
                    type="button"
                    onClick={() => { setShowClauseMenu(false); onOpenClauseLibrary((html) => insertClause(html)); }}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)]"
                  >
                    <span className="material-symbols-outlined text-[16px]">search</span>
                    Browse full clause library
                  </button>
                ) : null}
                {CLAUSE_LIBRARY.filter((c) => c.key !== 'pageBreak' && c.key !== 'signature').map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => insertClause(c.html)}
                    className="flex w-full flex-col items-start rounded-lg px-2 py-1.5 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">{c.title}</span>
                    <span className="text-[10px] text-neutral-400">{c.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Sep />

          {/* Tools */}
          <ToolbarBtn title="Find & Replace" onClick={() => setShowFind((s) => !s)}>
            <span className="material-symbols-outlined text-[18px]">manage_search</span>
          </ToolbarBtn>
          {onOpenComments && (
            <ToolbarBtn title="Comments" onClick={onOpenComments}>
              <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
            </ToolbarBtn>
          )}
          {onOpenHistory && (
            <ToolbarBtn title="History" onClick={onOpenHistory}>
              <span className="material-symbols-outlined text-[18px]">history</span>
            </ToolbarBtn>
          )}
          <ToolbarBtn title="Download PDF / Print" onClick={handlePrint}>
            <span className="material-symbols-outlined text-[18px]">print</span>
          </ToolbarBtn>
          <ToolbarBtn title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'} onClick={toggleFS}>
            <span className="material-symbols-outlined text-[18px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
          </ToolbarBtn>

          {/* Zoom */}
          <div className="ml-1 flex items-center gap-1 rounded border border-neutral-300 bg-white px-1 dark:border-neutral-600 dark:bg-neutral-900">
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setZoom((z) => Math.max(50, z - 25))} className="flex h-7 w-6 items-center justify-center text-neutral-500 hover:text-neutral-800">
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-7 bg-transparent text-xs text-neutral-700 outline-none dark:text-neutral-200">
              {ZOOM_LEVELS.map((z) => <option key={z} value={z}>{z}%</option>)}
            </select>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setZoom((z) => Math.min(150, z + 25))} className="flex h-7 w-6 items-center justify-center text-neutral-500 hover:text-neutral-800">
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>

          {/* Auto-save status */}
          <div className="ml-auto flex items-center gap-2 pr-1">
            {saveStatus !== 'idle' && (
              <span className={`text-xs font-medium ${saveStatusColor[saveStatus]}`}>{saveStatusLabel[saveStatus]}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Find bar ── */}
      {showFind && !isReadOnly && (
        <div className="no-print flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
          <span className="material-symbols-outlined text-[16px] text-neutral-400">search</span>
          <input
            autoFocus
            value={findTerm}
            onChange={(e) => setFindTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runFind()}
            placeholder="Find in document…"
            className="h-7 w-56 rounded border border-neutral-300 bg-white px-2 text-xs outline-none dark:border-neutral-600 dark:bg-neutral-900"
          />
          <button type="button" onClick={() => setShowFind(false)} className="ml-auto text-neutral-400 hover:text-neutral-700">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* ── READ-ONLY BANNER ── */}
      {isReadOnly && (
        <div className="no-print flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2">
          <span className="material-symbols-outlined text-amber-500 text-base">lock</span>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Read-only — Document is {doc?.status === 'Approved' ? 'approved and locked' : 'locked'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isFullscreen && <button type="button" title="Exit fullscreen (Esc)" aria-label="Exit fullscreen" onClick={toggleFS} className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700">
              <span className="material-symbols-outlined text-sm">fullscreen_exit</span>
              Exit Fullscreen
            </button>}
            <button type="button" title="Download PDF" onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* ── A4 EDITOR AREA ── */}
      <div className="flex-1 overflow-auto bg-neutral-100 p-4 dark:bg-neutral-950 md:p-6">
        <div
          id="legal-print-area"
          style={{
            background: 'white',
            width: '794px',
            minHeight: '297mm',
            maxWidth: '100%',
            margin: '0 auto',
            padding: 'clamp(32px, 7vw, 76px)',
            boxShadow: '0 8px 28px rgba(15,23,42,0.12)',
            fontFamily: "'Times New Roman', 'Georgia', serif",
            fontSize: '12pt',
            lineHeight: '1.8',
            color: '#1a1a1a',
            position: 'relative',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <div className="print-header" style={{ marginBottom: '8mm', borderBottom: '2px solid #333', paddingBottom: '4mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18pt', fontWeight: 700, color: '#1a1a1a' }}>{doc?.title || 'Legal Document'}</div>
                <div style={{ fontSize: '9pt', color: '#666', marginTop: '2mm' }}>
                  {doc?.documentNumber ? `${doc.documentNumber} • ` : ''}{doc?.type} • Version {doc?.currentVersion} • {doc?.projectName || ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '8pt', color: '#888' }}>
                <div>Status: {doc?.status || 'Draft'}</div>
                <div>Created by: {doc?.createdByName || '—'}</div>
                {doc?.approvedAt && <div>Approved: {new Date(doc.approvedAt).toLocaleDateString()}</div>}
              </div>
            </div>
          </div>

          <EditorContent editor={editor} className="legal-editor-body" />

          {doc?.status === 'Draft' && (
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: '64pt', fontWeight: 900, color: 'rgba(0,0,0,0.04)', pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>DRAFT</div>
          )}
          {doc?.status === 'Approved' && (
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-35deg)', fontSize: '64pt', fontWeight: 900, color: 'rgba(0, 128, 0, 0.05)', pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>APPROVED</div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STATUSBAR ── */}
      <div className="no-print sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Page 1 of {estimatedPages}</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>{charCount.toLocaleString()} chars</span>
          <span>Version {doc?.currentVersion || 'v1.0'}</span>
          <span>Zoom {zoom}%</span>
          {lastSavedAt && !isReadOnly && <span>Autosaved {savedAgo}</span>}
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSaveDraft} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
              <span className="material-symbols-outlined text-sm">save</span>
              Save Draft
            </button>
            {onSubmit && (
              <button type="button" onClick={handleSubmit} className="flex items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110">
                <span className="material-symbols-outlined text-sm">send</span>
                {doc?.status === 'Rejected' ? 'Submit Again' : 'Submit for Approval'}
              </button>
            )}
          </div>
        )}
        {isReadOnly && (
          <button type="button" onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            PDF
          </button>
        )}
      </div>

      {/* ── LINK DIALOG ── */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 no-print">
          <div className="w-80 rounded-xl bg-white dark:bg-neutral-800 p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Insert Hyperlink</h3>
            <input autoFocus type="url" placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              className="mb-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[var(--portal-accent)] dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowLinkDialog(false)} className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400">Cancel</button>
              <button onClick={insertLink} className="rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-sm font-semibold text-white">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE DIALOG ── */}
      {showTableDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 no-print">
          <div className="w-64 rounded-xl bg-white dark:bg-neutral-800 p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Insert Table</h3>
            <div className="mb-2 flex items-center gap-2">
              <label className="text-xs text-neutral-500 w-16">Rows:</label>
              <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(+e.target.value)} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100" />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <label className="text-xs text-neutral-500 w-16">Columns:</label>
              <input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(+e.target.value)} className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTableDialog(false)} className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400">Cancel</button>
              <button onClick={insertTable} className="rounded-lg bg-[var(--portal-accent)] px-3 py-1.5 text-sm font-semibold text-white">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor styles ── */}
      <style>{`
        .legal-editor-body .ProseMirror { outline: none; min-height: 200mm; font-family: 'Times New Roman', 'Georgia', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; caret-color: #c01; }
        .legal-editor-body p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #aaa; float: left; height: 0; pointer-events: none; }
        .legal-editor-body h1 { font-size: 20pt; font-weight: 700; margin: 8mm 0 4mm; }
        .legal-editor-body h2 { font-size: 16pt; font-weight: 700; margin: 6mm 0 3mm; }
        .legal-editor-body h3 { font-size: 13pt; font-weight: 700; margin: 4mm 0 2mm; }
        .legal-editor-body h4 { font-size: 12pt; font-weight: 700; font-style: italic; margin: 3mm 0 2mm; }
        .legal-editor-body p  { margin: 0 0 4mm; text-align: justify; }
        .legal-editor-body ul { margin: 2mm 0 4mm; padding-left: 6mm; list-style: disc; }
        .legal-editor-body ol { margin: 2mm 0 4mm; padding-left: 6mm; list-style: decimal; }
        .legal-editor-body ol[data-legal-style="lower-alpha"] { list-style: lower-alpha; }
        .legal-editor-body ol[data-legal-style="lower-roman"] { list-style: lower-roman; }
        .legal-editor-body li { margin: 1mm 0; }
        .legal-editor-body table { width: 100%; border-collapse: collapse; margin: 4mm 0; }
        .legal-editor-body td, .legal-editor-body th { border: 1px solid #aaa; padding: 2mm 3mm; }
        .legal-editor-body a { color: #1a56db; text-decoration: underline; }
        .legal-editor-body mark { border-radius: 2px; padding: 0 1px; }
      `}</style>
    </div>
  );
});

LegalDocEditor.CLAUSE_LIBRARY = CLAUSE_LIBRARY;

export default LegalDocEditor;
