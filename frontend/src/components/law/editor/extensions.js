import { Extension, Node } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';

export const INDENT_MM = 12.7;
const BLOCK_TYPES = ['paragraph', 'heading'];

// ── Font size (TextStyle has no size attribute out of the box) ────────────────
export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ── Line spacing, paragraph spacing and indent on paragraphs / headings ───────
export const BlockFormat = Extension.create({
  name: 'blockFormat',
  addGlobalAttributes() {
    return [{
      types: BLOCK_TYPES,
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el) => el.style.lineHeight || null,
          renderHTML: (a) => (a.lineHeight ? { style: `line-height:${a.lineHeight}` } : {}),
        },
        spaceBefore: {
          default: null,
          parseHTML: (el) => el.style.marginTop || null,
          renderHTML: (a) => (a.spaceBefore ? { style: `margin-top:${a.spaceBefore}` } : {}),
        },
        spaceAfter: {
          default: null,
          parseHTML: (el) => el.style.marginBottom || null,
          renderHTML: (a) => (a.spaceAfter ? { style: `margin-bottom:${a.spaceAfter}` } : {}),
        },
        indent: {
          default: 0,
          parseHTML: (el) => {
            const raw = el.style.marginLeft;
            const value = parseFloat(raw);
            if (!raw || !value || !String(raw).endsWith('mm')) return 0;
            return Math.max(0, Math.min(8, Math.round(value / INDENT_MM)));
          },
          renderHTML: (a) => (a.indent ? { style: `margin-left:${(a.indent * INDENT_MM).toFixed(1)}mm` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setBlockAttrs: (attrs) => ({ state, tr, dispatch }) => {
        if (!dispatch) return true;
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (BLOCK_TYPES.includes(node.type.name)) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
            return false;
          }
          return true;
        });
        return true;
      },
      indentBlock: (dir) => ({ state, tr, dispatch }) => {
        let changed = false;
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (BLOCK_TYPES.includes(node.type.name)) {
            const current = node.attrs.indent || 0;
            const next = Math.max(0, Math.min(8, current + dir));
            if (next !== current) {
              changed = true;
              if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            }
            return false;
          }
          return true;
        });
        return changed;
      },
    };
  },
});

// ── Page break (renders exactly like the marker older content used) ───────────
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  priority: 1000,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },
  renderHTML() {
    return ['div', {
      'data-page-break': 'true',
      style: 'page-break-after:always;break-after:page;border-top:1px dashed #bbb;margin:18px 0;height:1px',
    }];
  },
  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => chain().insertContent({ type: this.name }).run(),
    };
  },
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.setPageBreak() };
  },
});

// ── Table cells: shading and per-cell borders ─────────────────────────────────
const cellAttributes = () => ({
  backgroundColor: {
    default: null,
    parseHTML: (el) => el.getAttribute('data-bg') || el.style.backgroundColor || null,
    renderHTML: (a) => (a.backgroundColor ? { 'data-bg': a.backgroundColor, style: `background-color:${a.backgroundColor}` } : {}),
  },
  borderless: {
    default: false,
    parseHTML: (el) => el.getAttribute('data-borderless') === 'true',
    renderHTML: (a) => (a.borderless ? { 'data-borderless': 'true', style: 'border:none' } : {}),
  },
});

export const LegalTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});

export const LegalTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes() };
  },
});

// ── Pictures: width + alignment ───────────────────────────────────────────────
export const LegalImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.style.width || el.getAttribute('width') || null,
        renderHTML: (a) => (a.width ? { style: `width:${a.width};height:auto;max-width:100%` } : {}),
      },
      align: {
        default: 'left',
        parseHTML: (el) => el.getAttribute('data-align') || 'left',
        renderHTML: (a) => {
          if (a.align === 'center') return { 'data-align': 'center', style: 'display:block;margin-left:auto;margin-right:auto' };
          if (a.align === 'right') return { 'data-align': 'right', style: 'display:block;margin-left:auto' };
          return {};
        },
      },
    };
  },
});

// ── Find & replace (ProseMirror decorations) ──────────────────────────────────
const searchKey = new PluginKey('legalSearch');

