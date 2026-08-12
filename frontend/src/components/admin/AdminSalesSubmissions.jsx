import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { departmentApi } from '../../services/departments';
import { CANONICAL_PROJECTS } from '../../config/projectNames';
import AdminSalesQuestionManager from './AdminSalesQuestionManager';
import { PRODUCT_CATEGORY_GROUPS, formatProductCategorySelection } from '../media/productCategoryOptions';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import IconButton from '../common/IconButton';
import Button from '../common/Button';
import Tabs from '../common/Tabs';

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const submitterName = (item) => {
  const u = item.submittedBy;
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email || '—';
};

const phoneDisplay = (item) => (item.phones?.length ? item.phones.join(', ') : item.phone);
const projectDisplay = (item) => (item.projects?.length ? item.projects.map((project) => project.name).filter(Boolean).join(', ') : item.project?.name);
const productCategoryDisplay = (item) => (item.productCategories?.length ? item.productCategories.join(', ') : item.productCategory);
const brandNamesDisplay = (item) => (item.brandNames?.length ? item.brandNames.join(', ') : '');

const csvEscape = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsv = (rows) => {
  const headers = [
    'Business / Vendor Name', 'Contact Person', 'Phone', 'GST Number', 'Website', 'Email', 'Location',
    'Product Name', 'Buyer Category', 'Product Category', 'Quality Rating',
    'MOQ', 'Price Range', 'Lead Time', 'Payment Terms', 'Brand Name(s)', 'Brand Section',
    'Online Collaboration', 'Notes', 'Submitted By', 'Submitted On', 'Assessment Answers', 'Image URLs',
  ];

  const lines = rows.map((item) => {
    const answers = (item.answers || []).map((a) => `${a.question}: ${a.answer}`).join(' | ');
    const images = (item.images || []).map((img) => img.url).join(' | ');
    return [
      item.businessName, item.buyerName, phoneDisplay(item), item.gstNumber, item.website, item.email, item.location,
      projectDisplay(item), item.buyerCategory, productCategoryDisplay(item), item.qualityRating,
      item.moq, item.priceRange, item.leadTime, item.paymentTerms, brandNamesDisplay(item), item.brandSection,
      item.onlineCollaboration, item.notes, submitterName(item), formatDate(item.createdAt), answers, images,
    ].map(csvEscape).join(',');
  });

  return [headers.map(csvEscape).join(','), ...lines].join('\r\n');
};

