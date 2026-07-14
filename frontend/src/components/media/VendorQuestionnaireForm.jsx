import React, { useEffect, useMemo, useState } from 'react';
import { departmentApi } from '../../services/departments';
import { fallbackSalesAssessmentQuestions } from './salesAssessmentQuestions';
import { PRODUCT_CATEGORY_GROUPS, formatProductCategorySelection } from './productCategoryOptions';
import { loadDraft, clearDraft, useDraftAutosave, relativeSavedLabel } from './useDraftAutosave';
import { INP, INP_ERROR, Field, FieldError, OptionPill, SectionCard, DraftBadge, SubmitBar } from './salesFormUi';

const SECTIONS = [
  { id: 'general', label: 'General Information', icon: 'apartment', color: '#6366f1' },
  { id: 'products', label: 'Product & Quality', icon: 'inventory_2', color: '#0ea5e9' },
  { id: 'commercial', label: 'Commercial Details', icon: 'credit_card', color: '#f59e0b' },
  { id: 'brand', label: 'Brand & Collaboration', icon: 'storefront', color: '#10b981' },
  { id: 'assessment', label: 'Sales Assessment', icon: 'quiz', color: '#ec4899' },
];

const PAYMENT_TERMS = [
  { term: 'ADVANCE', discount: 30, icon: 'bolt', hint: 'Full payment before dispatch' },
  { term: 'PDC', discount: 15, icon: 'receipt_long', hint: 'Post-dated cheque' },
  { term: 'CREDIT 45 - 60 DAYS', discount: 5, icon: 'calendar_month', hint: 'Credit period of 45-60 days' },
];
const BRAND_SECTIONS = ['CITI MART', 'RAPHAAA', 'NP', 'MIX'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_REQUIRED_CHECKS = 9;

const emptyVendorForm = {
  businessName: '', buyerName: '', gstNumber: '', email: '', location: '', city: '', state: '', website: '',
  productCategories: [],
  moq: '', priceRange: '', leadTime: '', paymentTerms: '', paymentDiscount: '',
  brandSection: [], onlineCollaboration: '', notes: '',
};

const VendorQuestionnaireForm = ({ token, project, projects = [], category, userId, onSubmitted, onProgress }) => {
  const draftKey = `salesQueryDraft:vendor:${userId || 'anon'}:${project.code}:${category.id}`;
  const draft = useMemo(() => loadDraft(draftKey), [draftKey]);

  const [form, setForm] = useState(() => {
    const merged = { ...emptyVendorForm, ...(draft?.value?.form || {}) };
    if (!Array.isArray(merged.brandSection)) merged.brandSection = merged.brandSection ? [merged.brandSection] : [];
    return merged;
  });
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

  const toggleBrandSection = (brand) => setForm((prev) => ({
    ...prev,
    brandSection: prev.brandSection.includes(brand)
      ? prev.brandSection.filter((b) => b !== brand)
      : [...prev.brandSection, brand],
  }));

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
    if (!form.city.trim()) errors.city = 'City is required.';
    if (!form.state.trim()) errors.state = 'State is required.';
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    return errors;
  }, [form.businessName, form.buyerName, form.location, form.city, form.state, form.email, phones]);

  const missingFields = useMemo(() => {
    const missing = Object.values(fieldErrors);
    if (images.length === 0) missing.push('At least one product image is required.');
    if (!form.moq.trim()) missing.push('MOQ is required.');
    if (!allAnswered) missing.push('All assessment questions must be answered.');
    return missing;
  }, [fieldErrors, images.length, form.moq, allAnswered]);

  const completedChecks = Math.max(0, TOTAL_REQUIRED_CHECKS - missingFields.length);

  const overallFillPct = useMemo(() => {
    const fixedFieldsFilled = [
      form.businessName.trim(),
      form.buyerName.trim(),
      phones.some((p) => p.trim()),
      form.email.trim(),
      form.location.trim(),
      form.city.trim(),
      form.state.trim(),
      form.gstNumber.trim(),
      form.website.trim(),
      brandNames.some((b) => b.trim()),
      form.productCategories.length > 0,
      images.length > 0,
      form.moq.trim(),
      form.priceRange.trim(),
      form.leadTime.trim(),
      Boolean(form.paymentTerms),
      form.brandSection.length > 0,
      Boolean(form.onlineCollaboration),
      form.notes.trim(),
    ].filter(Boolean).length;
    const totalFields = 19 + questions.length;
    const filledFields = fixedFieldsFilled + answeredCount;
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }, [form, phones, brandNames, images.length, questions.length, answeredCount]);

  useEffect(() => {
    onProgress?.(overallFillPct);
  }, [overallFillPct, onProgress]);

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
      fd.append('city', form.city.trim());
      fd.append('state', form.state.trim());
      fd.append('website', form.website.trim());
      fd.append('brandNames', JSON.stringify(brandNames.map((b) => b.trim()).filter(Boolean)));
      fd.append('productCategories', JSON.stringify(form.productCategories));
      fd.append('moq', form.moq.trim());
      fd.append('priceRange', form.priceRange.trim());
      fd.append('leadTime', form.leadTime.trim());
      const paymentDiscount = form.paymentDiscount.trim();
      fd.append('paymentTerms', form.paymentTerms && paymentDiscount ? `${form.paymentTerms} (${paymentDiscount}% discount)` : form.paymentTerms);
      fd.append('brandSection', JSON.stringify(form.brandSection));
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
      <div className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-accent-soft)]">
              <span className="material-symbols-outlined text-[20px] text-[var(--portal-accent)]">local_shipping</span>
            </span>
            <div>
              <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                {project.name} <span className="text-neutral-300 dark:text-neutral-700">&middot;</span> {category.label}
              </p>
              <p className="text-[11px] font-semibold text-neutral-400">Vendor onboarding questionnaire</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black text-[var(--portal-accent)]">{overallFillPct}% filled</span>
            <DraftBadge visible={!draftDismissed} savedAt={savedAt} relativeSavedLabel={relativeSavedLabel} onDiscard={discardDraft} />
          </div>
        </div>
        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-r-full bg-[var(--portal-accent)] transition-all duration-500 ease-out"
            style={{ width: `${overallFillPct}%` }}
          />
        </div>
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
            <Field label="Email" icon="mail">
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
            <div>
            <Field label="City *" icon="location_city">
              <input type="text" className={`${INP} ${submitAttempted && fieldErrors.city ? INP_ERROR : ''}`} placeholder="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
            </Field>
            {submitAttempted && <FieldError message={fieldErrors.city} />}
            </div>
            <div>
            <Field label="State *" icon="map">
              <input type="text" className={`${INP} ${submitAttempted && fieldErrors.state ? INP_ERROR : ''}`} placeholder="State" value={form.state} onChange={(e) => setField('state', e.target.value)} />
            </Field>
            {submitAttempted && <FieldError message={fieldErrors.state} />}
            </div>
            <Field label="GST Number" icon="badge">
              <input type="text" className={`${INP} uppercase`} placeholder="e.g. 22AAAAA0000A1Z5" value={form.gstNumber} onChange={(e) => setField('gstNumber', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Company Website" icon="language">
              <input type="url" className={INP} placeholder="https://www.company.com" value={form.website} onChange={(e) => setField('website', e.target.value)} />
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
                {PAYMENT_TERMS.map(({ term, discount, icon, hint }) => {
                  const active = form.paymentTerms === term;
                  return (
                    <button
                      key={term}
                      type="button"
                      title={hint}
                      onClick={() => setForm((prev) => ({ ...prev, paymentTerms: term, paymentDiscount: String(discount) }))}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'
                      }`}
                      style={active ? { backgroundColor: SECTIONS[2].color } : {}}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`material-symbols-outlined text-[18px] ${active ? 'text-white' : 'text-neutral-400'}`}>{icon}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          active ? 'bg-white/25 text-white' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {discount}% OFF
                        </span>
                      </div>
                      <p className={`mt-2 text-xs font-black ${active ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}`}>{term}</p>
                    </button>
                  );
                })}
              </div>
              {form.paymentTerms && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  <span className="material-symbols-outlined text-[16px]">percent</span>
                  {form.paymentDiscount}% discount applies for {form.paymentTerms}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard section={SECTIONS[3]}>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Brand Section</label>
                <span className="text-[11px] font-semibold text-neutral-400">Select all that apply</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BRAND_SECTIONS.map((brand) => {
                  const active = form.brandSection.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleBrandSection(brand)}
                      className={`relative flex items-center justify-center rounded-xl border px-3 py-3 text-xs font-black transition ${
                        active
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
                      }`}
                      style={active ? { backgroundColor: SECTIONS[3].color } : {}}
                    >
                      {active && (
                        <span className="material-symbols-outlined absolute right-1 top-1 text-[14px]">check_circle</span>
                      )}
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Online Collaboration</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'YES', label: 'Yes', hint: 'Open to online collaboration', icon: 'check_circle' },
                  { value: 'No', label: 'No', hint: 'Not interested right now', icon: 'cancel' },
                ].map(({ value, label, hint, icon }) => {
                  const active = form.onlineCollaboration === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField('onlineCollaboration', value)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                        active
                          ? 'shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'
                      }`}
                      style={active ? { borderColor: SECTIONS[3].color, backgroundColor: `${SECTIONS[3].color}14` } : {}}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          active ? 'text-white' : 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                        }`}
                        style={active ? { backgroundColor: SECTIONS[3].color } : {}}
                      >
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-black ${active ? '' : 'text-neutral-700 dark:text-neutral-200'}`}
                          style={active ? { color: SECTIONS[3].color } : {}}
                        >
                          {label}
                        </p>
                        <p className="truncate text-[10px] text-neutral-400">{hint}</p>
                      </div>
                    </button>
                  );
                })}
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
          <textarea placeholder="Additional notes" rows={3} className={`${INP} mt-4 resize-none`}
            value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{answeredCount}/{questions.length} questions answered</p>
        </SectionCard>
      </div>

      {submitError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      )}

      <SubmitBar hint={`${completedChecks}/${TOTAL_REQUIRED_CHECKS} required items complete`}>
        <button type="button" disabled={submitting} onClick={handleSubmit}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {submitting ? 'Submitting...' : 'Submit questionnaire'}
        </button>
      </SubmitBar>
    </div>
  );
};

export default VendorQuestionnaireForm;
