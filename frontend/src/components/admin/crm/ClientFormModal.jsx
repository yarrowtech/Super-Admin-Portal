/**
 * The one client create/edit form.
 *
 * Lives in its own file because two modules now open it — the Clients table and
 * the project drill-down — and a second copy would be a second place for the
 * field list to drift from the CRMClient schema.
 *
 * `lockedProject` is what the project view passes: when a client is created from
 * inside a project, that project is not a choice, so the picker is replaced by a
 * fixed read-only row rather than a select the operator could change by accident.
 */
import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import Button from '../../common/Button';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import {
  apiFetch, DEPT_OPTIONS, PRIORITY_OPTIONS,
  StatusPicker, UserPicker, TextArea,
} from './crmShared';

export const BLANK_CLIENT = {
  name: '', contactPerson: '', email: '', phone: '', website: '', address: '',
  department: 'media', priority: 'medium', status: '', project: '', relatedProject: '',
  source: '', owner: '', campaignSource: '', marketingChannel: '', notes: '',
};

export default function ClientFormModal({
  open, onClose, onSaved, token, editData, statuses, users, projects = [],
  lockedProject = null, defaultDepartment,
}) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK_CLIENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        ...BLANK_CLIENT,
        ...editData,
        // Populated refs arrive as objects; the <select> needs the id.
        owner: editData.owner?._id || editData.owner || '',
        project: editData.project?._id || editData.project || '',
      });
    } else {
      // Default a new client to the first configured stage of its pipeline
      // rather than a hardcoded string that may not exist as a status.
      const defaultStage = statuses.find(s => s.isDefault)?.name || statuses[0]?.name || 'New Enquiry';
      setForm({
        ...BLANK_CLIENT,
        status: defaultStage,
        // 'all' is a filter value, never a storable department.
        ...(defaultDepartment && defaultDepartment !== 'all' ? { department: defaultDepartment } : {}),
        ...(lockedProject?._id ? { project: lockedProject._id } : {}),
      });
    }
  }, [editData, open, statuses, lockedProject, defaultDepartment]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // The locked project wins over whatever the form state holds, so a client
      // created inside a project can never land outside it.
      const payload = lockedProject?._id ? { ...form, project: lockedProject._id } : form;
      if (editData?._id) {
        await apiFetch(`/clients/${editData._id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Client updated');
      } else {
        await apiFetch('/clients', token, { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Client created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editData ? 'Edit Client' : 'Add New Client'}
      description={
        lockedProject
          ? `New client under ${lockedProject.projectName || lockedProject.name}`
          : 'Client or organisation managed by the Media / Marketing CRM'
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" type="submit" form="crm-client-form" loading={saving}>
            {editData ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      }
    >
      <form id="crm-client-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Client / Organisation Name *" name="name" required value={form.name} onChange={set('name')} placeholder="e.g. Acme Media Ltd" />
          </div>
          <Input label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={set('contactPerson')} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} />
          <Input label="Website" name="website" value={form.website} onChange={set('website')} />
          <Select
            label="Department *"
            name="department"
            required
            value={form.department}
            onChange={set('department')}
            options={DEPT_OPTIONS}
          />
          <Select
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={set('priority')}
            options={PRIORITY_OPTIONS}
          />
          <StatusPicker statuses={statuses} value={form.status} onChange={set('status')} label="Pipeline Status" />
          <UserPicker users={users} value={form.owner} onChange={set('owner')} label="Relationship Owner" name="owner" />

          {lockedProject ? (
            <div className="block">
              <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Project</span>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 dark:border-neutral-700 dark:bg-neutral-800/60">
                <span className="material-symbols-outlined text-[18px] text-neutral-400">folder_special</span>
                <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {lockedProject.projectName || lockedProject.name}
                </span>
              </div>
            </div>
          ) : (
            <Select
              label="Project"
              name="project"
              value={form.project}
              onChange={set('project')}
              options={[
                { value: '', label: '— No project —' },
                ...projects.map(p => ({ value: p._id, label: p.projectCode ? `${p.name} (${p.projectCode})` : p.name })),
              ]}
              helperText="Groups this client in the CRM by Project view"
            />
          )}

          <Input label="Related Project (free text)" name="relatedProject" value={form.relatedProject} onChange={set('relatedProject')} />
          <Input label="Client Source" name="source" value={form.source} onChange={set('source')} placeholder="e.g. Referral, Website, Campaign" />
          <Input label="Campaign Source" name="campaignSource" value={form.campaignSource} onChange={set('campaignSource')} placeholder="e.g. Q4 Brand Push" />
          <Input label="Marketing Channel" name="marketingChannel" value={form.marketingChannel} onChange={set('marketingChannel')} placeholder="e.g. LinkedIn, Email, Events" />
          <div className="sm:col-span-2">
            <Input label="Address" name="address" value={form.address} onChange={set('address')} />
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Notes" name="notes" rows={3} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
