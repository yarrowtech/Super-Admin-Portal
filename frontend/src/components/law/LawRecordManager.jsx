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
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setReferenceFiles([]);
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    if (!editingId && referenceFiles.length === 0) {
      setSubmitError('Please upload at least one reference PDF.');
      return;
    }
    const payload = {
      ...form,
      section,
      tags: form.referenceNumber ? [form.referenceNumber] : [],
      referenceFiles,
      metadata: {
        ...(form.metadata || {}),
        recordType: form.recordType,
      },
    };
    try {
      await onSaveRecord?.(payload, editingId);
      resetForm();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to save record');
    }
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
    setReferenceFiles([]);
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

  const fieldClass = 'h-11 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';
  const labelClass = 'mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300';

  return (
    <section className={`grid grid-cols-1 gap-6 ${compact ? '' : 'lg:grid-cols-[380px,1fr]'}`}>
      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">{editingId ? 'edit_note' : 'add_circle'}</span>
            </div>
            <h2 className="font-bold text-neutral-900 dark:text-white">
              {editingId ? 'Edit Record' : 'Add Record'}
            </h2>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm font-semibold text-primary hover:underline">
              New
            </button>
          )}
        </div>

        <div className="space-y-4 p-5">
          {recordTypes.length > 0 && (
            <div>
              <label className={labelClass}>{labels.recordType || 'Record type'} <span className="text-rose-500">*</span></label>
              <select
                value={form.recordType}
                onChange={(event) => setForm((prev) => ({ ...prev, recordType: event.target.value }))}
                className={fieldClass}
                required
              >
                <option value="">Select {(labels.recordType || 'type').toLowerCase()}</option>
                {recordTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>{labels.title || 'Title'} <span className="text-rose-500">*</span></label>
            <input
              required
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className={fieldClass}
              placeholder={labels.title || 'Record title'}
            />
          </div>

          <div>
            <label className={labelClass}>{labels.description || 'Description'}</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className={`${fieldClass} h-auto resize-none py-2.5`}
              placeholder={labels.description || 'Description'}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className={fieldClass}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                className={fieldClass}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{labels.owner || 'Owner'}</label>
              <input
                value={form.owner}
                onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}
                className={fieldClass}
                placeholder={labels.owner || 'Owner'}
              />
            </div>
            <div>
              <label className={labelClass}>Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{labels.referenceNumber || 'Reference number'}</label>
            <input
              value={form.referenceNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, referenceNumber: event.target.value }))}
              className={fieldClass}
              placeholder={labels.referenceNumber || 'Reference number'}
            />
          </div>

          {metadataFields.length > 0 && (
            <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Additional details</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {metadataFields.map((field) => (
                  <div key={field.name}>
                    <label className={labelClass}>{field.label}</label>
                    <input
                      type={field.type || 'text'}
                      value={form.metadata?.[field.name] || ''}
                      onChange={(event) => updateMetadata(field.name, event.target.value)}
                      className={fieldClass}
                      placeholder={field.placeholder || field.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>
              Reference PDFs {editingId ? '(optional on edit)' : <span className="text-rose-500">*</span>}
            </label>
            <label className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center transition hover:border-primary/50 hover:bg-primary/5 dark:border-neutral-700 dark:bg-neutral-950">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(event) => setReferenceFiles(Array.from(event.target.files || []))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                required={!editingId}
              />
              <span className="material-symbols-outlined text-[22px] text-neutral-400">upload_file</span>
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {referenceFiles.length > 0 ? `${referenceFiles.length} file(s) selected` : 'Click to upload PDF(s)'}
              </span>
              <span className="text-[11px] text-neutral-400">PDF only, multiple files allowed</span>
            </label>
          </div>

          <div>
            <label className={labelClass}>{labels.notes || 'Notes'}</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className={`${fieldClass} h-auto resize-none py-2.5`}
              placeholder={labels.notes || 'Notes'}
              rows={2}
            />
          </div>

          {submitError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
              {submitError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
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
                  {Array.isArray(record.metadata?.referencePdfs) && record.metadata.referencePdfs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {record.metadata.referencePdfs.map((pdf, idx) => (
                        <a
                          key={`${record._id}-pdf-${idx}`}
                          href={pdf.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          View PDF {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
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
