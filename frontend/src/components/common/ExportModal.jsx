import React, { useEffect, useState } from 'react';

const ExportModal = ({
  isOpen,
  onClose,
  title,
  description,
  selectedCount = 0,
  onExport,
  loadHistory,
  exporting = false,
}) => {
  const [scope, setScope] = useState(selectedCount > 0 ? 'selected' : 'current');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setScope(selectedCount > 0 ? 'selected' : 'current');
  }, [isOpen, selectedCount]);

  useEffect(() => {
    if (!isOpen || !loadHistory) return;

    const run = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError('');
        const data = await loadHistory();
        setHistory(data || []);
      } catch (err) {
        setHistoryError(err.message || 'Failed to load export history');
      } finally {
        setHistoryLoading(false);
      }
    };

    run();
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Export Scope</p>
              <div className="mt-3 space-y-3">
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === 'current'}
                    onChange={() => setScope('current')}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Current filtered results</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Exports whatever is currently filtered in the table.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 rounded-xl border p-3 ${selectedCount > 0 ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 opacity-50 dark:border-gray-800'}`}>
                  <input
                    type="radio"
                    name="export-scope"
                    checked={scope === 'selected'}
                    onChange={() => selectedCount > 0 && setScope('selected')}
                    disabled={selectedCount === 0}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Selected rows</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCount > 0 ? `${selectedCount} selected row(s) ready to export.` : 'Select rows in the table to use this option.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => onExport(scope)}
                disabled={exporting || (scope === 'selected' && selectedCount === 0)}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Download CSV'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recent Export History</p>

            {historyError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {historyError}
              </div>
            )}

            <div className="mt-3 space-y-3">
              {historyLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading export history...</p>}
              {!historyLoading && history.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No export history found.</p>}
              {!historyLoading &&
                history.map((item) => (
                  <div key={item._id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.fileName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {item.rowCount} rows • {item.scope} • {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
