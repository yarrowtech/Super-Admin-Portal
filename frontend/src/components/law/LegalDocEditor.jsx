import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

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

// ── Toolbar button definitions ────────────────────────────────────────────────
const TOOL_GROUPS = [
  [
    { cmd: 'bold',          icon: 'format_bold',         title: 'Bold (Ctrl+B)' },
    { cmd: 'italic',        icon: 'format_italic',       title: 'Italic (Ctrl+I)' },
    { cmd: 'underline',     icon: 'format_underlined',   title: 'Underline (Ctrl+U)' },
    { cmd: 'strikeThrough', icon: 'format_strikethrough',title: 'Strikethrough' },
  ],
  [
    { cmd: 'formatBlock', value: 'h1', icon: 'looks_one',   title: 'Heading 1' },
    { cmd: 'formatBlock', value: 'h2', icon: 'looks_two',   title: 'Heading 2' },
    { cmd: 'formatBlock', value: 'h3', icon: 'looks_3',     title: 'Heading 3' },
    { cmd: 'formatBlock', value: 'p',  icon: 'segment',     title: 'Paragraph' },
  ],
  [
    { cmd: 'insertUnorderedList', icon: 'format_list_bulleted', title: 'Bullet List' },
    { cmd: 'insertOrderedList',   icon: 'format_list_numbered', title: 'Numbered List' },
    { cmd: 'indent',              icon: 'format_indent_increase',title: 'Indent' },
    { cmd: 'outdent',             icon: 'format_indent_decrease',title: 'Outdent' },
  ],
  [
    { cmd: 'justifyLeft',   icon: 'format_align_left',    title: 'Align Left' },
    { cmd: 'justifyCenter', icon: 'format_align_center',  title: 'Align Center' },
    { cmd: 'justifyRight',  icon: 'format_align_right',   title: 'Align Right' },
    { cmd: 'justifyFull',   icon: 'format_align_justify', title: 'Justify' },
  ],
  [
    { cmd: 'undo', icon: 'undo', title: 'Undo (Ctrl+Z)' },
    { cmd: 'redo', icon: 'redo', title: 'Redo (Ctrl+Y)' },
  ],
];

// ── Status badge helper ───────────────────────────────────────────────────────
const saveStatusLabel = {
  idle:    '',
  saving:  'Saving…',
  saved:   'Saved ✓',
  error:   'Save failed',
};
const saveStatusColor = {
  idle:   '',
  saving: 'text-amber-500',
  saved:  'text-emerald-500',
  error:  'text-red-500',
};