export const findMatches = (doc, term, caseSensitive) => {
  const out = [];
  if (!term) return out;
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    const map = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText) {
        for (let i = 0; i < child.text.length; i += 1) {
          text += child.text[i];
          map.push(start + i);
        }
      } else {
        text += '\n';
        map.push(start);
      }
    });
    re.lastIndex = 0;
    let m = re.exec(text);
    while (m) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
      } else {
        out.push({ from: map[m.index], to: map[m.index + m[0].length - 1] + 1 });
      }
      m = re.exec(text);
    }
    return false;
  });
  return out;
};

export const SearchReplace = Extension.create({
  name: 'searchReplace',
  addStorage() {
    return { term: '', caseSensitive: false, results: [], index: 0 };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    let cache = null;
    return [new Plugin({
      key: searchKey,
      props: {
        decorations(state) {
          if (!storage.term) {
            storage.results = [];
            return DecorationSet.empty;
          }
          if (!cache || cache.doc !== state.doc || cache.term !== storage.term || cache.cs !== storage.caseSensitive) {
            storage.results = findMatches(state.doc, storage.term, storage.caseSensitive);
            cache = { doc: state.doc, term: storage.term, cs: storage.caseSensitive };
          }
          if (storage.index >= storage.results.length) storage.index = 0;
          return DecorationSet.create(state.doc, storage.results.map((r, i) => Decoration.inline(
            r.from,
            r.to,
            { class: i === storage.index ? 'search-match search-match-current' : 'search-match' }
          )));
        },
      },
    })];
  },
  addCommands() {
    const storage = this.storage;
    return {
      setSearch: (term, caseSensitive) => ({ tr, dispatch }) => {
        storage.term = term || '';
        storage.caseSensitive = Boolean(caseSensitive);
        storage.index = 0;
        if (dispatch) tr.setMeta(searchKey, { refresh: true });
        return true;
      },
      // dir: 1 = next, -1 = previous. inclusive: a match starting at the caret counts.
      searchStep: (dir = 1, inclusive = false) => ({ state, tr, dispatch }) => {
        const results = findMatches(state.doc, storage.term, storage.caseSensitive);
        if (!results.length) return false;
        const { from, to } = state.selection;
        let idx;
        if (dir >= 0) {
          idx = results.findIndex((r) => (inclusive ? r.from >= from : r.from >= to));
          if (idx === -1) idx = 0;
        } else {
          idx = -1;
          for (let i = results.length - 1; i >= 0; i -= 1) {
            if (results[i].to <= from) { idx = i; break; }
          }
          if (idx === -1) idx = results.length - 1;
        }
        storage.index = idx;
        if (dispatch) {
          tr.setSelection(TextSelection.create(tr.doc, results[idx].from, results[idx].to)).scrollIntoView();
          tr.setMeta(searchKey, { refresh: true });
        }
        return true;
      },
      replaceCurrentMatch: (text) => ({ state, tr, dispatch }) => {
        const { from, to } = state.selection;
        const hit = findMatches(state.doc, storage.term, storage.caseSensitive).find((r) => r.from === from && r.to === to);
        if (!hit) return false;
        if (dispatch) tr.insertText(text, hit.from, hit.to);
        return true;
      },
      replaceAllMatches: (text) => ({ state, tr, dispatch }) => {
        const results = findMatches(state.doc, storage.term, storage.caseSensitive);
        if (!results.length) return false;
        if (dispatch) {
          for (let i = results.length - 1; i >= 0; i -= 1) tr.insertText(text, results[i].from, results[i].to);
        }
        return true;
      },
    };
  },
});

// ── Text case ────────────────────────────────────────────────────────────────
const mapChar = (ch, fn) => {
  const out = fn(ch);
  return out.length === ch.length ? out : ch;
};

