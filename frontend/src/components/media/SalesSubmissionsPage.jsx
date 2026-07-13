import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import PortalHeader from '../common/PortalHeader';
import SalesPortalLayout from './SalesPortalLayout';
import { SubmissionDetailModal } from './salesSubmissionShared';
import { formatDate, isVendorSubmission, projectDisplay } from './salesSubmissionUtils';

const cardClass = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const BASE_EDIT_FIELDS = [
  { key: 'businessName', label: 'Business / Vendor Name' },
  { key: 'buyerName', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
];

const VENDOR_EDIT_FIELDS = [
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'moq', label: 'MOQ' },
  { key: 'priceRange', label: 'Price Range' },
  { key: 'leadTime', label: 'Lead Time' },
  { key: 'paymentTerms', label: 'Payment Terms' },
  { key: 'brandSection', label: 'Brand Section' },
  { key: 'onlineCollaboration', label: 'Online Collaboration' },
];

const PRODUCT_CATEGORIES = ['MEN', 'WOMEN', 'KIDS', 'ALL'];

const EditSubmissionModal = ({ submission, saving, onClose, onSave }) => {
  const vendorForm = isVendorSubmission(submission);
  const fields = vendorForm ? [...BASE_EDIT_FIELDS, ...VENDOR_EDIT_FIELDS] : BASE_EDIT_FIELDS;

  const [form, setForm] = useState(() => ({
    businessName: submission.businessName || '',
    buyerName: submission.buyerName || '',
    email: submission.email || '',
    location: submission.location || '',
    gstNumber: submission.gstNumber || '',
    qualityRating: submission.qualityRating || 0,
    moq: submission.moq || '',
    priceRange: submission.priceRange || '',
    leadTime: submission.leadTime || '',
    paymentTerms: submission.paymentTerms || '',
    brandSection: submission.brandSection || '',
    onlineCollaboration: submission.onlineCollaboration || '',    
    notes: submission.notes || '',
  }));
  const [phones, setPhones] = useState(() =>
    submission.phones?.length ? submission.phones : (submission.phone ? [submission.phone] : [''])
  );
  const [productCategories, setProductCategories] = useState(() =>
    submission.productCategories?.length
      ? submission.productCategories
      : (submission.productCategory ? submission.productCategory.split(',').map((s) => s.trim()).filter(Boolean) : [])
  );
  const [brandNames, setBrandNames] = useState(() =>
    submission.brandNames?.length ? submission.brandNames : ['']
  );
  const [answers, setAnswers] = useState(() => (submission.answers || []).map((a) => ({ ...a })));

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setAnswer = (idx, value) => setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, answer: value } : a)));

  const setPhone = (idx, value) => setPhones((prev) => prev.map((p, i) => (i === idx ? value.replace(/\D/g, '').slice(0, 10) : p)));
  const addPhone = () => setPhones((prev) => [...prev, '']);
  const removePhone = (idx) => setPhones((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const toggleProductCategory = (cat) => setProductCategories((prev) =>
    prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
  );

  const setBrandName = (idx, value) => setBrandNames((prev) => prev.map((b, i) => (i === idx ? value : b)));
  const addBrandName = () => setBrandNames((prev) => [...prev, '']);
  const removeBrandName = (idx) => setBrandNames((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-neutral-900" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">Edit your submission</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-neutral-400">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-950"
                    />
                    {phones.length > 1 && (
                      <button type="button" onClick={() => removePhone(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addPhone} className="text-xs font-bold text-[var(--portal-accent)] hover:underline">
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
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-950"
                      />
                      {brandNames.length > 1 && (
                        <button type="button" onClick={() => removeBrandName(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBrandName} className="text-xs font-bold text-[var(--portal-accent)] hover:underline">
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
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-950"
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
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-950"
                />
              </div>
            )}
          </div>

          {vendorForm && (
            <div className="mt-3 space-y-1">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Product Category</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map((cat) => {
                  const active = productCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleProductCategory(cat)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? 'border-transparent bg-[var(--portal-accent)] text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-950"
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
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-950"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <button type="button" onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave({ ...form, phones: phones.map((p) => p.trim()).filter(Boolean), productCategories, brandNames: brandNames.map((b) => b.trim()).filter(Boolean), answers })}
            className="flex items-center gap-2 rounded-lg bg-[var(--portal-accent)] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesSubmissionsPage = () => {
  const { token, user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const loadSubmissions = () => {
    if (!token) return;
    setLoading(true);
    setError('');
    departmentApi
      .getSalesQueries(token, { mine: true, limit: 500 })
      .then((response) => {
        const payload = response?.data?.data || response?.data || {};
        const rows = Array.isArray(payload.queries) ? payload.queries : [];
        setSubmissions(rows);
      })
      .catch((err) => setError(err?.message || 'Failed to load your submissions.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSave = async (patch) => {
    if (!editItem) return;
    setSaving(true);
    setError('');
    try {
      const response = await departmentApi.updateSalesQuery(token, editItem._id, patch);
      const updated = response?.data?.data?.query || response?.data?.query;
      if (updated) {
        setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      }
      setEditItem(null);
    } catch (err) {
      setError(err?.message || 'Failed to save your submission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SalesPortalLayout activeId="submission">
      <PortalHeader title="My Submissions" icon="fact_check" user={user} />

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <section className={cardClass}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">Your submitted queries</h2>
          <span className="rounded-full bg-[var(--portal-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--portal-accent)]">
            {submissions.length} total
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-8 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-8 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
            <span className="material-symbols-outlined mb-2 text-3xl text-neutral-400">fact_check</span>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">No submissions yet</p>
            <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
              Submit a questionnaire from the Query section for each buyer or vendor you visit. They'll all show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((submission, i) => (
              <div
                key={submission._id}
                className="app-page-enter flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {submission.businessName || submission.buyerName || 'Unnamed buyer'}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {[projectDisplay(submission), submission.buyerCategory, formatDate(submission.createdAt)].filter(Boolean).join(' - ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewItem(submission)}
                    className="flex h-8 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem(submission)}
                    className="flex h-8 items-center justify-center rounded-full bg-[var(--portal-accent)] px-4 text-xs font-bold text-white transition hover:opacity-90"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SubmissionDetailModal submission={viewItem} onClose={() => setViewItem(null)} />
      {editItem && (
        <EditSubmissionModal
          submission={editItem}
          saving={saving}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
        />
      )}
    </SalesPortalLayout>
  );
};

export default SalesSubmissionsPage;