// ─────────────────────────────────────────────────────────────────────────────
//  LegalDocEditor
// ─────────────────────────────────────────────────────────────────────────────
const LegalDocEditor = forwardRef(function LegalDocEditor(
  {
    initialContent = '',
    isReadOnly = false,
    onContentChange,
    onSaveDraft,
    onAutoSave,
    onSubmit,
    document: doc,
    saveStatus = 'idle',
    fullscreen = false,
    onToggleFullscreen,
  },
  ref
) {
  const editorRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.innerHTML || '',
    setContent: (html) => {
      if (editorRef.current) editorRef.current.innerHTML = html;
    },
    focus: () => editorRef.current?.focus(),
  }));

  // Inject print CSS once
  useEffect(() => {
    let style = document.getElementById('legal-print-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'legal-print-css';
      style.textContent = PRINT_STYLE;
      document.head.appendChild(style);
    }
    return () => {};
  }, []);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && initialContent !== undefined) {
      editorRef.current.innerHTML = initialContent;
      updateCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const updateCounts = useCallback(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setCharCount(text.length);
  }, []);

  const handleInput = useCallback(() => {
    updateCounts();
    const html = editorRef.current?.innerHTML || '';
    onContentChange?.(html);

    // Auto-save debounce – 7 seconds
    if (!isReadOnly && onAutoSave) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        onAutoSave(html);
      }, 7000);
    }
  }, [isReadOnly, onAutoSave, onContentChange, updateCounts]);

  useEffect(() => {
    return () => clearTimeout(autoSaveTimer.current);
  }, []);

  // Execute a document command
  const execCmd = useCallback((cmd, value = null) => {
    if (isReadOnly) return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, [isReadOnly]);

  // Check if command is active (for toolbar highlight)
  const isCmdActive = (cmd) => {
    try { return document.queryCommandState(cmd); } catch { return false; }
  };

  // ── Special actions ────────────────────────────────────────────────────────
  const insertLink = () => {
    if (!linkUrl.trim()) return;
    execCmd('createLink', linkUrl);
    setShowLinkDialog(false);
    setLinkUrl('');
  };

  const insertTable = () => {
    const r = Math.max(1, Math.min(tableRows, 20));
    const c = Math.max(1, Math.min(tableCols, 10));
    let html = '<table style="width:100%;border-collapse:collapse;margin:8px 0"><tbody>';
    for (let i = 0; i < r; i++) {
      html += '<tr>';
      for (let j = 0; j < c; j++) {
        html += `<td style="border:1px solid #aaa;padding:6px 8px;min-width:80px">&nbsp;</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    execCmd('insertHTML', html);
    setShowTableDialog(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDraft = () => {
    const html = editorRef.current?.innerHTML || '';
    onSaveDraft?.(html);
  };

  const handleSubmit = () => {
    const html = editorRef.current?.innerHTML || '';
    onSubmit?.(html);
  };

  const toggleFS = () => {
    setIsFullscreen((f) => !f);
    onToggleFullscreen?.();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* ── TOOLBAR ── */}
      {!isReadOnly && (
        <div className="no-print flex flex-wrap items-center gap-0.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1.5">
          {TOOL_GROUPS.map((group, gi) => (
            <React.Fragment key={gi}>
              {group.map((btn) => (
                <button
                  key={btn.cmd + (btn.value || '')}
                  type="button"
                  title={btn.title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd(btn.cmd, btn.value || null);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
                    isCmdActive(btn.cmd)
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{btn.icon}</span>
                </button>
              ))}
              {gi < TOOL_GROUPS.length - 1 && (
                <div className="mx-1 h-6 w-px bg-neutral-300 dark:bg-neutral-600" />
              )}
            </React.Fragment>
          ))}

          {/* Separator */}
          <div className="mx-1 h-6 w-px bg-neutral-300 dark:bg-neutral-600" />

          {/* Link */}
          <button
            type="button"
            title="Insert Link"
            onClick={() => setShowLinkDialog(true)}
            className="flex h-8 w-8 items-center justify-center rounded text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            <span className="material-symbols-outlined text-[18px]">link</span>
          </button>

          {/* Table */}
          <button
            type="button"
            title="Insert Table"
            onClick={() => setShowTableDialog(true)}
            className="flex h-8 w-8 items-center justify-center rounded text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            <span className="material-symbols-outlined text-[18px]">table</span>
          </button>

          {/* Separator */}
          <div className="mx-1 h-6 w-px bg-neutral-300 dark:bg-neutral-600" />

          {/* Print / PDF */}
          <button
            type="button"
            title="Print / Save as PDF"
            onClick={handlePrint}
            className="flex h-8 w-8 items-center justify-center rounded text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
            onClick={toggleFS}
            className="flex h-8 w-8 items-center justify-center rounded text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>

          {/* Auto-save status */}
          <div className="ml-auto flex items-center gap-1 pr-1">
            {saveStatus !== 'idle' && (
              <span className={`text-xs font-medium ${saveStatusColor[saveStatus]}`}>
                {saveStatusLabel[saveStatus]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── READ-ONLY TOOLBAR (Print only) ── */}
      {isReadOnly && (
        <div className="no-print flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2">
          <span className="material-symbols-outlined text-amber-500 text-base">lock</span>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Read-only — Document is {doc?.status === 'Approved' ? 'approved and locked' : 'locked'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              title="Print / Save as PDF"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* ── A4 EDITOR AREA ── */}
      <div
        className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950 p-4 md:p-8"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 120px)' : '500px' }}
      >
        {/* A4 page shadow */}
        <div
          id="legal-print-area"
          style={{
            background: 'white',
            width: '210mm',
            minHeight: '297mm',
            maxWidth: '100%',
            margin: '0 auto',
            padding: '20mm 25mm',
            boxShadow: '0 2px 24px rgba(0,0,0,0.12)',
            fontFamily: "'Times New Roman', 'Georgia', serif",
            fontSize: '12pt',
            lineHeight: '1.8',
            color: '#1a1a1a',
          }}
        >
          {/* Document header (printed) */}
          <div className="print-header" style={{ marginBottom: '8mm', borderBottom: '2px solid #333', paddingBottom: '4mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18pt', fontWeight: 700, color: '#1a1a1a' }}>
                  {doc?.title || 'Legal Document'}
                </div>
                <div style={{ fontSize: '9pt', color: '#666', marginTop: '2mm' }}>
                  {doc?.type} • Version {doc?.currentVersion} • {doc?.projectName || ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '8pt', color: '#888' }}>
                <div>Status: {doc?.status || 'Draft'}</div>
                <div>Created by: {doc?.createdByName || '—'}</div>
                {doc?.approvedAt && (
                  <div>Approved: {new Date(doc.approvedAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>

          {/* Editable content area */}
          <div
            ref={editorRef}
            contentEditable={!isReadOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            data-placeholder="Start typing your legal document here…"
            style={{
              outline: 'none',
              minHeight: '200mm',
              fontFamily: "'Times New Roman', 'Georgia', serif",
              fontSize: '12pt',
              lineHeight: '1.8',
              color: '#1a1a1a',
              caretColor: '#c01',
            }}
            className={`legal-editor-body ${isReadOnly ? 'pointer-events-none select-auto' : ''}`}
          />

          {/* Watermark */}
          {doc?.status === 'Draft' && (
            <div
              style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) rotate(-35deg)',
                fontSize: '64pt', fontWeight: 900,
                color: 'rgba(0,0,0,0.04)',
                pointerEvents: 'none', userSelect: 'none',
                zIndex: 0, whiteSpace: 'nowrap',
              }}
            >
              DRAFT
            </div>
          )}
          {doc?.status === 'Approved' && (
            <div
              style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) rotate(-35deg)',
                fontSize: '64pt', fontWeight: 900,
                color: 'rgba(0, 128, 0, 0.05)',
                pointerEvents: 'none', userSelect: 'none',
                zIndex: 0, whiteSpace: 'nowrap',
              }}
            >
              APPROVED
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STATUSBAR ── */}
      <div className="no-print flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2">
        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>Version {doc?.currentVersion || 'v1.0'}</span>
        </div>

        {/* Action buttons — only when editable */}
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save Draft
            </button>
            {onSubmit && (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Submit to CEO
              </button>
            )}
          </div>
        )}
        {isReadOnly && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
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
            <input
              autoFocus
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && insertLink()}
              className="mb-3 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-rose-500"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowLinkDialog(false)} className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400">Cancel</button>
              <button onClick={insertLink} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white">Insert</button>
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
              <input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(+e.target.value)}
                className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100" />
            </div>
            <div className="mb-3 flex items-center gap-2">
              <label className="text-xs text-neutral-500 w-16">Columns:</label>
              <input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(+e.target.value)}
                className="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm text-neutral-900 dark:text-neutral-100" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTableDialog(false)} className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400">Cancel</button>
              <button onClick={insertTable} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor styles ── */}
      <style>{`
        .legal-editor-body:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
        }
        .legal-editor-body h1 { font-size: 20pt; font-weight: 700; margin: 8mm 0 4mm; }
        .legal-editor-body h2 { font-size: 16pt; font-weight: 700; margin: 6mm 0 3mm; }
        .legal-editor-body h3 { font-size: 13pt; font-weight: 700; margin: 4mm 0 2mm; }
        .legal-editor-body p  { margin: 0 0 4mm; }
        .legal-editor-body ul { margin: 2mm 0 4mm; padding-left: 6mm; list-style: disc; }
        .legal-editor-body ol { margin: 2mm 0 4mm; padding-left: 6mm; list-style: decimal; }
        .legal-editor-body li { margin: 1mm 0; }
        .legal-editor-body table { width: 100%; border-collapse: collapse; margin: 4mm 0; }
        .legal-editor-body td, .legal-editor-body th {
          border: 1px solid #aaa; padding: 2mm 3mm; }
        .legal-editor-body a { color: #1a56db; text-decoration: underline; }
      `}</style>
    </div>
  );
});

export default LegalDocEditor;
