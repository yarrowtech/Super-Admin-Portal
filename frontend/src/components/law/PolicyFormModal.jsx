import { useMemo, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelectCombobox from '../ui/MultiSelectCombobox';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';

const POLICY_TYPES = ['Privacy Policy', 'Data Protection Policy', 'Information Security Policy', 'Cookie Policy', 'Retention Policy', 'Acceptable Use Policy', 'Compliance Policy', 'Other'];
const AUDIENCES = ['Employees', 'Customers', 'Partners', 'Vendors', 'Users', 'Administrators', 'Contractors', 'Students', 'Providers', 'Other'];
const DATA_CATEGORIES = ['Personal Information', 'Financial Data', 'Usage Data', 'Location Data', 'Authentication Data', 'Payment Data', 'Health Data', "Children's Data", 'Employee Data', 'Customer Data', 'Vendor Data', 'Business Data', 'AI / ML Data', 'Sensitive Data', 'Legal / Compliance Data'];
const CADENCES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually', 'Biannually', 'Event-Driven', 'Custom'];
const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' }, { value: 'In Review', label: 'Under Review' },
  { value: 'Ready', label: 'Approved' }, { value: 'Active', label: 'Published' }, { value: 'Archived', label: 'Archived' },
];
const toOptions = (items) => items.map((value) => ({ value, label: value }));
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const VERSION_PATTERN = /^(?:v)?\d+(?:\.\d+){0,2}$/i;

const initialState = (record) => ({
  recordType: record?.metadata?.recordType || '',
  referenceNumber: record?.referenceNumber || '',
  title: record?.title || '', description: record?.description || '', owner: record?.owner || '',
  dueDate: record?.dueDate ? new Date(record.dueDate).toISOString().slice(0, 10) : '',
  status: record?.status || 'Draft', priority: record?.priority || 'Medium', notes: record?.notes || '',
  metadata: {
    ...(record?.metadata || {}),
    audience: Array.isArray(record?.metadata?.audience) ? record.metadata.audience : String(record?.metadata?.audience || '').split('/').map((v) => v.trim()).filter(Boolean),
    dataCategory: Array.isArray(record?.metadata?.dataCategory) ? record.metadata.dataCategory : String(record?.metadata?.dataCategory || '').split('/').map((v) => v.trim()).filter(Boolean),
    notificationMode: Array.isArray(record?.metadata?.notificationMode) ? record.metadata.notificationMode : String(record?.metadata?.notificationMode || '').split('/').map((v) => v.trim()).filter(Boolean),
  },
});

const Section = ({ title, help, children }) => <section className="space-y-4 border-t border-neutral-100 pt-6 first:border-0 first:pt-0 dark:border-neutral-800"><div><h3 className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-800 dark:text-neutral-100">{title}</h3>{help && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{help}</p>}</div>{children}</section>;
const FieldLabel = ({ children }) => <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{children}</span>;

