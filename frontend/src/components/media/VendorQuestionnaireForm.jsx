import React, { useEffect, useMemo, useState } from 'react';
import { departmentApi } from '../../services/departments';
import { fallbackSalesAssessmentQuestions } from './salesAssessmentQuestions';
import { PRODUCT_CATEGORY_GROUPS, formatProductCategorySelection } from './productCategoryOptions';
import { loadDraft, clearDraft, useDraftAutosave, relativeSavedLabel } from './useDraftAutosave';

const SECTIONS = [
  { id: 'general', label: 'General Information', icon: 'apartment', color: '#6366f1' },
  { id: 'products', label: 'Product & Quality', icon: 'inventory_2', color: '#0ea5e9' },
  { id: 'commercial', label: 'Commercial Details', icon: 'credit_card', color: '#f59e0b' },
  { id: 'brand', label: 'Brand & Collaboration', icon: 'storefront', color: '#10b981' },
  { id: 'assessment', label: 'Sales Assessment', icon: 'quiz', color: '#ec4899' },
];

const PAYMENT_TERMS = ['ADVANCE', 'PDC', 'CREDIT 45 - 60 DAYS'];
const BRAND_SECTIONS = ['CITI MART', 'RAPHAAA', 'NP', 'MIX'];

const INP = 'block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--portal-accent)]/40 dark:border-neutral-800 dark:bg-neutral-950';
const INP_ERROR = 'border-rose-400 focus:ring-2 focus:ring-rose-300/50 dark:border-rose-500';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FieldError = ({ message }) => (!message ? null : (
  <p className="text-[11px] font-semibold text-rose-500">{message}</p>
));

const Field = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{label}</label>
    <div className="relative">
      {icon && (
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">
          {icon}
        </span>
      )}
      {React.cloneElement(children, { className: `${children.props.className || ''} ${icon ? 'pl-9' : ''}` })}
    </div>
  </div>
);

