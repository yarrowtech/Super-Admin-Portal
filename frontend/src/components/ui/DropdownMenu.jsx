import { useEffect, useRef, useState } from 'react';
import IconButton from '../common/IconButton';

/**
 * Generic anchored kebab/context menu. `items`: [{ key?, label, icon?, onClick, tone?: 'default'|'danger', disabled? }].
 * Renders its own trigger (IconButton "more_vert") unless `trigger` is supplied.
 */
const DropdownMenu = ({ items = [], trigger, align = 'right', tooltip = 'More actions', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  return (
    <div ref={rootRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      {trigger ? (
        <span onClick={() => !disabled && setOpen((v) => !v)}>{trigger}</span>
      ) : (
        <IconButton icon="more_vert" tooltip={tooltip} size="sm" disabled={disabled} onClick={() => setOpen((v) => !v)} />
      )}
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {visibleItems.map((item) => (
            <button
              key={item.key || item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.tone === 'danger'
                  ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20'
                  : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              {item.icon && <span className="material-symbols-outlined text-[18px]">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