const transformCase = (text, mode, startsSentence) => {
  const chars = Array.from(text);
  let newWord = true;
  let newSentence = startsSentence;
  return chars.map((ch) => {
    let out = ch;
    if (mode === 'upper') out = mapChar(ch, (c) => c.toUpperCase());
    else if (mode === 'lower') out = mapChar(ch, (c) => c.toLowerCase());
    else if (mode === 'title') out = newWord ? mapChar(ch, (c) => c.toUpperCase()) : mapChar(ch, (c) => c.toLowerCase());
    else if (mode === 'sentence') {
      const isLetter = /\p{L}/u.test(ch);
      out = isLetter && newSentence ? mapChar(ch, (c) => c.toUpperCase()) : mapChar(ch, (c) => c.toLowerCase());
      if (isLetter) newSentence = false;
      if (/[.!?]/.test(ch)) newSentence = true;
    }
    newWord = /[\s\-/(]/.test(ch);
    return out;
  }).join('');
};

/** mode: 'upper' | 'lower' | 'title' | 'sentence'. Works on the selection, or the word at the caret. */
export const changeCase = (editor, mode) => {
  const { state, view } = editor;
  const original = state.selection;
  let { from, to } = original;
  if (from === to) {
    const $pos = state.doc.resolve(from);
    if (!$pos.parent.isTextblock) return false;
    const text = $pos.parent.textBetween(0, $pos.parent.content.size, undefined, '￼');
    const offset = from - $pos.start();
    const isWord = (c) => /[\p{L}\p{N}'’]/u.test(c || '');
    let s = offset;
    let e = offset;
    while (s > 0 && isWord(text[s - 1])) s -= 1;
    while (e < text.length && isWord(text[e])) e += 1;
    if (s === e) return false;
    from = $pos.start() + s;
    to = $pos.start() + e;
  }
  const tr = state.tr;
  const edits = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const s = Math.max(from, pos);
      const e = Math.min(to, pos + node.nodeSize);
      edits.push({ s, e, text: node.text.slice(s - pos, e - pos), marks: node.marks });
    }
  });
  const whole = edits.map((x) => x.text).join('');
  const converted = transformCase(whole, mode, true);
  const convertedChars = Array.from(converted);
  let cursor = 0;
  edits.forEach((edit) => {
    const count = Array.from(edit.text).length;
    const next = convertedChars.slice(cursor, cursor + count).join('');
    cursor += count;
    if (next !== edit.text && next.length === edit.text.length) {
      tr.replaceWith(edit.s, edit.e, state.schema.text(next, edit.marks));
    }
  });
  tr.setSelection(TextSelection.create(tr.doc, Math.min(original.from, tr.doc.content.size), Math.min(original.to, tr.doc.content.size)));
  view.dispatch(tr);
  return true;
};

// ── Table helpers ────────────────────────────────────────────────────────────
export const setTableBorders = (editor, borderless) => {
  const { state, view } = editor;
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d -= 1) {
    const node = $from.node(d);
    if (node.type.name !== 'table') continue;
    const tableStart = $from.start(d);
    const tr = state.tr;
    node.descendants((n, p) => {
      if (n.type.name === 'tableCell' || n.type.name === 'tableHeader') {
        tr.setNodeMarkup(tableStart + p, undefined, { ...n.attrs, borderless });
        return false;
      }
      return true;
    });
    view.dispatch(tr);
    return true;
  }
  return false;
};

// ── Keyboard shortcuts as in Word ─────────────────────────────────────────────
export const LegalShortcuts = Extension.create({
  name: 'legalShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    const run = (fn) => () => { fn(this.editor); return true; };
    return {
      'Mod-Alt-1': run((e) => e.chain().focus().setHeading({ level: 2 }).run()),
      'Mod-Alt-2': run((e) => e.chain().focus().setHeading({ level: 3 }).run()),
      'Mod-Alt-3': run((e) => e.chain().focus().setHeading({ level: 4 }).run()),
      'Mod-Shift-l': run((e) => e.chain().focus().toggleBulletList().run()),
      'Mod-l': run((e) => e.chain().focus().setTextAlign('left').run()),
      'Mod-e': run((e) => e.chain().focus().setTextAlign('center').run()),
      'Mod-r': run((e) => e.chain().focus().setTextAlign('right').run()),
      'Mod-j': run((e) => e.chain().focus().setTextAlign('justify').run()),
    };
  },
});

// ── Clause numbering style on ordered lists: 1. 2. 3. / (a) (b) / (i) (ii) ─────
export const ListStyle = Extension.create({
  name: 'listStyle',
  addGlobalAttributes() {
    return [{
      types: ['orderedList'],
      attributes: {
        legalStyle: {
          default: null,
          parseHTML: (el) => el.getAttribute('data-legal-style') || null,
          renderHTML: (a) => (a.legalStyle ? { 'data-legal-style': a.legalStyle } : {}),
        },
      },
    }];
  },
});
