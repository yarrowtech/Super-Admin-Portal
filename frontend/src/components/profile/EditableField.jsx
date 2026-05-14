import React, { useState } from 'react';

const EditableField = ({ label, value, onSave, multiline = false, placeholder = '' }) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value || '');

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-primary">Edit</button>
        ) : null}
      </div>
      {!editing ? (
        <p className="text-sm text-neutral-800 dark:text-neutral-200">{value || 'Not set'}</p>
      ) : (
        <div className="space-y-2">
          {multiline ? (
            <textarea rows={3} value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          ) : (
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSave(local);
                setEditing(false);
              }}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button onClick={() => { setLocal(value || ''); setEditing(false); }} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold dark:border-neutral-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(EditableField);
