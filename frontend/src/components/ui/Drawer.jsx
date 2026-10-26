import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import Button from './Button';

const Drawer = ({ open, title, children, onClose, side = 'right', className }) => {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const root = panelRef.current;
      if (!root || root.contains(document.activeElement)) return;
      root.querySelector(focusableSelector)?.focus?.();
    };
    window.setTimeout(focusFirst, 0);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll(focusableSelector) || [])
        .filter((n) => !n.disabled && n.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const placement = side === 'left' ? 'justify-start' : 'justify-end';
  const panelAnimation = side === 'left'
    ? 'drawer-in-left 280ms cubic-bezier(0.34,1.56,0.64,1) backwards'
    : 'drawer-in-right 280ms cubic-bezier(0.34,1.56,0.64,1) backwards';

  // Portaled to <body> so the `fixed` overlay always resolves against the
  // viewport, never a transformed ancestor (see Modal.jsx).
  return createPortal(
    <div
      className={cn('modal-backdrop-anim fixed inset-0 z-50 flex bg-black/50', placement)}
      style={{ animation: 'modal-backdrop-in 200ms ease-out backwards' }}
      role="dialog"
      aria-modal="true"
    >
      <aside
        ref={panelRef}
        style={{ animation: panelAnimation }}
        className={cn('drawer-panel-anim h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl dark:bg-neutral-900', className)}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100">{title}</h2>
          <Button variant="ghost" size="sm" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close drawer">
            <span className="material-symbols-outlined text-lg">close</span>
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </aside>
    </div>,
    document.body,
  );
};

export default Drawer;
