import React, { useMemo, useState } from 'react';
import { departmentApi } from '../../services/departments';

const INNER_STEPS = [
  { id: 'general', label: 'General', icon: 'apartment', color: '#6366f1' },
  { id: 'products', label: 'Products', icon: 'inventory_2', color: '#0ea5e9' },
  { id: 'commercial', label: 'Commercial', icon: 'credit_card', color: '#f59e0b' },
  { id: 'brand', label: 'Brand', icon: 'storefront', color: '#10b981' },
  { id: 'assessment', label: 'Assessment', icon: 'quiz', color: '#ec4899' },
];

const BUSINESS_TYPES = ['MANUFACTURER', 'WHOLE SELLER', 'EXPORTER', 'Other:'];
const PRODUCT_CATEGORIES = ['MEN', 'WOMEN', 'KIDS', 'ALL'];
const PAYMENT_TERMS = ['ADVANCE', 'PDC', 'CREDIT 45 - 60 DAYS'];
const BRAND_SECTIONS = ['CITI MART', 'RAPHAAA', 'NP', 'MIX'];

const MCQ_QUESTIONS = [
  { key: 'existingSystem', question: 'Do they currently use any similar software or system?', options: ['Yes', 'No', 'Not sure'] },
  { key: 'businessSize', question: 'Approximate business size (staff count)', options: ['1-5', '6-20', '21-50', '50+'] },
  { key: 'transactionVolume', question: 'Monthly transaction / order volume', options: ['Low (under 100)', 'Medium (100-500)', 'High (500+)'] },
  { key: 'budget', question: 'Estimated monthly budget for this service', options: ['Under ₹10,000', '₹10,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'] },
  { key: 'urgency', question: 'How urgent is their requirement?', options: ['Immediate', 'Within 1 month', 'Within 3 months', 'Just exploring'] },
  { key: 'demoInterest', question: 'Interested in a live product demo?', options: ['Yes', 'No', 'Maybe later'] },
  { key: 'decisionMaker', question: 'Was the decision maker met during this visit?', options: ['Yes, fully', 'Yes, partially', 'No'] },
  { key: 'interestLevel', question: 'Overall interest level after this visit', options: ['Very interested', 'Somewhat interested', 'Not interested'] },
];

const INP = 'block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--portal-accent)]/40 dark:border-neutral-800 dark:bg-neutral-950';

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

