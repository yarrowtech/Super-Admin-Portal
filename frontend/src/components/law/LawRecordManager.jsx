import React, { useState } from 'react';

const emptyForm = {
  title: '',
  description: '',
  status: 'Draft',
  priority: 'Medium',
  owner: '',
  dueDate: '',
  referenceNumber: '',
  notes: '',
  recordType: '',
  metadata: {},
};

const statusOptions = ['Draft', 'Pending', 'In Review', 'Active', 'Ready', 'Attention', 'Archived'];
const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

const formatDate = (value) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleDateString();
};

const LawRecordManager = ({
  section,
  records = [],
  saving,
  onSaveRecord,
  onDeleteRecord,
  title = 'Live Records',
  compact = false,
  recordTypes = [],
  metadataFields = [],
  labels = {},
}) => {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      section,
      tags: form.referenceNumber ? [form.referenceNumber] : [],
      metadata: {
        ...(form.metadata || {}),
        recordType: form.recordType,
      },
    };
    onSaveRecord?.(payload, editingId);
    resetForm();
  };

  const startEdit = (record) => {
    setEditingId(record._id);
    setForm({
      title: record.title || '',
      description: record.description || '',
      status: record.status || 'Draft',
      priority: record.priority || 'Medium',
      owner: record.owner || '',
      dueDate: record.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : '',
      referenceNumber: record.referenceNumber || '',
      notes: record.notes || '',
      recordType: record.metadata?.recordType || '',
      metadata: record.metadata || {},
    });
  };

  const updateMetadata = (field, value) => {
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        [field]: value,
      },
    }));
  };

  return (
    <section className={`grid grid-cols-1 gap-6 ${compact ? '' : 'lg:grid-cols-[380px,1fr]'}`}>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-neutral-900 dark:text-white">
            {editingId ? 'Edit Record' : 'Add Record'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm font-semibold text-primary">
              New
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {recordTypes.length > 0 && (
            <select
              value={form.recordType}
              onChange={(event) => setForm((prev) => ({ ...prev, recordType: event.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              required
            >
              <option value="">{labels.recordType || 'Select legal work type'}</option>
              {recordTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}
          <input
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            placeholder={labels.title || 'Record title'}
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            placeholder={labels.description || 'Description'}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.owner}
              onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder={labels.owner || 'Owner'}
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
          <input
            value={form.referenceNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, referenceNumber: event.target.value }))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            placeholder={labels.referenceNumber || 'Reference number'}
          />
          {metadataFields.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {metadataFields.map((field) => (
                <input
                  key={field.name}
                  type={field.type || 'text'}
                  value={form.metadata?.[field.name] || ''}
                  onChange={(event) => updateMetadata(field.name, event.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  placeholder={field.placeholder || field.label}
                />
              ))}
            </div>
          )}
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            placeholder={labels.notes || 'Notes'}
            rows={2}
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Record'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="font-bold text-neutral-900 dark:text-white">{title}</h2>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {records.length}
          </span>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {records.map((record) => (
            <article key={record._id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{record.title}</p>
                  {record.metadata?.recordType && (
                    <p className="mt-1 text-xs font-bold uppercase text-primary">{record.metadata.recordType}</p>
                  )}
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{record.description || 'No description'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                    <span>{record.owner || 'Unassigned'}</span>
                    <span>{formatDate(record.dueDate)}</span>
                    {record.referenceNumber && <span>{record.referenceNumber}</span>}
                    {metadataFields.slice(0, 3).map((field) =>
                      record.metadata?.[field.name] ? (
                        <span key={field.name}>{field.label}: {record.metadata[field.name]}</span>
                      ) : null
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{record.status}</span>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">{record.priority}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => startEdit(record)} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold dark:bg-neutral-800">
                  Edit
                </button>
                <button type="button" onClick={() => onDeleteRecord?.(record._id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!records.length && (
            <p className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No saved records yet. Create the first one from the form.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default LawRecordManager;
