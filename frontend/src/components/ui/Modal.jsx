import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import Button from './Button';

const Modal = ({ open, title, description, children, onClose, footer, className }) => {
  const dialogRef = useRef(null);
  // Callers usually pass an inline onClose, which is a new function on every render. Keeping it
  // in a ref means the focus effect below runs only when the dialog opens — otherwise every
  // keystroke re-ran it and yanked focus out of the field being typed in.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    // Start in the first form field (not the header's close button) so users can type right away.
    const focusFirst = () => {
      const root = dialogRef.current;
      if (!root || root.contains(document.activeElement)) return;
      const field = root.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
      (field || root.querySelector(focusableSelector))?.focus?.();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll(focusableSelector) || [])
        .filter((node) => !node.disabled && node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.setTimeout(focusFirst, 0);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  // Rendered into <body> via a portal so the overlay's `position: fixed` always
  // resolves against the viewport. Inside the normal tree it would be trapped by
  // any ancestor with a transform/filter/will-change (e.g. `.portal-content`'s
  // page-enter animation), leaving the modal mis-anchored on a scrolled page.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div ref={dialogRef} className={cn('flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-2xl sm:rounded-2xl', className)}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100">{title}</h2>
            {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined text-lg">close</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-neutral-200 p-4 dark:border-neutral-800">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
