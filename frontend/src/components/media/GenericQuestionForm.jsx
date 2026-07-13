import React, { useEffect, useMemo, useState } from 'react';
import { departmentApi } from '../../services/departments';
import { fallbackSalesAssessmentQuestions } from './salesAssessmentQuestions';
import { loadDraft, clearDraft, useDraftAutosave, relativeSavedLabel } from './useDraftAutosave';

const emptyGenericForm = { buyerName: '', businessName: '', phone: '', email: '', location: '', notes: '' };

const GenericQuestionForm = ({ token, project, projects = [], category, formType = 'generic', userId, onSubmitted }) => {
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

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => String(value || '').trim()).length,
    [answers]
  );
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const canSubmit = allAnswered && form.buyerName.trim() && !submitting;

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

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Buyer / contact name *"
          value={form.buyerName}
          onChange={(e) => setForm((prev) => ({ ...prev, buyerName: e.target.value }))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
        />
        <input
          type="text"
          placeholder="Business / shop name"
          value={form.businessName}
          onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
        />
        <input
          type="text"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
        />
        <input
          type="text"
          placeholder="Location / address"
          value={form.location}
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-neutral-800 dark:bg-neutral-950"
        />
      </div>

      <div className="space-y-4">
        {questionsLoading ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading assessment questions...</p>
        ) : questions.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">No assessment questions configured yet.</p>
        ) : (
          questions.map((q, index) => (
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
                            ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-[var(--portal-accent)] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
                        }`}
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
                  className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-[var(--portal-accent)] dark:border-neutral-800 dark:bg-neutral-950"
                />
              )}
            </div>
          ))
        )}
      </div>

      <textarea
        placeholder="Additional notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
        rows={3}
        className="mt-4 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
      />

      {submitError && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {answeredCount}/{questions.length} questions answered
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="rounded-lg bg-[var(--portal-accent)] px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Submitting...' : 'Submit questionnaire'}
        </button>
      </div>
    </div>
  );
};

export default GenericQuestionForm;
