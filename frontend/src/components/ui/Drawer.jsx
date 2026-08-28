import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import Button from './Button';

const Drawer = ({ open, title, children, onClose, side = 'right', className }) => {
  if (!open) return null;

  const placement = side === 'left' ? 'justify-start' : 'justify-end';

  // Portaled to <body> so the `fixed` overlay always resolves against the
  // viewport, never a transformed ancestor (see Modal.jsx).
  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex bg-black/50', placement)} role="dialog" aria-modal="true">
      <aside className={cn('h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl dark:bg-neutral-900', className)}>
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
