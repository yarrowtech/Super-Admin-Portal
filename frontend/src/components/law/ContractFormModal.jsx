import { useMemo, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';

const STATUS_OPTIONS = ['Draft', 'In Review', 'Pending Approval', 'Approved', 'Active', 'Expired', 'Terminated', 'Archived'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp'];

const TYPE_CONFIG = {
  agreements: {
    noun: 'Agreement',
    partyA: 'Party A', partyB: 'Party B',
    scopeLabel: 'Agreement Purpose', scopePlaceholder: 'State the purpose and intended outcome.',
    details: [
      ['obligations', 'Obligations', 'Describe each party’s obligations.', 'textarea'],
      ['termsConditions', 'Terms & Conditions', 'Record the key contractual terms.', 'textarea'],
    ],
    endLabel: 'Expiry Date',
  },
  'work-hire': {
    noun: 'Work on Hire Contract',
    partyA: 'Employer / Client', partyB: 'Contractor / Freelancer',
    scopeLabel: 'Work Description', scopePlaceholder: 'Describe the commissioned work.',
    details: [
      ['deliverables', 'Deliverables', 'List expected deliverables.', 'textarea'],
      ['ipOwnership', 'Ownership of Work / IP', 'Describe ownership and transfer terms.', 'textarea'],
      ['compensation', 'Compensation', 'Describe the agreed compensation.'],
    ],
    endLabel: 'Deadline',
  },
  'third-party': {
    noun: 'Third Party Contract',
    partyA: 'Organization', partyB: 'Third Party Provider',
    scopeLabel: 'Service / Purpose', scopePlaceholder: 'Describe the service or engagement purpose.',
    details: [
      ['dataAccess', 'Data Access (if applicable)', 'Describe systems or data the provider may access.', 'textarea'],
      ['responsibilities', 'Responsibilities', 'Describe responsibilities and ownership.', 'textarea'],
      ['complianceRequirements', 'Compliance Requirements', 'List applicable compliance requirements.', 'textarea'],
      ['duration', 'Duration', 'e.g. 12 months'],
    ],
    endLabel: 'End Date',
  },
};

const toDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const initialState = (record, section, recordTypes) => ({
  title: record?.title || '',
  recordType: record?.metadata?.recordType || recordTypes[0] || '',
  referenceNumber: record?.referenceNumber || '',
  status: record?.status || 'Draft',
  priority: record?.priority || 'Medium',
  owner: record?.owner || '',
  description: record?.description || '',
  notes: record?.notes || '',
  dueDate: toDate(record?.dueDate),
  metadata: {
    ...(record?.metadata || {}),
    primaryParty: record?.metadata?.primaryParty || record?.metadata?.partyA || record?.metadata?.employer || record?.metadata?.organization || '',
    counterparty: record?.metadata?.counterparty || record?.metadata?.partyB || record?.metadata?.contractor || record?.metadata?.thirdPartyOrganization || '',
    startDate: toDate(record?.metadata?.startDate || record?.metadata?.effectiveDate),
    endDate: toDate(record?.metadata?.endDate || record?.metadata?.expiryDate || record?.metadata?.deadline),
  },
  section,
});

const options = (values) => values.map((value) => ({ value, label: value }));
const FieldLabel = ({ children }) => <span className="mb-1.5 block text-[13px] font-semibold text-neutral-700 dark:text-neutral-200">{children}</span>;
const Section = ({ title, help, children }) => <section className="space-y-4 border-t border-neutral-100 pt-6 first:border-0 first:pt-0 dark:border-neutral-800"><div><h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>{help && <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{help}</p>}</div>{children}</section>;
const TextArea = ({ label, value, onChange, placeholder, error, rows = 3 }) => <label className="block"><FieldLabel>{label}</FieldLabel><textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} aria-invalid={Boolean(error)} className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm leading-5 outline-none focus:ring-2 dark:bg-neutral-800 ${error ? 'border-rose-400 focus:ring-rose-200' : 'border-neutral-200 focus:border-[var(--portal-accent)] focus:ring-[var(--portal-accent)]/20 dark:border-neutral-700'}`}/>{error && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{error}</p>}</label>;

export default function ContractFormModal({ open, section, editingRecord, saving, projectId, projectName, recordTypes = [], onClose, onSave }) {
  const config = TYPE_CONFIG[section] || TYPE_CONFIG.agreements;
  const [form, setForm] = useState(() => initialState(editingRecord, section, recordTypes));
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const inputRef = useRef(null);
  const toast = useToast();
  const editing = Boolean(editingRecord?._id);
  const validProject = Boolean(projectId && projectName);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setMeta = (key, value) => setForm((prev) => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));

  const validation = useMemo(() => {
    const next = {};
    if (!validProject) next.projectId = 'Select a valid project before creating a contract.';
    if (form.title.trim().length < 3) next.title = 'Contract title is required.';
    if (!form.recordType) next.recordType = 'Contract type is required.';
    if (!form.status) next.status = 'Status is required.';
    if (!String(form.metadata.primaryParty || '').trim()) next.primaryParty = `${config.partyA} is required.`;
    if (!String(form.metadata.counterparty || '').trim()) next.counterparty = `${config.partyB} is required.`;
    if (!String(form.metadata.scope || '').trim()) next.scope = `${config.scopeLabel} is required.`;
    if (form.metadata.startDate && form.metadata.endDate && form.metadata.endDate < form.metadata.startDate) next.endDate = `${config.endLabel} cannot be before the start/effective date.`;
    if (form.metadata.renewalDate && form.metadata.startDate && form.metadata.renewalDate < form.metadata.startDate) next.renewalDate = 'Renewal date cannot be before the start/effective date.';
    return next;
  }, [config, form, validProject]);

  const addFiles = (incoming) => {
    const accepted = [];
    const rejected = [];
    Array.from(incoming || []).forEach((file) => {
      const extension = file.name.toLowerCase().split('.').pop();
      if (!ALLOWED_EXTENSIONS.includes(extension)) rejected.push(`${file.name}: unsupported file type.`);
      else if (file.size > MAX_FILE_SIZE) rejected.push(`${file.name}: exceeds 10 MB.`);
      else if (![...files, ...accepted].some((item) => item.name === file.name && item.size === file.size)) accepted.push(file);
    });
    setFiles((prev) => [...prev, ...accepted]);
    setErrors((prev) => ({ ...prev, files: rejected.join(' ') }));
  };

  const submit = async (event, forceDraft = false) => {
    event?.preventDefault?.();
    const nextErrors = validation;
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length || saving) return;
    try {
      await onSave({
        ...form,
        projectId,
        section,
        status: forceDraft ? 'Draft' : form.status,
        description: form.metadata.scope || form.description,
        dueDate: form.metadata.endDate || form.dueDate || undefined,
        referenceFiles: files,
        metadata: { ...form.metadata, recordType: form.recordType },
      }, editingRecord?._id || null);
      toast.success(editing ? 'Contract updated successfully.' : forceDraft ? 'Contract draft saved.' : 'Contract created successfully.');
      onClose();
    } catch (error) { setSubmitError(error?.message || 'Unable to save contract.'); }
  };

  const title = editing ? `Edit ${config.noun}` : `New ${config.noun}`;
  return <Modal open={open} onClose={onClose} title={title} description={validProject ? `${editing ? 'Update' : 'Create'} a ${config.noun.toLowerCase()} for ${projectName}.` : 'A selected project is required.'} className="w-[calc(100vw-24px)] max-h-[94dvh] sm:w-[calc(100vw-40px)] sm:max-h-[88dvh] sm:max-w-[820px]" footer={<div className="flex w-full flex-wrap items-center justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>{!editing && <Button type="button" variant="secondary" onClick={(event) => submit(event, true)} disabled={saving || !validProject}>{saving ? 'Creating…' : 'Save Draft'}</Button>}<Button type="submit" form="contract-record-form" variant="accent" disabled={saving || !validProject}>{saving ? 'Creating…' : editing ? 'Save Changes' : 'Create Contract'}</Button></div>}>
    {!validProject ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">Select a project from the Contracts page before creating a contract.</div> :
    <form id="contract-record-form" onSubmit={submit} noValidate className="space-y-7">
      <Section title="Contract Details" help="Identify and classify this contract."><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Input autoFocus label={<>Contract Title <span className="text-rose-600">*</span></>} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Enter a clear contract title" error={errors.title}/></div><Select label={<>Contract Type <span className="text-rose-600">*</span></>} value={form.recordType} onChange={(e) => setField('recordType', e.target.value)} options={[{ value: '', label: 'Select contract type' }, ...options(recordTypes)]} error={errors.recordType}/><Input label="Contract Number" value={form.referenceNumber} onChange={(e) => setField('referenceNumber', e.target.value)} placeholder="e.g. CTR-2026-001"/><Select label={<>Status <span className="text-rose-600">*</span></>} value={form.status} onChange={(e) => setField('status', e.target.value)} options={options(STATUS_OPTIONS)} error={errors.status}/><Select label="Priority" value={form.priority} onChange={(e) => setField('priority', e.target.value)} options={options(PRIORITY_OPTIONS)}/><div className="sm:col-span-2"><FieldLabel>Project <span className="text-rose-600">*</span></FieldLabel><div className="flex min-h-11 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold"><span className="material-symbols-outlined text-base text-[var(--portal-accent)]">lock</span>{projectName}</div>{errors.projectId && <p className="mt-1 text-xs text-rose-600">{errors.projectId}</p>}</div></div></Section>
      <Section title="Parties"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label={<>{config.partyA} <span className="text-rose-600">*</span></>} value={form.metadata.primaryParty || ''} onChange={(e) => setMeta('primaryParty', e.target.value)} error={errors.primaryParty}/><Input label={<>{config.partyB} <span className="text-rose-600">*</span></>} value={form.metadata.counterparty || ''} onChange={(e) => setMeta('counterparty', e.target.value)} error={errors.counterparty}/><Input label="Contact Person" value={form.metadata.contactPerson || ''} onChange={(e) => setMeta('contactPerson', e.target.value)}/><Input type="email" label="Email" value={form.metadata.email || ''} onChange={(e) => setMeta('email', e.target.value)}/><Input label="Phone" value={form.metadata.phone || ''} onChange={(e) => setMeta('phone', e.target.value)}/><Input label="Organization" value={form.metadata.organizationName || ''} onChange={(e) => setMeta('organizationName', e.target.value)}/></div></Section>
      <Section title="Scope & Terms"><TextArea label={<>{config.scopeLabel} <span className="text-rose-600">*</span></>} value={form.metadata.scope || ''} onChange={(e) => setMeta('scope', e.target.value)} placeholder={config.scopePlaceholder} error={errors.scope}/>{config.details.map(([key, label, placeholder, type]) => type === 'textarea' ? <TextArea key={key} label={label} value={form.metadata[key] || ''} onChange={(e) => setMeta(key, e.target.value)} placeholder={placeholder}/> : <Input key={key} label={label} value={form.metadata[key] || ''} onChange={(e) => setMeta(key, e.target.value)} placeholder={placeholder}/>)}</Section>
      <Section title="Dates & Lifecycle"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input type="date" label={section === 'agreements' ? 'Effective Date' : 'Start Date'} value={form.metadata.startDate || ''} onChange={(e) => setMeta('startDate', e.target.value)}/><Input type="date" label={config.endLabel} value={form.metadata.endDate || ''} onChange={(e) => setMeta('endDate', e.target.value)} error={errors.endDate}/><Input type="date" label="Renewal Date" value={form.metadata.renewalDate || ''} onChange={(e) => setMeta('renewalDate', e.target.value)} error={errors.renewalDate}/><Input type="date" label="Review Date" value={form.metadata.reviewDate || ''} onChange={(e) => setMeta('reviewDate', e.target.value)}/><Input label="Notice Period" value={form.metadata.noticePeriod || ''} onChange={(e) => setMeta('noticePeriod', e.target.value)} placeholder="e.g. 30 days"/></div></Section>
      <Section title="Financial Details" help="Optional for non-financial agreements."><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input type="number" min="0" label="Contract Value" value={form.metadata.contractValue || ''} onChange={(e) => setMeta('contractValue', e.target.value)}/><Select label="Currency" value={form.metadata.currency || 'INR'} onChange={(e) => setMeta('currency', e.target.value)} options={options(CURRENCIES)}/><Input label="Payment Terms" value={form.metadata.paymentTerms || ''} onChange={(e) => setMeta('paymentTerms', e.target.value)}/><Input label="Payment Frequency" value={form.metadata.paymentFrequency || ''} onChange={(e) => setMeta('paymentFrequency', e.target.value)}/><Input label="Tax / GST" value={form.metadata.taxGst || ''} onChange={(e) => setMeta('taxGst', e.target.value)}/><Input type="number" min="0" label="Security Deposit" value={form.metadata.securityDeposit || ''} onChange={(e) => setMeta('securityDeposit', e.target.value)}/><Input label="Penalty / Late Fee" value={form.metadata.penalty || ''} onChange={(e) => setMeta('penalty', e.target.value)}/><Input label="Other Charges" value={form.metadata.otherCharges || ''} onChange={(e) => setMeta('otherCharges', e.target.value)}/></div></Section>
      <Section title="Documents" help="Attach signed contracts, drafts, or supporting evidence."><div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center"><span className="material-symbols-outlined text-3xl text-[var(--portal-accent)]">upload_file</span><p className="mt-1 text-sm font-semibold">Drop files here or browse</p><Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>Browse Files</Button><input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}/><p className="mt-2 text-[11px] text-neutral-400">PDF, DOC, DOCX, PNG, JPG, WEBP · Maximum 10 MB each</p></div>{errors.files && <p role="alert" className="text-xs text-rose-600">{errors.files}</p>}{files.map((file, index) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2"><span className="material-symbols-outlined text-lg text-rose-700">description</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{file.name}</p><p className="text-[11px] text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB · {saving ? 'Uploading…' : 'Ready to upload'}</p></div><button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="rounded-md p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-700"><span className="material-symbols-outlined text-lg">close</span></button></div>)}</Section>
      <Section title="Internal Notes" help="Visible only to authorized Law Portal users."><TextArea label="Internal Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Add review notes, negotiation context, or internal instructions."/></Section>
      {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>}
    </form>}
  </Modal>;
}