const InnerStepIndicator = ({ activeIndex }) => (
  <div className="mb-5 flex items-center justify-center gap-1.5">
    {INNER_STEPS.map((s, idx) => {
      const done = idx < activeIndex;
      const active = idx === activeIndex;
      return (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all"
              style={{ backgroundColor: done || active ? s.color : '#e2e8f0' }}
            >
              <span className={`material-symbols-outlined text-[16px] ${done || active ? 'text-white' : 'text-neutral-400'}`}>
                {done ? 'check' : s.icon}
              </span>
            </div>
            <span className={`text-[10px] font-bold ${active ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400'}`}>
              {s.label}
            </span>
          </div>
          {idx < INNER_STEPS.length - 1 && (
            <div className="mb-4 h-0.5 w-6 rounded-full" style={{ backgroundColor: idx < activeIndex ? s.color : '#e2e8f0' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const VendorQuestionnaireForm = ({ token, project, category, onChangeCategory, onSubmitted }) => {
  const [innerStep, setInnerStep] = useState(0);
  const [form, setForm] = useState({
    businessName: '', buyerName: '', phone: '', email: '', location: '',
    businessType: '', businessTypeOther: '',
    productCategory: '', qualityRating: 0,
    moq: '', priceRange: '', leadTime: '', paymentTerms: '',
    brandSection: '', onlineCollaboration: '', notes: '',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [stepError, setStepError] = useState('');

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size, url: URL.createObjectURL(f), type: f.type }))]);
    setStepError('');
  };

  const removeFile = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const allAnswered = answeredCount === MCQ_QUESTIONS.length;

  const activeStep = INNER_STEPS[innerStep];

  const goNext = () => {
    if (innerStep === 0 && !form.businessName.trim()) { setStepError('Vendor / business name is required'); return; }
    if (innerStep === 1 && images.length === 0) { setStepError('Please upload at least one image'); return; }
    if (innerStep === 2 && !form.moq.trim()) { setStepError('MOQ is required'); return; }
    setStepError('');
    setInnerStep((prev) => Math.min(prev + 1, INNER_STEPS.length - 1));
  };

  const goPrev = () => {
    setStepError('');
    setInnerStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!form.businessName.trim() || images.length === 0 || !form.moq.trim() || !allAnswered) {
      setStepError('Please complete all required fields (*) and answer every question');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('project', JSON.stringify({ code: project.code, name: project.name }));
      fd.append('buyerCategory', category.label);
      fd.append('businessName', form.businessName.trim());
      fd.append('buyerName', form.buyerName.trim());
      fd.append('phone', form.phone.trim());
      fd.append('email', form.email.trim());
      fd.append('location', form.location.trim());
      fd.append('businessType', form.businessType !== 'Other:' ? form.businessType : form.businessTypeOther);
      fd.append('productCategory', form.productCategory);
      fd.append('qualityRating', String(form.qualityRating));
      fd.append('moq', form.moq.trim());
      fd.append('priceRange', form.priceRange.trim());
      fd.append('leadTime', form.leadTime.trim());
      fd.append('paymentTerms', form.paymentTerms);
      fd.append('brandSection', form.brandSection);
      fd.append('onlineCollaboration', form.onlineCollaboration);
      fd.append('notes', form.notes.trim());
      fd.append('answers', JSON.stringify(MCQ_QUESTIONS.map((q) => ({ question: q.question, answer: answers[q.key] }))));
      images.forEach((img) => fd.append('images', img));

      await departmentApi.createSalesQuery(token, fd);
      onSubmitted();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to submit questionnaire.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
          {project.name} &middot; {category.label}
        </p>
        <button type="button" onClick={onChangeCategory} className="text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
          Change category
        </button>
      </div>

      <InnerStepIndicator activeIndex={innerStep} />

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]" style={{ color: activeStep.color }}>{activeStep.icon}</span>
          <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">
            {innerStep === 0 && 'General Information'}
            {innerStep === 1 && 'Product & Quality'}
            {innerStep === 2 && 'Commercial Details'}
            {innerStep === 3 && 'Brand & Collaboration'}
            {innerStep === 4 && 'Sales Assessment'}
          </h3>
        </div>

        {innerStep === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vendor / Business Name *" icon="apartment">
              <input type="text" className={INP} placeholder="Company name" value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} />
            </Field>
            <Field label="Contact Person" icon="person">
              <input type="text" className={INP} placeholder="Full name" value={form.buyerName} onChange={(e) => setField('buyerName', e.target.value)} />
            </Field>
            <Field label="Phone Number" icon="call">
              <input type="tel" className={INP} placeholder="10-digit mobile" maxLength={10}
                value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </Field>
            <Field label="Email (optional)" icon="mail">
              <input type="email" className={INP} placeholder="vendor@company.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </Field>
            <Field label="City & Location" icon="location_on">
              <input type="text" className={INP} placeholder="City, State" value={form.location} onChange={(e) => setField('location', e.target.value)} />
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Type of Business</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BUSINESS_TYPES.map((t) => (
                  <OptionPill key={t} active={form.businessType === t} color={activeStep.color} onClick={() => setField('businessType', t)}>
                    {t}
                  </OptionPill>
                ))}
              </div>
              {form.businessType === 'Other:' && (
                <input type="text" className={INP} placeholder="Please specify" value={form.businessTypeOther} onChange={(e) => setField('businessTypeOther', e.target.value)} />
              )}
            </div>
          </div>
        )}

        {innerStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Product Category</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <OptionPill key={cat} active={form.productCategory === cat} color={activeStep.color} onClick={() => setField('productCategory', cat)}>
                    {cat}
                  </OptionPill>
                ))}
              </div>
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
                <p className="text-[11px] text-neutral-400">PNG, JPG, PDF — up to 10MB each</p>
              </label>
              <input id="vendor-file-upload" type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />

              {previews.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {previews.map((p, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800">
                        {p.type.startsWith('image/') ? (
                          <img src={p.url} alt={p.name} className="h-20 w-full object-cover" />
                        ) : (
                          <div className="flex h-20 w-full flex-col items-center justify-center bg-indigo-50">
                            <span className="material-symbols-outlined text-indigo-400">description</span>
                            <span className="mt-1 text-[10px] font-bold text-indigo-500">PDF</span>
                          </div>
                        )}
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Vendor Quality Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setField('qualityRating', star)} className="focus:outline-none">
                    <span className={`material-symbols-outlined text-[28px] transition ${star <= form.qualityRating ? 'text-amber-400' : 'text-neutral-200'}`}
                      style={star <= form.qualityRating ? { fontVariationSettings: "'FILL' 1" } : {}}>
                      star
                    </span>
                  </button>
                ))}
                {form.qualityRating > 0 && <span className="ml-1 text-sm font-black text-amber-500">{form.qualityRating}/5</span>}
              </div>
            </div>
          </div>
        )}

        {innerStep === 2 && (
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
                  <OptionPill key={term} active={form.paymentTerms === term} color={activeStep.color} onClick={() => setField('paymentTerms', term)}>
                    {term}
                  </OptionPill>
                ))}
              </div>
            </div>
          </div>
        )}

        {innerStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Brand Section</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BRAND_SECTIONS.map((brand) => (
                  <OptionPill key={brand} active={form.brandSection === brand} color={activeStep.color} onClick={() => setField('brandSection', brand)}>
                    {brand}
                  </OptionPill>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Online Collaboration</label>
              <div className="flex gap-2">
                {['YES', 'No'].map((opt) => (
                  <OptionPill key={opt} active={form.onlineCollaboration === opt} color={activeStep.color} onClick={() => setField('onlineCollaboration', opt)} wide>
                    {opt}
                  </OptionPill>
                ))}
              </div>
            </div>
          </div>
        )}

        {innerStep === 4 && (
          <div>
            <div className="space-y-4">
              {MCQ_QUESTIONS.map((q, index) => (
                <div key={q.key} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <p className="mb-2 text-xs font-bold text-neutral-800 dark:text-neutral-100">
                    {index + 1}. {q.question}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((option) => {
                      const active = answers[q.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: option }))}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                            active
                              ? 'border-transparent text-white'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
                          }`}
                          style={active ? { backgroundColor: activeStep.color } : {}}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <textarea placeholder="Additional notes (optional)" rows={3} className={`${INP} mt-4 resize-none`}
              value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{answeredCount}/{MCQ_QUESTIONS.length} questions answered</p>
          </div>
        )}

        {stepError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {stepError}
          </div>
        )}
        {submitError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {submitError}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {innerStep > 0 ? (
          <button type="button" onClick={goPrev} className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
            <span className="material-symbols-outlined text-[16px]">chevron_left</span> Previous
          </button>
        ) : <div />}

        {innerStep < INNER_STEPS.length - 1 ? (
          <button type="button" onClick={goNext}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-bold text-white transition"
            style={{ backgroundColor: activeStep.color }}>
            Next <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        ) : (
          <button type="button" disabled={submitting} onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit questionnaire'}
          </button>
        )}
      </div>
    </div>
  );
};

export default VendorQuestionnaireForm;
