import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import { departmentApi } from '../../services/departments';
import { uploadAssetBatch } from './bulkAssetUpload';

export const libraryField = 'mt-1 block w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950';
export const libraryButton = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-teal-200';
const csv = value => String(value || '').split(',').map(value => value.trim().replace(/^#/, '')).filter(Boolean);

export default function LibraryEditor({ token, project, categories, owners, tags = [], initialKind = 'creative', record, onClose, onSaved }) {
  const [kind, setKind] = useState(record?.libraryKind || initialKind);
  const [form, setForm] = useState({ title: record?.title || '', description: record?.description || '', subcategory: record?.subcategory || '', assetType: record?.assetType || '', tags: record?.tags?.join(', ') || '', ownerId: record?.ownerId || '', campaignId: record?.campaignId || '', usageRights: record?.usageRights || '', expiresAt: record?.expiresAt?.slice(0, 10) || '', versionNote: '', campaignStatus: record?.campaignStatus || 'Draft', platform: record?.social?.platform || '', contentType: record?.social?.contentType || 'Post', caption: record?.social?.caption || record?.metadata?.caption || '', hashtags: record?.social?.hashtags?.join(', ') || '', cta: record?.social?.cta || '', targetAudience: record?.social?.targetAudience || '', creativeAssetId: record?.social?.creativeAssetId || '', relatedIds: record?.relatedIds?.join(', ') || '' });
  const [entries, setEntries] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [relatedSearch, setRelatedSearch] = useState('');
  const relatedQuery = useQuery({ queryKey: ['media', 'library', 'related-picker', project.id, relatedSearch], queryFn: () => departmentApi.getMediaLibraryItems(token, { projectId: project.id, search: relatedSearch, limit: 50 }) });
  const relatedOptions = (relatedQuery.data?.data?.items || []).filter(item => item._id !== record?._id);
  const scopeQuery = useQuery({ queryKey: ['media', 'library', 'editor-owners', project.id], queryFn: () => departmentApi.getMediaLibraryOverview(token, { projectId: project.id }) });
  const projectOwners = scopeQuery.data?.data?.owners || owners;
  const category = categories.find(category => category.key === kind);
  const started = entries.some(entry => entry.uploaded || entry.status === 'complete');
  const campaignQuery = useQuery({ queryKey: ['media', 'library', 'campaign-picker', project.id, campaignSearch], queryFn: () => departmentApi.getMediaLibraryItems(token, { projectId: project.id, kind: 'campaigns', search: campaignSearch, limit: 50 }), enabled: kind !== 'campaigns' });
  const campaigns = campaignQuery.data?.data?.items || [];
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const addFiles = files => {
    if (busy || started) return;
    setEntries(previous => {
      const next = [...previous];
      for (const file of files) if (!next.some(entry => entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified)) next.push({ id: crypto.randomUUID(), file, title: file.name.replace(/\.[^.]+$/, ''), status: 'queued' });
      return record ? next.slice(-1) : next;
    });
  };
  const save = async () => {
    if (busy) return;
    if (kind === 'social' && !form.platform) { setError('Choose a social platform.'); return; }
    if (entries.some(entry => !entry.title.trim())) { setError('Give every file a title before uploading.'); return; }
    if (!form.title.trim() && !entries.length) { setError('Enter a title or choose files.'); return; }
    setBusy(true); setError('');
    const base = { projectId: project.id, libraryKind: kind, title: form.title.trim(), description: form.description, category: form.subcategory || category.label, subcategory: form.subcategory, assetType: form.assetType, tags: csv(form.tags), usageRights: form.usageRights, expiresAt: form.expiresAt || null, relatedIds: csv(form.relatedIds), ...(form.ownerId && { ownerId: form.ownerId }), ...(form.campaignId && { campaignId: form.campaignId }), campaignStatus: form.campaignStatus,
      ...(kind === 'social' && { social: { platform: form.platform, contentType: form.contentType, caption: form.caption, hashtags: csv(form.hashtags), cta: form.cta, targetAudience: form.targetAudience, ...(form.creativeAssetId && { creativeAssetId: form.creativeAssetId }) } }),
    };
    try {
      if (record) {
        let file = {};
        if (entries[0]) {
          const uploaded = entries[0].uploaded || (await departmentApi.uploadMediaFile(token, entries[0].file, { projectId: project.id, section: category.section })).data;
          setEntries(previous => [{ ...previous[0], uploaded }]);
          file = { storageUrl: uploaded.url, storageKey: uploaded.storageKey, storageProvider: uploaded.storageProvider, thumbnailUrl: uploaded.thumbnailUrl || '', mimeType: uploaded.mimeType || entries[0].file.type, fileSizeBytes: uploaded.fileSizeBytes || entries[0].file.size, originalName: entries[0].file.name };
        }
        await departmentApi.updateMediaLibraryItem(token, record._id, { ...base, ...file, expectedUpdatedAt: record.updatedAt, versionNote: form.versionNote || 'New revision' }); onSaved(); onClose();
      } else if (entries.length) {
        const result = await uploadAssetBatch({ entries, projectId: project.id, moduleType: category.section, category: base.category, description: base.description,
          uploadFile: (file, projectId) => departmentApi.uploadMediaFile(token, file, { projectId, section: category.section }),
          createAsset: payload => departmentApi.createMediaLibraryItem(token, { ...base, ...payload, libraryKind: kind, originalName: entries.find(entry => entry.title.trim() === payload.title)?.file.name }),
          onChange: changed => setEntries(previous => previous.map(entry => entry.id === changed.id ? changed : entry)), onCreated: onSaved,
        });
        if (result.every(entry => entry.status === 'complete')) setError('All files saved as drafts. You can close this window or review them in the library.');
      } else { await departmentApi.createMediaLibraryItem(token, base); onSaved(); onClose(); }
    } catch (error) { setError(error.message || 'Could not save library item.'); }
    finally { setBusy(false); }
  };
  const textField = (label, key, type = 'text') => <label className="text-sm font-semibold">{label}<input type={type} className={libraryField} value={form[key]} disabled={busy || started} onChange={event => update(key, event.target.value)} /></label>;
  return <Modal open title={record ? 'Edit / Create Version' : 'Add to Project Library'} description={`${project.name} · ${record ? 'Every edit creates a recoverable revision and returns to Draft.' : 'Choose what you are adding. Each file creates its own draft record.'}`} onClose={() => !busy && onClose()} className="sm:max-w-4xl" footer={<><button className={libraryButton} disabled={busy} onClick={onClose}>Close</button><button className={`${libraryButton} bg-teal-700 text-white`} disabled={busy || (!!entries.length && entries.every(entry => entry.status === 'complete'))} onClick={save}>{busy ? 'Saving…' : entries.some(entry => entry.status === 'failed') ? 'Retry unfinished files' : record ? 'Save New Version' : entries.length ? `Save ${entries.filter(entry => entry.status !== 'complete').length} files` : 'Create Draft'}</button></>}>
    <div className="space-y-4">
      <fieldset disabled={busy || started}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">What are you adding?<select aria-label="Library item type" className={libraryField} value={kind} disabled={!!record || busy || started} onChange={event => { setKind(event.target.value); update('subcategory', ''); }}>{categories.filter(category => category.section).map(category => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label>
        <label className="text-sm font-semibold">Subcategory<select className={libraryField} value={form.subcategory} disabled={busy || started} onChange={event => update('subcategory', event.target.value)}><option value="">Select subcategory</option>{category?.subcategories.map(value => <option key={value}>{value}</option>)}</select></label>
        {textField('Title', 'title')}{textField('Asset / content type', 'assetType')}
        <label className="text-sm font-semibold sm:col-span-2">Description / content<textarea className={libraryField} rows={3} value={form.description} disabled={busy || started} onChange={event => update('description', event.target.value)} /></label>
        <label className="text-sm font-semibold">Tags (comma separated)<input className={libraryField} list="project-library-tags" value={form.tags} onChange={event => update('tags', event.target.value)} /><datalist id="project-library-tags">{tags.map(tag => <option key={tag} value={tag} />)}</datalist></label>
        <label className="text-sm font-semibold">Owner<select className={libraryField} value={form.ownerId} disabled={busy || started} onChange={event => update('ownerId', event.target.value)}><option value="">Me</option>{projectOwners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
        {kind !== 'campaigns' ? <label className="text-sm font-semibold">Related campaign<input aria-label="Find campaign" className={libraryField} placeholder="Find campaign by title" value={campaignSearch} onChange={event => setCampaignSearch(event.target.value)} /><select className={libraryField} value={form.campaignId} disabled={busy || started} onChange={event => update('campaignId', event.target.value)}><option value="">No campaign</option>{form.campaignId && !campaigns.some(item => item._id === form.campaignId) ? <option value={form.campaignId}>Current campaign</option> : null}{campaigns.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label> : <label className="text-sm font-semibold">Campaign lifecycle<select className={libraryField} value={form.campaignStatus} onChange={event => update('campaignStatus', event.target.value)}>{['Draft', 'Planning', 'Active', 'Scheduled', 'Completed', 'Archived'].map(status => <option key={status}>{status}</option>)}</select></label>}
        {textField('Usage rights', 'usageRights')}{textField('Expiry date', 'expiresAt', 'date')}
        <label className="text-sm font-semibold">Related material<input aria-label="Find related material" className={libraryField} placeholder="Find by title" value={relatedSearch} onChange={event => setRelatedSearch(event.target.value)} /><select aria-label="Related material" multiple size={4} className={libraryField} value={csv(form.relatedIds)} disabled={busy || started} onChange={event => update('relatedIds', [...event.target.selectedOptions].map(option => option.value).join(','))}>{relatedOptions.map(item => <option key={item._id} value={item._id}>{item.title} ? {item.libraryKind}</option>)}</select><span className="text-xs font-normal text-slate-500">Select related material from this project. Use Ctrl / Cmd to select several.</span></label>
      </div>
      {kind === 'social' ? <fieldset className="rounded-xl border border-teal-200 p-4"><legend className="px-2 font-bold">Social content</legend><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Platform<select className={libraryField} value={form.platform} onChange={event => update('platform', event.target.value)}><option value="">Choose platform</option>{category?.subcategories.map(platform => <option key={platform}>{platform}</option>)}</select></label>
        <label className="text-sm font-semibold">Content type<select className={libraryField} value={form.contentType} onChange={event => update('contentType', event.target.value)}>{category?.contentTypes.map(type => <option key={type}>{type}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Caption<textarea rows={3} className={libraryField} value={form.caption} onChange={event => update('caption', event.target.value)} /></label>
        {textField('Hashtags', 'hashtags')}{textField('Call to action', 'cta')}{textField('Target audience', 'targetAudience')}<label className="text-sm font-semibold">Creative<select className={libraryField} value={form.creativeAssetId} onChange={event => update('creativeAssetId', event.target.value)}><option value="">No creative linked</option>{form.creativeAssetId && !relatedOptions.some(item => item._id === form.creativeAssetId) ? <option value={form.creativeAssetId}>Current creative</option> : null}{relatedOptions.filter(item => ['creative', 'brand'].includes(item.libraryKind)).map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label>
      </div></fieldset> : null}
      {record ? textField('Change description', 'versionNote') : null}
      </fieldset>
      <div className="rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 p-4 dark:bg-teal-950/30" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addFiles([...event.dataTransfer.files]); }}>
        <label className="font-semibold">{record ? 'Replace file (previous file stays in Version History)' : 'Choose files or drop them here — files are optional for content and campaigns'}<input aria-label="Library files" className="mt-2 block w-full text-sm" type="file" multiple={!record} disabled={busy || started} onChange={event => { addFiles([...event.target.files]); event.target.value = ''; }} accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.mov,.webm,.avi,.pdf,.txt,.zip,.docx,.pptx" /></label>
      </div>
      {entries.map(entry => <div key={entry.id} className="rounded-xl border p-3 text-sm"><p className="break-all">{entry.file.name} · {entry.status}{entry.error ? ` · ${entry.error}` : ''}</p><input aria-label={`Title for ${entry.file.name}`} className={libraryField} value={entry.title} disabled={busy || entry.status === 'complete'} onChange={event => setEntries(previous => previous.map(item => item.id === entry.id ? { ...item, title: event.target.value } : item))} /></div>)}
      {error ? <p role="status" className="text-sm text-amber-700">{error}</p> : null}
    </div>
  </Modal>;
}
