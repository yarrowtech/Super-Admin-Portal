import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ConfirmDialogContext = createContext(null);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
};

export const ConfirmDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options?.title || 'Please confirm',
        message: options?.message || 'Are you sure you want to continue?',
        confirmLabel: options?.confirmLabel || 'Confirm',
        cancelLabel: options?.cancelLabel || 'Cancel',
        tone: options?.tone || 'danger',
        resolve,
      });
    });
  }, []);

  const close = useCallback(
    (result) => {
      if (dialog?.resolve) {
        dialog.resolve(result);
      }
      setDialog(null);
    },
    [dialog]
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="app-modal">
          <div className="app-modal-panel max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className={`mt-1 rounded-full p-2 ${dialog.tone === 'danger' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'}`}>
                <span className="material-symbols-outlined text-lg">{dialog.tone === 'danger' ? 'warning' : 'help'}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{dialog.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{dialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${dialog.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};
