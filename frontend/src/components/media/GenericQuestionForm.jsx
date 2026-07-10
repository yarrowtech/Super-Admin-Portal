import React, { useMemo, useState } from 'react';
import { departmentApi } from '../../services/departments';

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

const GenericQuestionForm = ({ token, project, category, onChangeCategory, onSubmitted }) => {
  const [form, setForm] = useState({ buyerName: '', businessName: '', phone: '', email: '', location: '', notes: '' });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const allAnswered = answeredCount === MCQ_QUESTIONS.length;
  const canSubmit = allAnswered && form.buyerName.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('project', JSON.stringify({ code: project.code, name: project.name }));
      fd.append('buyerCategory', category.label);
      fd.append('buyerName', form.buyerName.trim());
      fd.append('businessName', form.businessName.trim());
      fd.append('phone', form.phone.trim());
      fd.append('email', form.email.trim());
      fd.append('location', form.location.trim());
      fd.append('notes', form.notes.trim());
      fd.append('answers', JSON.stringify(MCQ_QUESTIONS.map((q) => ({ question: q.question, answer: answers[q.key] }))));

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
                        ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-[var(--portal-accent)] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
          {answeredCount}/{MCQ_QUESTIONS.length} questions answered
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