const OptionPill = ({ active, color, onClick, children, wide }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${wide ? 'flex-1 text-center' : ''} ${
      active
        ? 'border-transparent text-white shadow-sm'
        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
    }`}
    style={active ? { backgroundColor: color } : {}}
  >
    {children}
  </button>
);

const SectionCard = ({ section, children }) => (
  <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
    <div className="mb-4 flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px]" style={{ color: section.color }}>{section.icon}</span>
      <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">{section.label}</h3>
    </div>
    {children}
  </div>
);

const emptyVendorForm = {
  businessName: '', buyerName: '', gstNumber: '', email: '', location: '',
  productCategories: [],
  moq: '', priceRange: '', leadTime: '', paymentTerms: '',
  brandSection: '', onlineCollaboration: '', notes: '',
};

const VendorQuestionnaireForm = ({ token, project, projects = [], category, userId, onSubmitted }) => {
  const draftKey = `salesQueryDraft:vendor:${userId || 'anon'}:${project.code}:${category.id}`;
  const draft = useMemo(() => loadDraft(draftKey), [draftKey]);

  const [form, setForm] = useState(() => ({ ...emptyVendorForm, ...(draft?.value?.form || {}) }));
  const [openProductCategories, setOpenProductCategories] = useState([]);
  const [phones, setPhones] = useState(() => draft?.value?.phones?.length ? draft.value.phones : ['']);
  const [brandNames, setBrandNames] = useState(() => draft?.value?.brandNames?.length ? draft.value.brandNames : ['']);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [answers, setAnswers] = useState(() => draft?.value?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);

  const savedAt = useDraftAutosave(draftKey, { form, phones, brandNames, answers }, !submitting);

  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    setQuestionsLoading(true);
    departmentApi
      .getSalesQuestions(token, { projectCode: project.code })
      .then((response) => {
        const payload = response?.data?.data || response?.data || {};
        const rows = Array.isArray(payload.questions) ? payload.questions : [];
        if (alive) setQuestions(rows.length ? rows : fallbackSalesAssessmentQuestions());
      })
      .catch(() => {
        if (alive) setQuestions(fallbackSalesAssessmentQuestions());
      })
      .finally(() => {
        if (alive) setQuestionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, project.code]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const toggleProductGroup = (label) => setOpenProductCategories((prev) =>
    prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
  );

  const toggleProductCategory = (category, subcategory) => setForm((prev) => {
    const value = formatProductCategorySelection(category, subcategory);
    return {
    ...prev,
    productCategories: prev.productCategories.includes(value)
      ? prev.productCategories.filter((c) => c !== value)
      : [...prev.productCategories, value],
    };
  });

  const setPhone = (idx, value) => setPhones((prev) => prev.map((p, i) => (i === idx ? value.replace(/\D/g, '').slice(0, 10) : p)));
  const addPhone = () => setPhones((prev) => [...prev, '']);
  const removePhone = (idx) => setPhones((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const setBrandName = (idx, value) => setBrandNames((prev) => prev.map((b, i) => (i === idx ? value : b)));
  const addBrandName = () => setBrandNames((prev) => [...prev, '']);
  const removeBrandName = (idx) => setBrandNames((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const jpegFiles = files.filter((f) => f.type === 'image/jpeg');
    const rejected = files.length - jpegFiles.length;
    setImages((prev) => [...prev, ...jpegFiles]);
    setPreviews((prev) => [...prev, ...jpegFiles.map((f) => ({ name: f.name, size: f.size, url: URL.createObjectURL(f), type: f.type }))]);
    setSubmitError(rejected > 0 ? `${rejected} file(s) skipped — only JPG/JPEG photos are allowed.` : '');
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => String(value || '').trim()).length,
    [answers]
  );
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const fieldErrors = useMemo(() => {
    const errors = {};
    if (!form.businessName.trim()) errors.businessName = 'Business / Company name is required.';
    if (!form.buyerName.trim()) errors.buyerName = 'Contact person is required.';
    const filledPhones = phones.map((p) => p.trim()).filter(Boolean);
    if (filledPhones.length === 0) errors.phones = 'At least one phone number is required.';
    else if (filledPhones.some((p) => p.length !== 10)) errors.phones = 'Each phone number must be exactly 10 digits.';
    if (!form.location.trim()) errors.location = 'Registered address is required.';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    return errors;
  }, [form.businessName, form.buyerName, form.location, form.email, phones]);

  const missingFields = useMemo(() => {
    const missing = Object.values(fieldErrors);
    if (images.length === 0) missing.push('At least one product image is required.');
    if (!form.moq.trim()) missing.push('MOQ is required.');
    if (!allAnswered) missing.push('All assessment questions must be answered.');
    return missing;
  }, [fieldErrors, images.length, form.moq, allAnswered]);

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (missingFields.length > 0) {
      setSubmitError(`Please complete: ${missingFields.join(' ')}`);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('project', JSON.stringify({ code: project.code, name: project.name }));
      fd.append('projects', JSON.stringify(projects.length ? projects.map(({ code, name }) => ({ code, name })) : [{ code: project.code, name: project.name }]));
      fd.append('buyerCategory', category.label);
      fd.append('businessName', form.businessName.trim());
      fd.append('buyerName', form.buyerName.trim());
      fd.append('phones', JSON.stringify(phones.map((p) => p.trim()).filter(Boolean)));
      fd.append('gstNumber', form.gstNumber.trim());
      fd.append('email', form.email.trim());
      fd.append('location', form.location.trim());
      fd.append('brandNames', JSON.stringify(brandNames.map((b) => b.trim()).filter(Boolean)));
      fd.append('productCategories', JSON.stringify(form.productCategories));
      fd.append('moq', form.moq.trim());
      fd.append('priceRange', form.priceRange.trim());
      fd.append('leadTime', form.leadTime.trim());
      fd.append('paymentTerms', form.paymentTerms);
      fd.append('brandSection', form.brandSection);
      fd.append('onlineCollaboration', form.onlineCollaboration);
      fd.append('notes', form.notes.trim());
      fd.append('answers', JSON.stringify(questions.map((q) => ({ question: q.question, answer: answers[q._id] }))));
      images.forEach((img) => fd.append('images', img));

      await departmentApi.createSalesQuery(token, fd);
      clearDraft(draftKey);
      onSubmitted();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to submit questionnaire.');
    } finally {
      setSubmitting(false);
    }
  };

  const discardDraft = () => {
    clearDraft(draftKey);
    setForm(emptyVendorForm);
    setPhones(['']);
    setBrandNames(['']);
    setAnswers({});
    setDraftDismissed(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
          {project.name} &middot; {category.label}
        </p>
        {!draftDismissed && savedAt && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            <span className="material-symbols-outlined text-[14px]">cloud_done</span>
            {relativeSavedLabel(savedAt)}
            <button type="button" onClick={discardDraft} className="font-bold text-rose-500 hover:underline">
              Discard draft
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <SectionCard section={SECTIONS[0]}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
            <Field label="Business / Company Name *" icon="apartment">
              <input type="text" className={`${INP} ${submitAttempted && fieldErrors.businessName ? INP_ERROR : ''}`} placeholder="Company name" value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} />
            </Field>
            {submitAttempted && <FieldError message={fieldErrors.businessName} />}
            </div>
            <div>
            <Field label="Contact Person *" icon="person">
              <input type="text" className={`${INP} ${submitAttempted && fieldErrors.buyerName ? INP_ERROR : ''}`} placeholder="Full name" value={form.buyerName} onChange={(e) => setField('buyerName', e.target.value)} />
            </Field>
            {submitAttempted && <FieldError message={fieldErrors.buyerName} />}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Phone Number(s) *</label>
              <div className="space-y-2">
                {phones.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">call</span>
                      <input type="tel" className={`${INP} pl-9 ${submitAttempted && fieldErrors.phones ? INP_ERROR : ''}`} placeholder="10-digit mobile" maxLength={10}
                        value={p} onChange={(e) => setPhone(i, e.target.value)} />
                    </div>
                    {phones.length > 1 && (
                      <button type="button" onClick={() => removePhone(i)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addPhone} className="text-xs font-bold text-[var(--portal-accent)] hover:underline">
                  + Add another number
                </button>
              </div>
              {submitAttempted && <FieldError message={fieldErrors.phones} />}
            </div>

            <div>
            <Field label="Email (optional)" icon="mail">
              <input type="email" className={`${INP} ${submitAttempted && fieldErrors.email ? INP_ERROR : ''}`} placeholder="vendor@company.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </Field>
            {submitAttempted && <FieldError message={fieldErrors.email} />}
            </div>
            <div>
            <Field label="Registered Address *" icon="location_on">
              <input type="text" className={`${INP} ${submitAttempted && fieldErrors.location ? INP_ERROR : ''}`} placeholder="Full registered address" value={form.location} onChange={(e) => setField('location', e.target.value)} />
            </Field>
            {submitAttempted && <FieldError message={fieldErrors.location} />}
            </div>
            <Field label="GST Number" icon="badge">
              <input type="text" className={`${INP} uppercase`} placeholder="e.g. 22AAAAA0000A1Z5" value={form.gstNumber} onChange={(e) => setField('gstNumber', e.target.value.toUpperCase())} />
            </Field>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Buyer's Brand Name(s)</label>
              <div className="space-y-2">
                {brandNames.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" className={INP} placeholder="Brand name" value={b} onChange={(e) => setBrandName(i, e.target.value)} />
                    {brandNames.length > 1 && (
                      <button type="button" onClick={() => removeBrandName(i)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-rose-500 dark:hover:bg-neutral-800">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addBrandName} className="text-xs font-bold text-[var(--portal-accent)] hover:underline">
                  + Add another brand
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard section={SECTIONS[1]}>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Product Category (Select Multiple)</label>
              <div className="space-y-2">
                {PRODUCT_CATEGORY_GROUPS.map((group) => {
                  const open = openProductCategories.includes(group.label);
                  const selectedCount = group.subcategories.filter((sub) =>
                    form.productCategories.includes(formatProductCategorySelection(group.label, sub))
                  ).length;
                  return (
                    <div key={group.label} className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
                      <button
                        type="button"
                        onClick={() => toggleProductGroup(group.label)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      >
                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-100">{group.label}</span>
                        <span className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                          {selectedCount > 0 ? `${selectedCount} selected` : 'Select'}
                          <span className="material-symbols-outlined text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
                        </span>
                      </button>
                      {open && (
                        <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
                          {group.subcategories.map((sub) => {
                            const value = formatProductCategorySelection(group.label, sub);
                            return (
                              <OptionPill
                                key={value}
                                active={form.productCategories.includes(value)}
                                color={SECTIONS[1].color}
                                onClick={() => toggleProductCategory(group.label, sub)}
                              >
                                {sub}
                              </OptionPill>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {form.productCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.productCategories.map((cat) => (
                    <span key={cat} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Card Image &amp; Product Images <span className="text-rose-500">*</span>
              </label>
              <label htmlFor="vendor-file-upload" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 px-5 py-8 text-center transition hover:border-sky-400 hover:bg-sky-50/40 dark:border-neutral-800">
                <span className="material-symbols-outlined text-3xl text-sky-500">upload</span>
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  <span className="text-sky-500">Click to upload</span> or drag & drop
                </p>
                <p className="text-[11px] text-neutral-400">JPG / JPEG photos only — up to 10MB each</p>
              </label>
              <input id="vendor-file-upload" type="file" multiple accept="image/jpeg" className="hidden" onChange={handleFileChange} />

              {previews.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {previews.map((p, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800">
                        <img src={p.url} alt={p.name} className="h-20 w-full object-cover" />
                        <div className="border-t border-neutral-100 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
                          <p className="truncate text-[10px] text-neutral-500">{p.name}</p>
                          <p className="text-[10px] text-neutral-400">{(p.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button type="button" onClick={() => removeFile(i)}
                          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-emerald-600">✓ {previews.length} file(s) ready</p>
                </>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard section={SECTIONS[2]}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="MOQ (Minimum Order Qty) *" icon="inventory_2">
                <input type="text" className={INP} placeholder="e.g. 500 units" value={form.moq} onChange={(e) => setField('moq', e.target.value)} />
              </Field>
              <Field label="Price Range" icon="currency_rupee">
                <input type="text" className={INP} placeholder="e.g. ₹500 – ₹2000" value={form.priceRange} onChange={(e) => setField('priceRange', e.target.value)} />
              </Field>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                <span className="material-symbols-outlined text-[16px] text-neutral-400">schedule</span> Production Lead Time
              </label>
              <textarea rows={3} className={`${INP} resize-none`} placeholder="e.g. 15–20 days. Please provide details."
                value={form.leadTime} onChange={(e) => setField('leadTime', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Payment Terms</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PAYMENT_TERMS.map((term) => (
                  <OptionPill key={term} active={form.paymentTerms === term} color={SECTIONS[2].color} onClick={() => setField('paymentTerms', term)}>
                    {term}
                  </OptionPill>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard section={SECTIONS[3]}>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Brand Section</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BRAND_SECTIONS.map((brand) => (
                  <OptionPill key={brand} active={form.brandSection === brand} color={SECTIONS[3].color} onClick={() => setField('brandSection', brand)}>
                    {brand}
                  </OptionPill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Online Collaboration</label>
              <div className="flex gap-2">
                {['YES', 'No'].map((opt) => (
                  <OptionPill key={opt} active={form.onlineCollaboration === opt} color={SECTIONS[3].color} onClick={() => setField('onlineCollaboration', opt)} wide>
                    {opt}
                  </OptionPill>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard section={SECTIONS[4]}>
          {questionsLoading ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading assessment questions...</p>
          ) : questions.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">No assessment questions configured yet.</p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q._id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="mb-2 text-xs font-bold text-neutral-800 dark:text-neutral-100">
                    {index + 1}. {q.question}
                  </p>
                  {q.options?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((option) => {
                        const active = answers[q._id] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q._id]: option }))}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                              active
                                ? 'border-transparent text-white'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
                            }`}
                            style={active ? { backgroundColor: SECTIONS[4].color } : {}}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={answers[q._id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))}
                      placeholder="Enter remarks"
                      className={`${INP} resize-none text-xs`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <textarea placeholder="Additional notes (optional)" rows={3} className={`${INP} mt-4 resize-none`}
            value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{answeredCount}/{questions.length} questions answered</p>
        </SectionCard>
      </div>

      {submitError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" disabled={submitting} onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Submitting...' : 'Submit questionnaire'}
        </button>
      </div>
    </div>
  );
};

export default VendorQuestionnaireForm;
