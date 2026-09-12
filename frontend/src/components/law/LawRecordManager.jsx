import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../common/Button';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { useToast } from '../../context/ToastContext';

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

const statusOptions = ['Draft', 'Pending', 'In Review', 'Active', 'Ready', 'Attention', 'Archived'].map((s) => ({ value: s, label: s }));
const priorityOptions = ['Low', 'Medium', 'High', 'Critical'].map((p) => ({ value: p, label: p }));

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{children}</p>
);

const buildFormFromRecord = (record) => {
  if (!record) return emptyForm;
  return {
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
  };
};

// Remounted by the parent (via a `key` tied to formOpen + the editing record id)
// whenever a new create/edit session starts, so form state initializes fresh
// from props here rather than being synced in an effect.
const LawRecordManager = ({
  section,
  saving,
  onSaveRecord,
  title = 'Live Records',
  recordTypes = [],
  metadataFields = [],
  labels = {},
  actionLabel = 'Create Record',
  formOpen = false,
  editingRecord = null,
  onFormClose,
}) => {
  const { confirm } = useConfirmDialog();
  const toast = useToast();
  const [form, setForm] = useState(() => buildFormFromRecord(editingRecord));
  const [initialForm] = useState(() => buildFormFromRecord(editingRecord));
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const editingId = editingRecord?._id || null;

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm) || referenceFiles.length > 0,
    [form, initialForm, referenceFiles]
  );

  const requestClose = async () => {
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard unsaved changes?',
        message: 'The details you entered for this record have not been saved yet.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'warning',
      });
      if (!discard) return;
    }
    setSubmitError('');
    onFormClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
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
      toast.success(editingId ? 'Record updated successfully.' : 'Record created successfully.');
      onFormClose?.();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to save record');
    }
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

  const gridClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
  const fullSpan = 'sm:col-span-2';

  return (
    <Modal
      open={formOpen}
      onClose={requestClose}
      title={editingId ? 'Edit Record' : actionLabel}
      description={editingId ? 'Update the details for this record.' : `Add a new ${(labels.title || 'record').toLowerCase()} to ${title.toLowerCase()}.`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="law-record-form" variant="accent" disabled={saving}>
            {saving ? (editingId ? 'Saving…' : 'Creating…') : (editingId ? 'Save Changes' : actionLabel)}
          </Button>
        </div>
      }
    >
      <form id="law-record-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <SectionLabel>Basic Information</SectionLabel>
          <div className={gridClass}>
            {recordTypes.length > 0 && (
              <Select
                label={<>{labels.recordType || 'Record type'} <span className="text-rose-500">*</span></>}
                required
                value={form.recordType}
                onChange={(event) => setForm((prev) => ({ ...prev, recordType: event.target.value }))}
                options={[{ value: '', label: `Select ${(labels.recordType || 'type').toLowerCase()}` }, ...recordTypes.map((t) => ({ value: t, label: t }))]}
              />
            )}
            <Input
              label={<>{labels.referenceNumber || 'Reference number'}</>}
              value={form.referenceNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, referenceNumber: event.target.value }))}
              placeholder={labels.referenceNumber || 'Reference number'}
            />
            <div className={fullSpan}>
              <Input
                label={<>{labels.title || 'Title'} <span className="text-rose-500">*</span></>}
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={labels.title || 'Record title'}
              />
            </div>
            <div className={fullSpan}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{labels.description || 'Description'}</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  placeholder={labels.description || 'Description'}
                  className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <SectionLabel>Ownership &amp; Lifecycle</SectionLabel>
          <div className={gridClass}>
            <Input
              label={labels.owner || 'Owner'}
              value={form.owner}
              onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}
              placeholder={labels.owner || 'Owner'}
            />
            <Input
              type="date"
              label="Due date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              options={statusOptions}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              options={priorityOptions}
            />
          </div>
        </div>

        {metadataFields.length > 0 && (
          <div className="space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
            <SectionLabel>Lifecycle Details</SectionLabel>
            <div className={gridClass}>
              {metadataFields.map((field) => (
                <Input
                  key={field.name}
                  type={field.type || 'text'}
                  label={field.label}
                  value={form.metadata?.[field.name] || ''}
                  onChange={(event) => updateMetadata(field.name, event.target.value)}
                  placeholder={field.placeholder || field.label}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <SectionLabel>Documents</SectionLabel>
          <label className="relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center transition hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-950">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => setReferenceFiles(Array.from(event.target.files || []))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className="material-symbols-outlined text-[22px] text-neutral-400">upload_file</span>
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Drop files here or browse
            </span>
            <span className="text-[11px] text-neutral-400">PDF only • multiple files allowed</span>
          </label>
          {referenceFiles.length > 0 && (
            <div className="space-y-1.5">
              {referenceFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900">
                  <span className="min-w-0 flex-1 truncate font-medium text-neutral-700 dark:text-neutral-200" title={file.name}>{file.name}</span>
                  <span className="shrink-0 text-neutral-400">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => setReferenceFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="shrink-0 rounded-md px-1.5 py-0.5 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <SectionLabel>Notes</SectionLabel>
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            rows={2}
            placeholder={labels.notes || 'Notes'}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {submitError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {submitError}
          </div>
        ) : null}
      </form>
    </Modal>
  );
};

export default LawRecordManager;
