import React from 'react';
import {
  Btn, LargeBtn, RibbonGroup, RibbonRow, Popover, MenuItem, MenuHeading, ColorMenu, Icon,
  ribbonSelectClass, focusRing,
} from './EditorUi';
import { TEXT_COLORS, HIGHLIGHT_COLORS, SHADING_COLORS } from './uiConstants';
import { TableGrid, SymbolGrid, WordCountBody, AltTextForm } from './EditorPanels';
import { PAGE_SIZES, MARGIN_PRESETS, LANGUAGES } from './docMeta';
import { changeCase, setTableBorders } from './extensions';

// ── Data ──────────────────────────────────────────────────────────────────────
const FONT_FAMILIES = [
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Palatino Linotype', value: 'Palatino Linotype, Book Antiqua, serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { label: 'Segoe UI', value: 'Segoe UI, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
];

const SIZE_LIST = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const DEFAULT_SIZE = '12pt';

const firstFamily = (value) => String(value || '').split(',')[0].replace(/['"]/g, '').trim().toLowerCase();

const LEGAL_LIST_STYLES = [
  { key: 'decimal', label: '1. 2. 3.' },
  { key: 'lower-alpha', label: '(a) (b) (c)' },
  { key: 'lower-roman', label: '(i) (ii) (iii)' },
];

const LINE_SPACINGS = [
  { value: null, label: 'Default' },
  { value: '1', label: '1.0 (single)' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0 (double)' },
];

const PARA_SPACES = [
  { value: null, label: 'Default' },
  { value: '0pt', label: 'None' },
  { value: '6pt', label: '6 pt' },
  { value: '12pt', label: '12 pt' },
  { value: '18pt', label: '18 pt' },
];

const STYLE_GALLERY = [
  { key: 'p', label: 'Normal', preview: { fontSize: 13 }, active: (e) => e.isActive('paragraph') && !e.isActive('blockquote'), run: (e) => { const ch = e.chain().focus(); if (e.isActive('blockquote')) ch.lift('blockquote'); ch.setParagraph().run(); } },
  { key: 'h1', label: 'Title', preview: { fontSize: 19, fontWeight: 700 }, active: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { key: 'h2', label: 'Heading 1', preview: { fontSize: 16, fontWeight: 700 }, active: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { key: 'h3', label: 'Heading 2', preview: { fontSize: 14, fontWeight: 700 }, active: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { key: 'h4', label: 'Heading 3', preview: { fontSize: 13, fontWeight: 700, fontStyle: 'italic' }, active: (e) => e.isActive('heading', { level: 4 }), run: (e) => e.chain().focus().setHeading({ level: 4 }).run() },
  { key: 'sub', label: 'Subtitle', preview: { fontSize: 13, fontStyle: 'italic', color: '#666' }, active: () => false, run: (e) => e.chain().focus().setParagraph().setTextAlign('center').setItalic().setFontSize('14pt').run() },
  { key: 'quote', label: 'Quote', preview: { fontSize: 13, fontStyle: 'italic', borderLeft: '3px solid #999', paddingLeft: 4 }, active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
];

const GALLERY_VISIBLE = 6;

const TABS = [
  { id: 'file', label: 'File' },
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'layout', label: 'Layout' },
  { id: 'review', label: 'Review' },
  { id: 'view', label: 'View' },
];

const blockAttrs = (editor) => editor.state.selection.$from.parent.attrs || {};

const caret = <Icon name="arrow_drop_down" size={16} />;

// ── Tab panels ────────────────────────────────────────────────────────────────
const FileTab = ({ a, onOpenHistory }) => (
  <>
    <RibbonGroup label="Document">
      {a.save && <LargeBtn icon="save" label="Save draft" title="Save your changes now (Ctrl+S)" onClick={a.save} />}
      {onOpenHistory && <LargeBtn icon="history" label="Version history" title="See and restore earlier versions" onClick={onOpenHistory} />}
    </RibbonGroup>
    <RibbonGroup label="Export and print">
      <LargeBtn icon="picture_as_pdf" label="Download PDF" title="Download this document as a PDF" onClick={a.exportPdf} />
      <LargeBtn icon="description" label="Save as Word" title="Download this document as a Word (.docx) file" onClick={a.exportWord} />
      <LargeBtn icon="print" label="Print" title="Print this document" onClick={a.print} />
    </RibbonGroup>
    <RibbonGroup label="Import">
      <LargeBtn icon="upload_file" label="Open Word file" title="Replace this draft with the text of a Word (.docx) file" onClick={a.importWord} disabled={a.readOnly} />
    </RibbonGroup>
  </>
);

const HomeTab = ({ editor, a }) => {
  const c = () => editor.chain().focus();
  const textStyle = editor.getAttributes('textStyle');
  const family = firstFamily(textStyle.fontFamily) || 'times new roman';
  const familyOption = FONT_FAMILIES.find((f) => firstFamily(f.value) === family);
  const size = textStyle.fontSize || DEFAULT_SIZE;
  const sizeNum = parseFloat(size);
  const sizeOptions = SIZE_LIST.map((n) => `${n}pt`);
  if (!sizeOptions.includes(size)) sizeOptions.push(size);
  const bAttrs = blockAttrs(editor);
  const stepSize = (dir) => {
    const next = dir > 0 ? SIZE_LIST.find((n) => n > sizeNum) ?? SIZE_LIST[SIZE_LIST.length - 1] : [...SIZE_LIST].reverse().find((n) => n < sizeNum) ?? SIZE_LIST[0];
    c().setFontSize(`${next}pt`).run();
  };
  const inList = editor.isActive('listItem') || editor.isActive('taskItem');
  const indent = () => {
    if (editor.isActive('taskItem')) c().sinkListItem('taskItem').run();
    else if (editor.isActive('listItem')) c().sinkListItem('listItem').run();
    else c().indentBlock(1).run();
  };
  const outdent = () => {
    if (editor.isActive('taskItem')) c().liftListItem('taskItem').run();
    else if (editor.isActive('listItem')) c().liftListItem('listItem').run();
    else c().indentBlock(-1).run();
  };
  const textColor = textStyle.color || '#000000';
  const highlightColor = editor.getAttributes('highlight').color || 'transparent';

  return (
    <>
      <RibbonGroup label="Undo">
        <Btn icon="undo" title="Undo (Ctrl+Z)" onClick={() => c().undo().run()} disabled={!editor.can().undo()} />
        <Btn icon="redo" title="Redo (Ctrl+Y)" onClick={() => c().redo().run()} disabled={!editor.can().redo()} />
      </RibbonGroup>

      <RibbonGroup label="Clipboard" stack>
        <RibbonRow>
          <Btn icon="content_paste" title="Paste (Ctrl+V)" onClick={a.paste} />
          <Btn icon="content_paste_go" title="Paste as plain text, without formatting (Ctrl+Shift+V)" onClick={a.pastePlain} />
          <Btn icon="content_cut" title="Cut (Ctrl+X)" onClick={a.cut} />
        </RibbonRow>
        <RibbonRow>
          <Btn icon="content_copy" title="Copy (Ctrl+C)" onClick={a.copy} />
          <Btn icon="format_paint" title="Format painter: copy the look of the selected text, then select other text to apply it" active={a.painterActive} onClick={a.togglePainter} />
        </RibbonRow>
      </RibbonGroup>

      <RibbonGroup label="Font" stack>
        <RibbonRow>
        <select
          title="Font"
          aria-label="Font"
          value={familyOption?.value || ''}
          onChange={(e) => c().setFontFamily(e.target.value).run()}
          className={`${ribbonSelectClass} w-36`}
          style={{ fontFamily: familyOption?.value }}
        >
          {!familyOption && <option value="">{textStyle.fontFamily ? firstFamily(textStyle.fontFamily) : 'Font'}</option>}
          {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
        </select>
        <Btn icon="text_decrease" title="Make text smaller" onClick={() => stepSize(-1)} />
        <select title="Font size" aria-label="Font size" value={size} onChange={(e) => c().setFontSize(e.target.value).run()} className={`${ribbonSelectClass} w-16`}>
          {sizeOptions.map((s) => <option key={s} value={s}>{s.replace('pt', '')}</option>)}
        </select>
        <Btn icon="text_increase" title="Make text bigger" onClick={() => stepSize(1)} />
        </RibbonRow>
        <RibbonRow>
        <Btn icon="format_bold" title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()} />
        <Btn icon="format_italic" title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()} />
        <Btn icon="format_underlined" title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()} />
        <Btn icon="format_strikethrough" title="Strikethrough" active={editor.isActive('strike')} onClick={() => c().toggleStrike().run()} />
        <Btn icon="subscript" title="Subscript (lowered text)" active={editor.isActive('subscript')} onClick={() => c().toggleSubscript().run()} />
        <Btn icon="superscript" title="Superscript (raised text)" active={editor.isActive('superscript')} onClick={() => c().toggleSuperscript().run()} />
        <Popover width={216} renderTrigger={({ open, toggle }) => (
          <Btn title="Text colour" active={open} onClick={toggle}>
            <span className="flex flex-col items-center"><Icon name="format_color_text" /><span className="-mt-0.5 h-1 w-4 rounded-sm" style={{ background: textColor }} /></span>
            {caret}
          </Btn>
        )}
        >
          {(close) => <ColorMenu colors={TEXT_COLORS} noneLabel="Automatic (black)" onPick={(col) => { c().setColor(col).run(); close(); }} onNone={() => { c().unsetColor().run(); close(); }} />}
        </Popover>
        <Popover width={216} renderTrigger={({ open, toggle }) => (
          <Btn title="Highlight colour" active={open} onClick={toggle}>
            <span className="flex flex-col items-center"><Icon name="ink_highlighter" /><span className="-mt-0.5 h-1 w-4 rounded-sm border border-neutral-300" style={{ background: highlightColor }} /></span>
            {caret}
          </Btn>
        )}
        >
          {(close) => <ColorMenu colors={HIGHLIGHT_COLORS} noneLabel="No highlight" onPick={(col) => { c().setHighlight({ color: col }).run(); close(); }} onNone={() => { c().unsetHighlight().run(); close(); }} />}
        </Popover>
        <Popover width={220} renderTrigger={({ open, toggle }) => (
          <Btn title="Change case: UPPER, lower, Title, Sentence" active={open} onClick={toggle}><Icon name="match_case" />{caret}</Btn>
        )}
        >
          {(close) => (
            <>
              <MenuItem label="Sentence case" onClick={() => { changeCase(editor, 'sentence'); close(); }} />
              <MenuItem label="lowercase" onClick={() => { changeCase(editor, 'lower'); close(); }} />
              <MenuItem label="UPPERCASE" onClick={() => { changeCase(editor, 'upper'); close(); }} />
              <MenuItem label="Capitalize Each Word" onClick={() => { changeCase(editor, 'title'); close(); }} />
              <p className="px-2 pb-1 text-[10px] text-neutral-500 dark:text-neutral-400">Select text first, or place the cursor in a word.</p>
            </>
          )}
        </Popover>
        <Btn icon="format_clear" title="Clear all formatting from the selection" onClick={a.clearFormatting} />
        </RibbonRow>
      </RibbonGroup>

      <RibbonGroup label="Paragraph" stack>
        <RibbonRow>
        {[['left', 'Align left (Ctrl+L)'], ['center', 'Centre (Ctrl+E)'], ['right', 'Align right (Ctrl+R)'], ['justify', 'Justify: straight edges on both sides (Ctrl+J)']].map(([al, label]) => (
          <Btn key={al} icon={`format_align_${al}`} title={label} active={editor.isActive({ textAlign: al })} onClick={() => c().setTextAlign(al).run()} />
        ))}
        <Btn icon="format_list_bulleted" title="Bulleted list (Ctrl+Shift+L)" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()} />
        <Btn icon="format_list_numbered" title="Numbered list (Ctrl+Shift+7)" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()} />
        <Btn icon="checklist" title="Checklist with tick boxes" active={editor.isActive('taskList')} onClick={() => c().toggleTaskList().run()} />
        </RibbonRow>
        <RibbonRow>
        <select
          title="Clause numbering: numbers the selected lines as 1. 2. 3., (a) (b) (c) or (i) (ii) (iii)"
          aria-label="Clause numbering"
          value=""
          onChange={(e) => { if (e.target.value) a.applyLegalList(e.target.value); }}
          className={`${ribbonSelectClass} w-32`}
        >
          <option value="" disabled>Clause numbering</option>
          {LEGAL_LIST_STYLES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <Btn icon="format_indent_decrease" title="Decrease indent (Shift+Tab in a list)" disabled={!inList && !bAttrs.indent} onClick={outdent} />
        <Btn icon="format_indent_increase" title="Increase indent (Tab in a list)" onClick={indent} />
        <Popover width={200} renderTrigger={({ open, toggle }) => (
          <Btn title="Line spacing" active={open} onClick={toggle}><Icon name="format_line_spacing" />{caret}</Btn>
        )}
        >
          {(close) => (
            <>
              <MenuHeading>Line spacing</MenuHeading>
              {LINE_SPACINGS.map((o) => <MenuItem key={o.label} label={o.label} active={(bAttrs.lineHeight || null) === o.value} onClick={() => { c().setBlockAttrs({ lineHeight: o.value }).run(); close(); }} />)}
            </>
          )}
        </Popover>
        <Popover width={200} renderTrigger={({ open, toggle }) => (
          <Btn title="Space before and after paragraphs" active={open} onClick={toggle}><Icon name="vertical_align_center" />{caret}</Btn>
        )}
        >
          {(close) => (
            <>
              <MenuHeading>Space before paragraph</MenuHeading>
              {PARA_SPACES.map((o) => <MenuItem key={`b${o.label}`} label={o.label} active={(bAttrs.spaceBefore || null) === o.value} onClick={() => { c().setBlockAttrs({ spaceBefore: o.value }).run(); close(); }} />)}
              <MenuHeading>Space after paragraph</MenuHeading>
              {PARA_SPACES.map((o) => <MenuItem key={`a${o.label}`} label={o.label} active={(bAttrs.spaceAfter || null) === o.value} onClick={() => { c().setBlockAttrs({ spaceAfter: o.value }).run(); close(); }} />)}
            </>
          )}
        </Popover>
        </RibbonRow>
      </RibbonGroup>

      <RibbonGroup label="Styles">
        <div role="listbox" aria-label="Styles" className="flex w-[26rem] max-w-[44vw] flex-nowrap gap-1 overflow-x-auto py-0.5">
          {STYLE_GALLERY.slice(0, GALLERY_VISIBLE).map((s) => {
            const active = s.active(editor);
            return (
              <button
                key={s.key}
                type="button"
                role="option"
                aria-selected={active}
                title={`Apply the "${s.label}" style`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => s.run(editor)}
                className={`flex h-[50px] w-[68px] shrink-0 flex-col items-start justify-between overflow-hidden rounded-md border px-1.5 py-1 text-left ${focusRing} ${active ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]' : 'border-neutral-300 bg-white hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800'}`}
              >
                <span className="w-full truncate leading-none text-neutral-900 dark:text-neutral-100" style={{ fontFamily: "'Times New Roman', serif", ...s.preview }}>AaBbCc</span>
                <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{s.label}</span>
              </button>
            );
          })}
        </div>
        <Popover width={200} renderTrigger={({ open, toggle }) => (
          <Btn title="More styles" active={open} onClick={toggle}><Icon name="expand_more" /></Btn>
        )}
        >
          {(close) => (
            <>
              <MenuHeading>Styles</MenuHeading>
              {STYLE_GALLERY.map((s) => (
                <MenuItem key={s.key} label={s.label} active={s.active(editor)} onClick={() => { s.run(editor); close(); }} />
              ))}
            </>
          )}
        </Popover>
      </RibbonGroup>

      <RibbonGroup label="Editing">
        <LargeBtn icon="search" label="Find" title="Find text in this document (Ctrl+F)" onClick={() => a.openFind(false)} />
        <LargeBtn icon="find_replace" label="Replace" title="Find and replace text (Ctrl+H)" onClick={() => a.openFind(true)} />
        <Btn icon="select_all" title="Select everything (Ctrl+A)" onClick={() => c().selectAll().run()} />
      </RibbonGroup>
    </>
  );
};

const InsertTab = ({ editor, a, meta, onMeta, clauses, onOpenClauseLibrary }) => {
  const c = () => editor.chain().focus();
  const now = new Date();
  const dateOptions = [
    now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}, ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
  ];
  return (
    <>
      <RibbonGroup label="Tables">
        <Popover width={290} renderTrigger={({ open, toggle }) => (
          <LargeBtn icon="table" label="Table" title="Insert a table: choose how many rows and columns" caret active={open} onClick={toggle} />
        )}
        >
          {(close) => <TableGrid onPick={(rows, cols) => { c().insertTable({ rows, cols, withHeaderRow: false }).run(); close(); }} />}
        </Popover>
      </RibbonGroup>
      <RibbonGroup label="Illustrations">
        <LargeBtn icon="image" label="Picture" title="Insert a picture from your computer" onClick={a.openImage} />
      </RibbonGroup>
      <RibbonGroup label="Links and text">
        <LargeBtn icon="link" label="Link" title="Insert or edit a web link (Ctrl+K)" active={editor.isActive('link')} onClick={a.openLink} />
        <LargeBtn icon="horizontal_rule" label="Line" title="Insert a horizontal divider line" onClick={() => c().setHorizontalRule().run()} />
        <LargeBtn icon="insert_page_break" label="Page break" title="Start the next text on a new page (Ctrl+Enter)" onClick={() => c().setPageBreak().run()} />
        <Popover width={280} renderTrigger={({ open, toggle }) => (
          <LargeBtn icon="event" label="Date & time" title="Insert today's date or the time" caret active={open} onClick={toggle} />
        )}
        >
          {(close) => (
            <>
              <MenuHeading>Insert</MenuHeading>
              {dateOptions.map((text) => <MenuItem key={text} label={text} onClick={() => { c().insertContent(text).run(); close(); }} />)}
            </>
          )}
        </Popover>
        <LargeBtn icon="draw" label="Signature" title="Insert a signature block for both parties" onClick={a.insertSignature} />
        <Popover width={300} renderTrigger={({ open, toggle }) => (
          <LargeBtn icon="special_character" label="Symbol" title="Insert a special character such as the copyright sign or section sign" caret active={open} onClick={toggle} />
        )}
        >
          {(close) => <SymbolGrid onPick={(s) => { c().insertContent(s).run(); close(); }} />}
        </Popover>
        <LargeBtn icon="toc" label="Contents" title="Insert a table of contents built from your headings" onClick={a.insertToc} />
      </RibbonGroup>
      <RibbonGroup label="Header and footer">
        <LargeBtn icon="vertical_align_top" label="Header" title="Type text for the top of every page" onClick={() => a.focusHeaderFooter('header')} />
        <LargeBtn icon="vertical_align_bottom" label="Footer" title="Type text for the bottom of every page" onClick={() => a.focusHeaderFooter('footer')} />
        <LargeBtn icon="pin" label="Page numbers" title="Show Page X of Y at the bottom of every page (PDF and print)" active={meta.pageNumbers} onClick={() => onMeta({ pageNumbers: !meta.pageNumbers })} />
      </RibbonGroup>
      <RibbonGroup label="Legal">
        <Popover width={280} renderTrigger={({ open, toggle }) => (
          <LargeBtn icon="library_add" label="Add clause" title="Insert a ready-made clause (confidentiality, termination, etc.)" caret active={open} onClick={toggle} />
        )}
        >
          {(close) => (
            <>
              {onOpenClauseLibrary && (
                <MenuItem icon="search" label="Browse full clause library" onClick={() => { close(); onOpenClauseLibrary((html) => a.insertHtml(html)); }} />
              )}
              {clauses.map((cl) => (
                <MenuItem key={cl.key} label={cl.title} hint={cl.category} onClick={() => { a.insertHtml(cl.html); close(); }} />
              ))}
            </>
          )}
        </Popover>
      </RibbonGroup>
    </>
  );
};

const LayoutTab = ({ meta, onMeta }) => (
  <>
    <RibbonGroup label="Page setup">
      <Popover width={230} renderTrigger={({ open, toggle }) => (
        <LargeBtn icon="crop_portrait" label={`Size: ${meta.size}`} title="Choose the paper size" caret active={open} onClick={toggle} />
      )}
      >
        {(close) => Object.entries(PAGE_SIZES).map(([key, s]) => (
          <MenuItem key={key} label={s.label} hint={s.hint} active={meta.size === key} onClick={() => { onMeta({ size: key }); close(); }} />
        ))}
      </Popover>
      <LargeBtn icon="crop_portrait" label="Portrait" title="Tall pages" active={meta.orientation === 'portrait'} onClick={() => onMeta({ orientation: 'portrait' })} />
      <LargeBtn icon="crop_landscape" label="Landscape" title="Wide pages" active={meta.orientation === 'landscape'} onClick={() => onMeta({ orientation: 'landscape' })} />
      <Popover width={250} renderTrigger={({ open, toggle }) => (
        <LargeBtn icon="border_outer" label={`Margins: ${MARGIN_PRESETS[meta.margin].label}`} title="Choose the space between the text and the paper edge" caret active={open} onClick={toggle} />
      )}
      >
        {(close) => Object.entries(MARGIN_PRESETS).map(([key, m]) => (
          <MenuItem key={key} label={m.label} hint={`Top/bottom ${m.top} mm, left/right ${m.left} mm`} active={meta.margin === key} onClick={() => { onMeta({ margin: key }); close(); }} />
        ))}
      </Popover>
    </RibbonGroup>
    <RibbonGroup label="Note">
      <p className="max-w-xs px-1 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">Page size, orientation and margins are used for the page on screen, the PDF download and printing.</p>
    </RibbonGroup>
  </>
);

const ReviewTab = ({ editor, a, pages, spell, onSpell, meta, onMeta, onOpenComments, onOpenHistory }) => (
  <>
    <RibbonGroup label="Proofing">
      <Popover width={250} renderTrigger={({ open, toggle }) => (
        <LargeBtn icon="123" label="Word count" title="Words, characters, paragraphs and pages" caret active={open} onClick={toggle} />
      )}
      >
        {() => <WordCountBody editor={editor} pages={pages} />}
      </Popover>
      <LargeBtn icon="spellcheck" label={spell ? 'Spelling: on' : 'Spelling: off'} title="Show or hide red underlines under misspelled words" active={spell} onClick={() => onSpell(!spell)} />
      <select title="Language used for spelling" aria-label="Language" disabled={a.readOnly} value={meta.lang} onChange={(e) => onMeta({ lang: e.target.value })} className={`${ribbonSelectClass} w-40`}>
        {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>
    </RibbonGroup>
    {(onOpenComments || onOpenHistory) && (
      <RibbonGroup label="Collaborate">
        {onOpenComments && <LargeBtn icon="chat_bubble" label="Comments" title="Open comments" onClick={onOpenComments} />}
        {onOpenHistory && <LargeBtn icon="history" label="Versions" title="Version history" onClick={onOpenHistory} />}
      </RibbonGroup>
    )}
    <RibbonGroup label="Help">
      <LargeBtn icon="keyboard" label="Shortcuts" title="See the keyboard shortcuts" onClick={a.openShortcuts} />
    </RibbonGroup>
  </>
);

const ViewTab = ({ v }) => (
  <>
    <RibbonGroup label="Document views">
      <LargeBtn icon="description" label="Print layout" title="Show the page as it will print, with page boundaries" active={v.viewMode === 'print'} onClick={() => v.setViewMode('print')} />
      <LargeBtn icon="article" label="Draft view" title="Show only the text on the paper, without page guides or header and footer" active={v.viewMode === 'draft'} onClick={() => v.setViewMode('draft')} />
    </RibbonGroup>
    <RibbonGroup label="Zoom">
      <Btn icon="zoom_out" title="Zoom out" onClick={() => v.setZoom((z) => Math.max(50, z - 10))} />
      <input type="range" min={50} max={200} step={5} value={v.zoom} onChange={(e) => v.setZoom(Number(e.target.value))} aria-label="Zoom" className="w-28 accent-[var(--portal-accent)]" />
      <Btn icon="zoom_in" title="Zoom in" onClick={() => v.setZoom((z) => Math.min(200, z + 10))} />
      <Btn title="Reset zoom to 100%" onClick={() => v.setZoom(100)} className="px-1.5"><span className="text-xs font-semibold">{v.zoom}%</span></Btn>
      <LargeBtn icon="fit_screen" label="Fit width" title="Zoom so the page fits the window width" onClick={v.fitWidth} />
      <LargeBtn icon="fit_page" label="Fit page" title="Zoom so one whole page is visible" onClick={v.fitPage} />
    </RibbonGroup>
    <RibbonGroup label="Window">
      {v.onToggleFullscreen && <LargeBtn icon={v.isFullscreen ? 'fullscreen_exit' : 'fullscreen'} label={v.isFullscreen ? 'Exit full screen' : 'Full screen'} title={v.isFullscreen ? 'Exit full screen (Esc)' : 'Edit in full screen'} onClick={() => v.onToggleFullscreen(!v.isFullscreen)} />}
      <LargeBtn icon="keyboard" label="Shortcuts" title="See the keyboard shortcuts" onClick={v.openShortcuts} />
    </RibbonGroup>
  </>
);

const TableTab = ({ editor }) => {
  const c = () => editor.chain().focus();
  const isBorderless = Boolean(editor.getAttributes('tableCell').borderless || editor.getAttributes('tableHeader').borderless);
  return (
    <>
      <RibbonGroup label="Rows">
        <LargeBtn icon="keyboard_double_arrow_up" label="Row above" title="Insert a row above" onClick={() => c().addRowBefore().run()} />
        <LargeBtn icon="keyboard_double_arrow_down" label="Row below" title="Insert a row below" onClick={() => c().addRowAfter().run()} />
        <LargeBtn icon="table_rows" label="Delete row" title="Delete the current row" onClick={() => c().deleteRow().run()} />
      </RibbonGroup>
      <RibbonGroup label="Columns">
        <LargeBtn icon="keyboard_double_arrow_left" label="Column left" title="Insert a column to the left" onClick={() => c().addColumnBefore().run()} />
        <LargeBtn icon="keyboard_double_arrow_right" label="Column right" title="Insert a column to the right" onClick={() => c().addColumnAfter().run()} />
        <LargeBtn icon="view_column" label="Delete column" title="Delete the current column" onClick={() => c().deleteColumn().run()} />
      </RibbonGroup>
      <RibbonGroup label="Cells">
        <LargeBtn icon="cell_merge" label="Merge cells" title="Merge the selected cells (drag across cells to select them)" onClick={() => c().mergeCells().run()} />
        <LargeBtn icon="call_split" label="Split cell" title="Split a merged cell" onClick={() => c().splitCell().run()} />
        <LargeBtn icon="table_chart" label="Header row" title="Turn the first row into a heading row, or back" onClick={() => c().toggleHeaderRow().run()} />
      </RibbonGroup>
      <RibbonGroup label="Style">
        <Popover width={216} renderTrigger={({ open, toggle }) => (
          <LargeBtn icon="format_color_fill" label="Shading" title="Colour the background of the selected cells" caret active={open} onClick={toggle} />
        )}
        >
          {(close) => <ColorMenu colors={SHADING_COLORS} noneLabel="No shading" onPick={(col) => { c().setCellAttribute('backgroundColor', col).run(); close(); }} onNone={() => { c().setCellAttribute('backgroundColor', null).run(); close(); }} />}
        </Popover>
        <LargeBtn icon={isBorderless ? 'border_all' : 'border_clear'} label={isBorderless ? 'Show borders' : 'Hide borders'} title="Show or hide the lines around all cells of this table" onClick={() => setTableBorders(editor, !isBorderless)} />
      </RibbonGroup>
      <RibbonGroup label="Delete">
        <LargeBtn icon="delete" label="Delete table" title="Delete the whole table" onClick={() => c().deleteTable().run()} />
      </RibbonGroup>
    </>
  );
};

const PictureTab = ({ editor }) => {
  const c = () => editor.chain().focus();
  const attrs = editor.getAttributes('image');
  return (
    <>
      <RibbonGroup label="Size">
        {['25%', '50%', '75%', '100%'].map((w) => (
          <LargeBtn key={w} icon="photo_size_select_large" label={w} title={`Make the picture ${w} of the page width`} active={attrs.width === w} onClick={() => c().updateAttributes('image', { width: w }).run()} />
        ))}
      </RibbonGroup>
      <RibbonGroup label="Position">
        <LargeBtn icon="format_align_left" label="Left" title="Align the picture to the left" active={(attrs.align || 'left') === 'left'} onClick={() => c().updateAttributes('image', { align: 'left' }).run()} />
        <LargeBtn icon="format_align_center" label="Centre" title="Centre the picture" active={attrs.align === 'center'} onClick={() => c().updateAttributes('image', { align: 'center' }).run()} />
        <LargeBtn icon="format_align_right" label="Right" title="Align the picture to the right" active={attrs.align === 'right'} onClick={() => c().updateAttributes('image', { align: 'right' }).run()} />
      </RibbonGroup>
      <RibbonGroup label="Accessibility">
        <Popover width={260} renderTrigger={({ open, toggle }) => (
          <LargeBtn icon="accessibility_new" label="Description" title="Add or edit the picture description" caret active={open} onClick={toggle} />
        )}
        >
          {(close) => <AltTextForm initial={attrs.alt} onApply={(alt) => { c().updateAttributes('image', { alt }).run(); close(); }} />}
        </Popover>
      </RibbonGroup>
      <RibbonGroup label="Delete">
        <LargeBtn icon="delete" label="Remove" title="Remove the picture" onClick={() => c().deleteSelection().run()} />
      </RibbonGroup>
    </>
  );
};

// ── Ribbon shell ──────────────────────────────────────────────────────────────
const Ribbon = ({
  editor, isReadOnly, tab, onTab, open, onToggleOpen, inTable, inImage,
  actions, view, meta, onMeta, pages, spell, onSpell, clauses,
  onOpenClauseLibrary, onOpenComments, onOpenHistory, saveIndicator,
}) => {
  const tabs = [...TABS];
  if (inTable) tabs.push({ id: 'table', label: 'Table tools', contextual: true });
  if (inImage) tabs.push({ id: 'picture', label: 'Picture tools', contextual: true });
  const active = tabs.some((t) => t.id === tab) ? tab : 'home';

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === active);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onTab(next.id);
    window.requestAnimationFrame(() => window.document.getElementById(`legal-tab-${next.id}`)?.focus());
  };

  const a = { ...actions, readOnly: isReadOnly };
  const editingTab = ['home', 'insert', 'layout', 'table', 'picture'].includes(active);

  return (
    <div className="no-print relative z-20 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-end gap-1 px-2 pt-1">
        <div role="tablist" aria-label="Editor ribbon" onKeyDown={onTabKey} className="flex min-w-0 flex-nowrap items-end gap-0.5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`legal-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              aria-controls="legal-ribbon-panel"
              tabIndex={active === t.id ? 0 : -1}
              onClick={() => { if (active === t.id && open) onToggleOpen(); else { onTab(t.id); if (!open) onToggleOpen(); } }}
              className={`min-h-9 shrink-0 rounded-t-lg px-3 text-xs font-semibold ${focusRing} ${
                active === t.id && open
                  ? 'border border-b-0 border-neutral-200 bg-white text-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-900'
                  : `text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 ${t.contextual ? 'text-[var(--portal-accent)]' : ''}`
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 pb-0.5 pr-1">
          <span role="status" aria-live="polite" className={`hidden items-center gap-1 text-xs font-medium sm:inline-flex ${saveIndicator.color}`} title={saveIndicator.hint}>
            <span className={`material-symbols-outlined text-[16px] ${saveIndicator.spin ? 'animate-spin' : ''}`}>{saveIndicator.icon}</span>
            {saveIndicator.label}
          </span>
          {view.onToggleFullscreen && (view.isFullscreen ? (
            <button type="button" onClick={() => view.onToggleFullscreen(false)} title="Exit full screen (Esc)" className={`inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--portal-accent)] px-3 text-xs font-semibold text-white hover:brightness-110 ${focusRing}`}>
              <Icon name="fullscreen_exit" size={16} />
              <span>Exit full screen</span>
            </button>
          ) : (
            <button type="button" onClick={() => view.onToggleFullscreen(true)} title="Full screen: edit using the whole screen" aria-label="Full screen" className={`inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 ${focusRing}`}>
              <Icon name="fullscreen" size={18} />
              <span className="hidden md:inline">Full screen</span>
            </button>
          ))}
          <button type="button" onClick={onToggleOpen} title={open ? 'Collapse the ribbon' : 'Show the ribbon'} aria-label={open ? 'Collapse the ribbon' : 'Show the ribbon'} aria-expanded={open} className={`flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${focusRing}`}>
            <Icon name={open ? 'expand_less' : 'expand_more'} />
          </button>
        </div>
      </div>
      {open && (
        <div id="legal-ribbon-panel" role="tabpanel" aria-labelledby={`legal-tab-${active}`} className="overflow-x-auto overflow-y-hidden border-t border-neutral-200 bg-white px-1 py-1 dark:border-neutral-700 dark:bg-neutral-900">
          <fieldset disabled={isReadOnly && editingTab} className="m-0 flex w-max min-w-full flex-nowrap border-0 p-0">
            <legend className="sr-only">{`${active} tools`}</legend>
            {active === 'file' && <FileTab a={a} onOpenHistory={onOpenHistory} />}
            {active === 'home' && <HomeTab editor={editor} a={a} />}
            {active === 'insert' && <InsertTab editor={editor} a={a} meta={meta} onMeta={onMeta} clauses={clauses} onOpenClauseLibrary={onOpenClauseLibrary} />}
            {active === 'layout' && <LayoutTab meta={meta} onMeta={onMeta} />}
            {active === 'review' && <ReviewTab editor={editor} a={a} pages={pages} spell={spell} onSpell={onSpell} meta={meta} onMeta={onMeta} onOpenComments={onOpenComments} onOpenHistory={onOpenHistory} />}
            {active === 'view' && <ViewTab v={view} />}
            {active === 'table' && <TableTab editor={editor} />}
            {active === 'picture' && <PictureTab editor={editor} />}
          </fieldset>
        </div>
      )}
    </div>
  );
};

export default Ribbon;
