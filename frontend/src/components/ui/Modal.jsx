import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import Button from './Button';

const Modal = ({ open, title, description, children, onClose, footer, className }) => {
  if (!open) return null;

  // Rendered into <body> via a portal so the overlay's `position: fixed` always
  // resolves against the viewport. Inside the normal tree it would be trapped by
  // any ancestor with a transform/filter/will-change (e.g. `.portal-content`'s
  // page-enter animation), leaving the modal mis-anchored on a scrolled page.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className={cn('max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-2xl sm:rounded-2xl', className)}>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100">{title}</h2>
            {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined text-lg">close</span>
          </Button>
        </div>
        <div className="p-4 lg:p-5">{children}</div>
        {footer && <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