const downloadCsv = (csv, filename) => {
  const BOM = '﻿';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const DetailRow = ({ label, value }) =>
  !value ? null : (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="font-bold text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="max-w-[65%] text-right text-neutral-800 dark:text-neutral-100">{value}</span>
    </div>
  );

const SubmissionModal = ({ item, onClose }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div>
            <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">
              {item.businessName || item.buyerName || 'Submission'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {[projectDisplay(item), item.buyerCategory].filter(Boolean).join(' - ')} - by {submitterName(item)}
            </p>
          </div>
          <IconButton icon="close" tooltip="Close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {item.images?.length > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {item.images.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <img src={img.url} alt={img.name || `image-${i}`} className="h-16 w-full object-cover" />
                </a>
              ))}
            </div>
          )}

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <DetailRow label="Contact Person" value={item.buyerName} />
            <DetailRow label="Product Name" value={projectDisplay(item)} />
            <DetailRow label="Phone" value={phoneDisplay(item)} />
            <DetailRow label="GST Number" value={item.gstNumber} />
            <DetailRow label="Website" value={item.website} />
            <DetailRow label="Email" value={item.email} />
            <DetailRow label="Location" value={item.location} />
            <DetailRow label="City" value={item.city} />
            <DetailRow label="State" value={item.state} />
            <DetailRow label="Product Category" value={productCategoryDisplay(item)} />
            <DetailRow label="Quality Rating" value={item.qualityRating ? `${item.qualityRating}/5` : ''} />
            <DetailRow label="MOQ" value={item.moq} />
            <DetailRow label="Price Range" value={item.priceRange} />
            <DetailRow label="Lead Time" value={item.leadTime} />
            <DetailRow label="Payment Terms" value={item.paymentTerms} />
            <DetailRow label="Brand Name(s)" value={brandNamesDisplay(item)} />
            <DetailRow label="Brand Section" value={item.brandSection} />
            <DetailRow label="Online Collaboration" value={item.onlineCollaboration} />
            <DetailRow label="Notes" value={item.notes} />
            <DetailRow label="Submitted By" value={submitterName(item)} />
            <DetailRow label="Submitted On" value={formatDate(item.createdAt)} />
          </div>

          {item.answers?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black text-neutral-700 dark:text-neutral-300">Assessment answers</p>
              {item.answers.map((a, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
                  <p className="font-bold text-neutral-800 dark:text-neutral-100">{a.question}</p>
                  <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{a.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BASE_EDIT_FIELDS = [
  { key: 'businessName', label: 'Business / Vendor Name' },
  { key: 'buyerName', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'buyerCategory', label: 'Buyer Category' },
];

const VENDOR_EDIT_FIELDS = [
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'website', label: 'Website' },
  { key: 'moq', label: 'MOQ' },
  { key: 'priceRange', label: 'Price Range' },
  { key: 'leadTime', label: 'Lead Time' },
  { key: 'paymentTerms', label: 'Payment Terms' },
  { key: 'brandSection', label: 'Brand Section' },
  { key: 'onlineCollaboration', label: 'Online Collaboration' },
];

const isVendorSubmission = (item) =>
  item?.project?.code === 'ERMS' || item?.projects?.some((project) => project.code === 'ERMS');

const EditSubmissionModal = ({ item, onClose, onSave, saving }) => {
  const [form, setForm] = useState(() => ({
    businessName: item.businessName || '',
    buyerName: item.buyerName || '',
    email: item.email || '',
    location: item.location || '',
    buyerCategory: item.buyerCategory || '',
    gstNumber: item.gstNumber || '',
    website: item.website || '',
    qualityRating: item.qualityRating || 0,
    moq: item.moq || '',
    priceRange: item.priceRange || '',
    leadTime: item.leadTime || '',
    paymentTerms: item.paymentTerms || '',
    brandSection: item.brandSection || '',
    onlineCollaboration: item.onlineCollaboration || '',
    notes: item.notes || '',
  }));
  const [phones, setPhones] = useState(() =>
    item.phones?.length ? item.phones : (item.phone ? [item.phone] : [''])
  );
  const [projects, setProjects] = useState(() =>
    item.projects?.length ? item.projects : (item.project?.name ? [item.project] : [])
  );
  const [productCategories, setProductCategories] = useState(() =>
    item.productCategories?.length
      ? item.productCategories
      : (item.productCategory ? item.productCategory.split(',').map((s) => s.trim()).filter(Boolean) : [])
  );
  const [openProductCategories, setOpenProductCategories] = useState([]);
  const [brandNames, setBrandNames] = useState(() => (item.brandNames?.length ? item.brandNames : ['']));
  const [images, setImages] = useState(() => (item.images || []).map((image) => ({ ...image })));
  const [answers, setAnswers] = useState(() => (item.answers || []).map((a) => ({ ...a })));

  const vendorForm = item?.project?.code === 'ERMS' || projects.some((project) => project.code === 'ERMS');
  const fields = vendorForm ? [...BASE_EDIT_FIELDS, ...VENDOR_EDIT_FIELDS] : BASE_EDIT_FIELDS;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setAnswer = (idx, value) => setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, answer: value } : a)));

  const setPhone = (idx, value) => setPhones((prev) => prev.map((p, i) => (i === idx ? value.replace(/\D/g, '').slice(0, 10) : p)));
  const addPhone = () => setPhones((prev) => [...prev, '']);
  const removePhone = (idx) => setPhones((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const toggleProject = (project) => setProjects((prev) =>
    prev.some((item) => item.code === project.code)
      ? prev.filter((item) => item.code !== project.code)
      : [...prev, { code: project.code, name: project.name }]
  );

  const toggleProductGroup = (label) => setOpenProductCategories((prev) =>
    prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
  );

  const toggleProductCategory = (category, subcategory) => {
    const value = formatProductCategorySelection(category, subcategory);
    setProductCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
  );
  };

  const setBrandName = (idx, value) => setBrandNames((prev) => prev.map((b, i) => (i === idx ? value : b)));
  const addBrandName = () => setBrandNames((prev) => [...prev, '']);
  const removeBrandName = (idx) => setBrandNames((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const setImage = (idx, key, value) => setImages((prev) => prev.map((image, i) => (i === idx ? { ...image, [key]: value } : image)));
  const addImage = () => setImages((prev) => [...prev, { url: '', name: '', storageProvider: 'external' }]);
  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">Edit submission</h2>
          <IconButton icon="close" tooltip="Close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Product Name(s)</label>
            <div className="flex flex-wrap gap-2">
              {CANONICAL_PROJECTS.map((project) => {
                const active = projects.some((item) => item.code === project.code);
                return (
                  <button
                    key={project.code}
                    type="button"
                    onClick={() => toggleProject(project)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'border-transparent bg-primary text-white'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300'
                    }`}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Phone Number(s)</label>
              <div className="space-y-2">
                {phones.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="tel"
                      maxLength={10}
                      value={p}
                      onChange={(e) => setPhone(i, e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
                    />
                    {phones.length > 1 && (
                      <button type="button" onClick={() => removePhone(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addPhone} className="text-xs font-bold text-primary hover:underline text-primary">
                  + Add another number
                </button>
              </div>
            </div>

            {vendorForm && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Buyer's Brand Name(s)</label>
                <div className="space-y-2">
                  {brandNames.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={b}
                        onChange={(e) => setBrandName(i, e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
                      />
                      {brandNames.length > 1 && (
                        <button type="button" onClick={() => removeBrandName(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBrandName} className="text-xs font-bold text-primary hover:underline text-primary">
                    + Add another brand
                  </button>
                </div>
              </div>
            )}

            {fields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
                />
              </div>
            ))}
            {vendorForm && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Quality Rating (0-5)</label>
              <input
                type="number"
                min={0}
                max={5}
                value={form.qualityRating}
                onChange={(e) => setField('qualityRating', Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>
            )}
          </div>

          {vendorForm && (
            <div className="mt-3 space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Product Category (Select Multiple)</label>
              <div className="space-y-2">
                {PRODUCT_CATEGORY_GROUPS.map((group) => {
                  const open = openProductCategories.includes(group.label);
                  const selectedCount = group.subcategories.filter((sub) =>
                    productCategories.includes(formatProductCategorySelection(group.label, sub))
                  ).length;
                  return (
                    <div key={group.label} className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950">
                      <button
                        type="button"
                        onClick={() => toggleProductGroup(group.label)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                      >
                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-100">{group.label}</span>
                        <span className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                          {selectedCount > 0 ? `${selectedCount} selected` : 'Select'}
                          <span className="material-symbols-outlined text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
                        </span>
                      </button>
                      {open && (
                        <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-3 py-3 dark:border-neutral-700">
                          {group.subcategories.map((sub) => {
                            const value = formatProductCategorySelection(group.label, sub);
                            const active = productCategories.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleProductCategory(group.label, sub)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                  active
                                    ? 'border-transparent bg-primary text-white'
                                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                                }`}
                              >
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {productCategories.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {productCategories.map((cat) => (
                    <span key={cat} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary dark:bg-primary/20 text-primary">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          {answers.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black text-neutral-700 dark:text-neutral-300">Assessment answers</p>
              {answers.map((a, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
                  <p className="mb-1 text-xs font-bold text-neutral-800 dark:text-neutral-100">{a.question}</p>
                  <input
                    type="text"
                    value={a.answer}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-primary dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <Button variant="secondary" size="md" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            loading={saving}
            onClick={() => onSave({ ...form, phones: phones.map((p) => p.trim()).filter(Boolean), productCategories, brandNames: brandNames.map((b) => b.trim()).filter(Boolean), answers })}
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdminSalesSubmissions = () => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState('responses');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await departmentApi.getSalesQueries(token, { limit: 2000 });
      const payload = response?.data?.data || response?.data || {};
      setSubmissions(Array.isArray(payload.queries) ? payload.queries : []);
    } catch (err) {
      setError(err?.message || 'Failed to load sales submissions.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const projectOptions = useMemo(
    () => Array.from(new Set(submissions.flatMap((s) => (s.projects?.length ? s.projects : [s.project]).map((project) => project?.name).filter(Boolean)))),
    [submissions]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.buyerCategory).filter(Boolean))),
    [submissions]
  );

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return submissions.filter((item) => {
      if (filterProject && !(item.projects?.length ? item.projects : [item.project]).some((project) => project?.name === filterProject)) return false;
      if (filterCategory && item.buyerCategory !== filterCategory) return false;
      if (!term) return true;
      const haystack = [item.businessName, item.buyerName, phoneDisplay(item), item.gstNumber, item.email, item.location]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [submissions, searchTerm, filterProject, filterCategory]);

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = [
    { label: 'Total Submissions', count: submissions.length },
    { label: 'This Week', count: submissions.filter((s) => new Date(s.createdAt).getTime() >= oneWeekAgo).length },
    { label: 'Product Names', count: projectOptions.length },
    { label: 'Buyer Categories', count: categoryOptions.length },
  ];

  const handleExport = () => {
    if (filtered.length === 0) return;
    const csv = buildCsv(filtered);
    downloadCsv(csv, `sales-submissions-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Submissions exported.');
  };

  const handleSaveEdit = async (patch) => {
    if (!editItem) return;
    setSaving(true);
    try {
      const response = await departmentApi.updateSalesQuery(token, editItem._id, patch);
      const updated = response?.data?.data?.query || response?.data?.query;
      if (updated) {
        setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      }
      setEditItem(null);
      toast.success('Submission updated.');
    } catch (err) {
      const message = err?.message || 'Failed to save submission changes.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const label = item.businessName || item.buyerName || 'this buyer';
    const shouldProceed = await confirm({
      title: 'Delete submission?',
      message: `This will permanently delete the submission from "${label}". This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!shouldProceed) return;

    setDeletingId(item._id);
    try {
      await departmentApi.deleteSalesQuery(token, item._id);
      setSubmissions((prev) => prev.filter((s) => s._id !== item._id));
      toast.success(`Submission from "${label}" deleted.`);
    } catch (err) {
      const message = err?.message || 'Failed to delete submission.';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Sales Submissions"
          subtitle="Manage vendor and buyer questionnaire responses"
          icon="fact_check"
          showSearch={false}
          showNotifications={false}
          showThemeToggle={false}
        >
          <Button variant="secondary" size="md" className="min-h-11" onClick={fetchSubmissions} icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
            Refresh
          </Button>
          {activeTab === 'responses' && (
            <Button variant="primary" size="md" className="min-h-11" onClick={handleExport} disabled={filtered.length === 0} icon={<span className="material-symbols-outlined text-lg">download</span>}>
              Export CSV
            </Button>
          )}
        </PortalHeader>

        <Tabs
          className="mb-5"
          items={[
            { key: 'responses', label: 'Responses' },
            { key: 'questions', label: 'Manage Questions' },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'responses' && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {stats.map(({ label, count }) => (
                <KPICard key={label} title={label} value={count} icon="fact_check" compact />
              ))}
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="relative min-w-50 flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-400">search</span>
                <input
                  type="text"
                  placeholder="Search by name, phone, email, location…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="app-input pl-10 pr-9"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </div>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="min-h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <option value="">All Product Names</option>
                {projectOptions.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="min-h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <option value="">All Categories</option>
                {categoryOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </>
        )}
      {activeTab === 'questions' && <AdminSalesQuestionManager token={token} />}

      {activeTab === 'responses' && (
        <>
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white py-20 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <span className="material-symbols-outlined mb-3 text-5xl text-neutral-300 dark:text-neutral-600">fact_check</span>
              <h3 className="mb-1 text-base font-semibold text-neutral-700 dark:text-neutral-300">No submissions found</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Try adjusting your search or filters.</p>
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <>
              {/* Desktop/tablet table */}
              <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Business / Buyer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Product Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Submitted By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filtered.map((item) => (
                        <tr key={item._id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="px-4 py-3">
                            <p className="line-clamp-1 font-medium text-neutral-900 dark:text-neutral-100">
                              {item.businessName || item.buyerName || 'Unnamed'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{projectDisplay(item) || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold capitalize text-primary">
                              {item.buyerCategory || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{phoneDisplay(item) || item.email || '—'}</td>
                          <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{submitterName(item)}</td>
                          <td className="px-4 py-3 text-xs text-neutral-500">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <IconButton icon="visibility" tooltip="View submission" size="sm" onClick={() => setViewItem(item)} />
                              <IconButton icon="edit" tone="primary" tooltip="Edit submission" size="sm" onClick={() => setEditItem(item)} />
                              <IconButton icon="delete" tone="danger" tooltip="Delete submission" size="sm" loading={deletingId === item._id} onClick={() => handleDelete(item)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filtered.map((item) => (
                  <div key={item._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.businessName || item.buyerName || 'Unnamed'}
                        </p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{projectDisplay(item) || '—'}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold capitalize text-primary">
                        {item.buyerCategory || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {phoneDisplay(item) || item.email || '—'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      By {submitterName(item)} · {formatDate(item.createdAt)}
                    </p>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <IconButton icon="visibility" tooltip="View submission" onClick={() => setViewItem(item)} />
                      <IconButton icon="edit" tone="primary" tooltip="Edit submission" onClick={() => setEditItem(item)} />
                      <IconButton icon="delete" tone="danger" tooltip="Delete submission" loading={deletingId === item._id} onClick={() => handleDelete(item)} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <SubmissionModal item={viewItem} onClose={() => setViewItem(null)} />
      {editItem && (
        <EditSubmissionModal
          item={editItem}
          saving={saving}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
        />
      )}
      </div>
    </main>
  );
};

export default AdminSalesSubmissions;
