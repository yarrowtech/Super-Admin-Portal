import React, { useEffect, useMemo, useState } from 'react';
import { departmentApi } from '../../services/departments';
import { fallbackSalesAssessmentQuestions } from './salesAssessmentQuestions';
import { loadDraft, clearDraft, useDraftAutosave, relativeSavedLabel } from './useDraftAutosave';
import { INP, Field, SectionCard, DraftBadge, SubmitBar } from './salesFormUi';

const SECTIONS = {
  details: { id: 'details', label: 'Buyer Details', icon: 'contact_page', color: '#0f766e' },
  assessment: { id: 'assessment', label: 'Sales Assessment', icon: 'quiz', color: '#ec4899' },
};

const emptyGenericForm = { buyerName: '', businessName: '', phone: '', email: '', location: '', city: '', state: '', notes: '' };

const GenericQuestionForm = ({ token, project, projects = [], category, userId, onSubmitted, onProgress }) => {
  const draftKey = `salesQueryDraft:generic:${userId || 'anon'}:${project.code}:${category.id}`;
  const draft = useMemo(() => loadDraft(draftKey), [draftKey]);

  const [form, setForm] = useState(() => ({ ...emptyGenericForm, ...(draft?.value?.form || {}) }));
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [answers, setAnswers] = useState(() => draft?.value?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [draftDismissed, setDraftDismissed] = useState(false);

  const savedAt = useDraftAutosave(draftKey, { form, answers }, !submitting);

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

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => String(value || '').trim()).length,
    [answers]
  );
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const canSubmit = allAnswered && form.buyerName.trim() && !submitting;

  const overallFillPct = useMemo(() => {
    const fixedFieldsFilled = [
      form.buyerName.trim(),
      form.businessName.trim(),
      form.phone.trim(),
      form.email.trim(),
      form.location.trim(),
      form.city.trim(),
      form.state.trim(),
      form.notes.trim(),
    ].filter(Boolean).length;
    const totalFields = 8 + questions.length;
    const filledFields = fixedFieldsFilled + answeredCount;
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }, [form, questions.length, answeredCount]);

  useEffect(() => {
    onProgress?.(overallFillPct);
  }, [overallFillPct, onProgress]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('project', JSON.stringify({ code: project.code, name: project.name }));
      fd.append('projects', JSON.stringify(projects.length ? projects.map(({ code, name }) => ({ code, name })) : [{ code: project.code, name: project.name }]));
      fd.append('buyerCategory', category.label);
      fd.append('buyerName', form.buyerName.trim());
      fd.append('businessName', form.businessName.trim());
      fd.append('phone', form.phone.trim());
      fd.append('email', form.email.trim());
      fd.append('location', form.location.trim());
      fd.append('city', form.city.trim());
      fd.append('state', form.state.trim());
      fd.append('notes', form.notes.trim());
      fd.append('answers', JSON.stringify(questions.map((q) => ({ question: q.question, answer: answers[q._id] }))));

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
    setForm(emptyGenericForm);
    setAnswers({});
    setDraftDismissed(true);
  };

  return (
    <div>
      <div className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-accent-soft)]">
              <span className="material-symbols-outlined text-[20px] text-[var(--portal-accent)]">{category.icon || 'storefront'}</span>
            </span>
            <div>
              <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                {project.name} <span className="text-neutral-300 dark:text-neutral-700">&middot;</span> {category.label}
              </p>
              <p className="text-[11px] font-semibold text-neutral-400">Buyer field questionnaire</p>
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
        <SectionCard section={SECTIONS.details}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Buyer / Contact Name *" icon="person">
              <input type="text" className={INP} placeholder="Full name" value={form.buyerName} onChange={(e) => setField('buyerName', e.target.value)} />
            </Field>
            <Field label="Business / Shop Name" icon="storefront">
              <input type="text" className={INP} placeholder="Business name" value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} />
            </Field>
            <Field label="Phone Number" icon="call">
              <input type="tel" className={INP} placeholder="10-digit mobile" maxLength={10} value={form.phone} onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </Field>
            <Field label="Email" icon="mail">
              <input type="email" className={INP} placeholder="buyer@company.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Location / Address" icon="location_on">
                <input type="text" className={INP} placeholder="Full address" value={form.location} onChange={(e) => setField('location', e.target.value)} />
              </Field>
            </div>
            <Field label="City" icon="location_city">
              <input type="text" className={INP} placeholder="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
            </Field>
            <Field label="State" icon="map">
              <input type="text" className={INP} placeholder="State" value={form.state} onChange={(e) => setField('state', e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          section={SECTIONS.assessment}
          right={<span className="text-[11px] font-bold text-neutral-400">{answeredCount}/{questions.length} answered</span>}
        >
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
                            style={active ? { backgroundColor: SECTIONS.assessment.color } : {}}
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
          <div className="mt-4 space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Additional Notes</label>
            <textarea
              placeholder="Any other observations from the visit"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={3}
              className={`${INP} resize-none`}
            />
          </div>
        </SectionCard>
      </div>

      {submitError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      )}

      <SubmitBar hint={`${answeredCount}/${questions.length} questions answered`}>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {submitting ? 'Submitting...' : 'Submit questionnaire'}
        </button>
      </SubmitBar>
    </div>
  );
};

export default GenericQuestionForm;