export default function PolicyFormModal({ open, editingRecord, saving, projectId, projectName, onClose, onSave }) {
  const toast = useToast();
  const [form, setForm] = useState(() => initialState(editingRecord));
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const editing = Boolean(editingRecord?._id);
  const validProject = Boolean(projectId && projectName);
  const setMeta = (key, value) => setForm((prev) => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validation = useMemo(() => {
    const next = {};
    if (!form.recordType) next.recordType = 'Policy type is required.';
    if (form.title.trim().length < 3) next.title = 'Enter a policy title of at least 3 characters.';
    if (!form.status) next.status = 'Status is required.';
    if (!validProject) next.projectId = 'A valid project is required.';
    if (form.referenceNumber && !VERSION_PATTERN.test(form.referenceNumber.trim())) next.referenceNumber = 'Use a version such as 1.0, v1.0, or 2026.1.';
    if (form.metadata.effectiveDate && form.metadata.nextReviewDate && form.metadata.nextReviewDate < form.metadata.effectiveDate) next.nextReviewDate = 'Next review cannot be before the effective date.';
    if (form.metadata.reviewCadence === 'Custom' && !String(form.metadata.customReviewCadence || '').trim()) next.customReviewCadence = 'Describe the custom review cadence.';
    return next;
  }, [form, validProject]);

  const addFiles = (incoming) => {
    const accepted = [];
    const fileErrors = [];
    Array.from(incoming || []).forEach((file) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) fileErrors.push(`${file.name}: PDF files only.`);
      else if (file.size > MAX_FILE_SIZE) fileErrors.push(`${file.name}: exceeds 10 MB.`);
      else if (![...files, ...accepted].some((item) => item.name === file.name && item.size === file.size)) accepted.push(file);
    });
    setFiles((prev) => [...prev, ...accepted]);
    setErrors((prev) => ({ ...prev, files: fileErrors.join(' ') }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setErrors(validation);
    setSubmitError('');
    if (Object.keys(validation).length || saving) return;
    try {
      await onSave({ ...form, projectId, section: 'privacy-policy', tags: form.referenceNumber ? [form.referenceNumber] : [], referenceFiles: files, metadata: { ...form.metadata, recordType: form.recordType } }, editingRecord?._id || null);
      toast.success(editing ? 'Policy updated successfully.' : 'Policy created successfully.');
      onClose();
    } catch (error) { setSubmitError(error?.message || 'Failed to create policy. Please review the form and try again.'); }
  };

  const footer = validProject ? <div className="flex w-full items-center justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="policy-form" variant="accent" disabled={saving || Object.keys(validation).length > 0}>{saving ? <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>{editing ? 'Saving…' : 'Creating…'}</> : editing ? 'Save Changes' : 'Create Policy'}</Button></div> : <Button type="button" variant="secondary" onClick={onClose}>Close</Button>;

  return <Modal open={open} onClose={onClose} title={editing ? 'Edit Policy' : 'New Policy'} description={validProject ? `${editing ? 'Update' : 'Create and register'} a policy for ${projectName}.` : 'Unable to create policy'} footer={footer} className="w-[calc(100vw-24px)] max-h-[94dvh] sm:w-[calc(100vw-40px)] sm:max-h-[88dvh] sm:max-w-[820px]">
    {!validProject ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200"><p className="font-bold">A valid project is required before creating a policy.</p><p className="mt-1 text-xs opacity-80">Close this dialog and select a project from the policy register.</p></div> :
    <form id="policy-form" onSubmit={submit} noValidate className="space-y-7">
      <Section title="Policy Details" help="Define the policy identity and classification."><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Select label={<>Policy Type <span className="text-rose-600">*</span></>} value={form.recordType} onChange={(e) => setField('recordType', e.target.value)} options={[{ value: '', label: 'Select policy type' }, ...toOptions(POLICY_TYPES)]} error={errors.recordType}/><Input label="Policy Version" value={form.referenceNumber} onChange={(e) => setField('referenceNumber', e.target.value)} placeholder="e.g. 1.0" error={errors.referenceNumber}/><div className="sm:col-span-2"><Input autoFocus label={<>Policy Title <span className="text-rose-600">*</span></>} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Privacy and Data Protection Policy" error={errors.title}/></div><label className="sm:col-span-2"><FieldLabel>Policy Summary</FieldLabel><textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Briefly describe the purpose and scope of this policy." className="min-h-[88px] max-h-[140px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/20 dark:border-neutral-700 dark:bg-neutral-800"/></label></div></Section>
      <Section title="Ownership & Review"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label="Policy Owner" value={form.owner} onChange={(e) => setField('owner', e.target.value)} placeholder="Search or enter policy owner"/><Input type="date" label="Due Date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)}/><Select label={<>Status <span className="text-rose-600">*</span></>} value={form.status} onChange={(e) => setField('status', e.target.value)} options={STATUS_OPTIONS} error={errors.status}/><Select label="Priority" value={form.priority} onChange={(e) => setField('priority', e.target.value)} options={toOptions(['Low', 'Medium', 'High', 'Critical'])}/></div></Section>
      <Section title="Scope & Lifecycle"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><FieldLabel>Project <span className="text-rose-600">*</span></FieldLabel><div className="flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"><span className="material-symbols-outlined text-base text-[var(--portal-accent)]">lock</span><span className="truncate">{projectName}</span></div></div><MultiSelectCombobox label="Audience" options={toOptions(AUDIENCES)} value={form.metadata.audience || []} onChange={(v) => setMeta('audience', v)} triggerLabel="Select audiences"/><MultiSelectCombobox label="Data Category" options={toOptions(DATA_CATEGORIES)} value={form.metadata.dataCategory || []} onChange={(v) => setMeta('dataCategory', v)} triggerLabel="Select data categories"/><Input type="date" label="Effective Date" value={form.metadata.effectiveDate || ''} onChange={(e) => setMeta('effectiveDate', e.target.value)}/><Input type="date" label="Next Review Date" value={form.metadata.nextReviewDate || ''} onChange={(e) => setMeta('nextReviewDate', e.target.value)} error={errors.nextReviewDate}/><Select label="Review Cadence" value={form.metadata.reviewCadence || ''} onChange={(e) => setMeta('reviewCadence', e.target.value)} options={[{ value: '', label: 'Select cadence' }, ...toOptions(CADENCES)]}/>{form.metadata.reviewCadence === 'Custom' && <Input label="Custom Cadence" value={form.metadata.customReviewCadence || ''} onChange={(e) => setMeta('customReviewCadence', e.target.value)} placeholder="e.g. Every 18 months" error={errors.customReviewCadence}/>}<MultiSelectCombobox label="Notify Via" options={toOptions(['Email', 'In-App'])} value={form.metadata.notificationMode || []} onChange={(v) => setMeta('notificationMode', v)} triggerLabel="Select notification methods" helperText="SMS is unavailable in the current notification service."/></div></Section>
      <Section title="Documents" help="Attach supporting policy documents or evidence."><div onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }} className={`flex min-h-[138px] flex-col items-center justify-center rounded-xl border border-dashed px-5 py-5 text-center transition ${dragging ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]' : 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950'}`}><span className="material-symbols-outlined text-3xl text-[var(--portal-accent)]">upload_file</span><p className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">Drop PDF files here</p><p className="my-1 text-xs text-neutral-400">or</p><Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Browse Files</Button><input ref={inputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}/><p className="mt-2 text-[11px] text-neutral-400">PDF · Max 10 MB each</p></div>{errors.files && <p role="alert" className="text-xs font-medium text-rose-600">{errors.files}</p>}{files.length > 0 && <div className="space-y-2">{files.map((file, index) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"><span className="material-symbols-outlined text-lg text-rose-700">picture_as_pdf</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.name}</p><p className="text-[11px] text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB · {saving ? 'Uploading…' : 'Ready to upload'}</p></div><button type="button" disabled={saving} onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} className="rounded-md p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${file.name}`}><span className="material-symbols-outlined text-lg">close</span></button></div>)}</div>}</Section>
      <Section title="Internal Notes" help="Visible only to authorized Law Portal users."><textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Add review notes, approval context, or internal instructions." className="min-h-[88px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/20 dark:border-neutral-700 dark:bg-neutral-800"/></Section>
      {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200"><p className="font-bold">Failed to save policy.</p><p className="mt-0.5 text-xs">{submitError}</p></div>}
    </form>}
  </Modal>;
}
