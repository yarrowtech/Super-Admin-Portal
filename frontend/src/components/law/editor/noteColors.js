// One colour language for legal-document notes, used by the selection toolbar, the text
// highlights, the notes panel and its highlight list — so a colour always means the same thing:
//   yellow = key point · red = critical · blue = note. Other marker colours are plain highlights.

export const NOTE_STYLES = {
  highlight: {
    label: 'Key point',
    icon: 'star',
    mark: '#fef08a',
    iconCls: 'text-amber-500',
    cardCls: 'border-amber-300 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20',
    barCls: 'border-amber-400',
    chipCls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    btnCls: 'bg-amber-500 hover:bg-amber-600',
  },
  critical: {
    label: 'Critical',
    icon: 'priority_high',
    mark: '#fecaca',
    iconCls: 'text-rose-600',
    cardCls: 'border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-900/20',
    barCls: 'border-rose-500',
    chipCls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    btnCls: 'bg-rose-600 hover:bg-rose-700',
  },
  note: {
    label: 'Note',
    icon: 'sticky_note_2',
    mark: '#bfdbfe',
    iconCls: 'text-blue-600',
    cardCls: 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-900/20',
    barCls: 'border-blue-400',
    chipCls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    btnCls: 'bg-blue-600 hover:bg-blue-700',
  },
};

// Style key for a stored annotation ({ kind, critical }).
export const styleKeyOf = (a) => (a?.critical ? 'critical' : a?.kind === 'highlight' ? 'highlight' : 'note');
export const styleOf = (a) => NOTE_STYLES[styleKeyOf(a)];

// Plain marker colours (no note attached), shown after the three meaningful ones.
export const PLAIN_MARKERS = [
  { color: '#bbf7d0', label: 'Green' },
  { color: '#fbcfe8', label: 'Pink' },
  { color: '#fed7aa', label: 'Orange' },
];

// What a highlight colour in the text means ('' for a plain marker).
const norm = (c) => String(c || '').trim().toLowerCase();
export const meaningOfColor = (color) => {
  const c = norm(color);
  const hit = Object.entries(NOTE_STYLES).find(([, s]) => s.mark === c);
  return hit ? hit[0] : '';
};
