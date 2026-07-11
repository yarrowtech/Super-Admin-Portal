import React, { useCallback, useEffect, useState } from 'react';
import { departmentApi } from '../../services/departments';
import { CANONICAL_PROJECTS } from '../../config/projectNames';

const emptyDraft = () => ({ question: '', options: ['', ''] });

const QuestionEditor = ({ initial, onSave, onCancel, saving }) => {
  const [question, setQuestion] = useState(initial.question);
  const [options, setOptions] = useState(initial.options.length ? [...initial.options] : ['', '']);

  const setOption = (idx, value) => setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (idx) => setOptions((prev) => prev.filter((_, i) => i !== idx));

  const cleanedOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSave = question.trim();

  return (
    <div className="rounded-xl border border-teal-300 bg-teal-50/40 p-3 dark:border-teal-700 dark:bg-teal-900/10">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question text"
        className="mb-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(idx, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-teal-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              onClick={() => removeOption(idx)}
              disabled={options.length <= 1}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-900/20"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="mt-2 flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400"
      >
        <span className="material-symbols-outlined text-sm">add</span> Add option
      </button>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() => onSave({ question: question.trim(), options: cleanedOptions })}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const AdminSalesQuestionManager = ({ token }) => {
  const [activeProject, setActiveProject] = useState(CANONICAL_PROJECTS[0]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchQuestions = useCallback(async () => {
    if (!token || !activeProject?.code) return;
    setLoading(true);
    setError('');
    try {
      const response = await departmentApi.getSalesQuestions(token, {
        projectCode: activeProject.code,
        includeInactive: true,
      });
      const payload = response?.data?.data || response?.data || {};
      setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
    } catch (err) {
      setError(err?.message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [token, activeProject]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const resetDraftState = () => {
    setEditingId(null);
    setAddingNew(false);
    setError('');
  };

  const handleUpdate = async (id, patch) => {
    setSavingId(id);
    try {
      await departmentApi.updateSalesQuestion(token, id, patch);
      setEditingId(null);
      await fetchQuestions();
    } catch (err) {
      setError(err?.message || 'Failed to update question.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (patch) => {
    setSavingId('new');
    try {
      await departmentApi.createSalesQuestion(token, {
        ...patch,
        projectCode: activeProject.code,
        projectName: activeProject.name,
      });
      setAddingNew(false);
      await fetchQuestions();
    } catch (err) {
      setError(err?.message || 'Failed to create question.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question? Existing submissions keep their recorded answer.')) return;
    setDeletingId(id);
    try {
      await departmentApi.deleteSalesQuestion(token, id);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      setError(err?.message || 'Failed to delete question.');
    } finally {
      setDeletingId(null);
    }
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index];
    const b = questions[target];
    const reordered = [...questions];
    reordered[index] = b;
    reordered[target] = a;
    setQuestions(reordered);
    try {
      await Promise.all([
        departmentApi.updateSalesQuestion(token, a._id, { order: b.order }),
        departmentApi.updateSalesQuestion(token, b._id, { order: a.order }),
      ]);
    } catch (err) {
      setError(err?.message || 'Failed to reorder questions.');
      fetchQuestions();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Project</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CANONICAL_PROJECTS.map((project) => (
            <button
              key={project.code}
              type="button"
              onClick={() => {
                setActiveProject(project);
                resetDraftState();
              }}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                activeProject.code === project.code
                  ? 'border-teal-500 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-900/20 dark:text-teal-100'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
              }`}
            >
              <span className="block text-sm font-black">{project.name}</span>
              <span className="mt-0.5 block text-xs opacity-70">{project.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-100">
        Questions are global for the selected project and appear for every buyer category/selection in that project.
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">
            {activeProject.name} - Project Global Questionnaire
          </h3>
          {!addingNew && (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
            >
              <span className="material-symbols-outlined text-sm">add</span> Add question
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading questions...</p>
        ) : (
          <div className="space-y-3">
            {addingNew && (
              <QuestionEditor
                initial={emptyDraft()}
                saving={savingId === 'new'}
                onCancel={() => setAddingNew(false)}
                onSave={handleCreate}
              />
            )}

            {questions.map((q, index) =>
              editingId === q._id ? (
                <QuestionEditor
                  key={q._id}
                  initial={{ question: q.question, options: q.options }}
                  saving={savingId === q._id}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => handleUpdate(q._id, patch)}
                />
              ) : (
                <div key={q._id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                      {index + 1}. {q.question}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {q.options.map((opt) => (
                        <span key={opt} className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Move up"
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                      <span className="material-symbols-outlined text-sm text-neutral-500">arrow_upward</span>
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === questions.length - 1} title="Move down"
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
                      <span className="material-symbols-outlined text-sm text-neutral-500">arrow_downward</span>
                    </button>
                    <button type="button" onClick={() => setEditingId(q._id)} title="Edit question"
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <span className="material-symbols-outlined text-sm text-neutral-500">edit</span>
                    </button>
                    <button type="button" onClick={() => handleDelete(q._id)} disabled={deletingId === q._id} title="Delete question"
                      className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-900/20">
                      <span className="material-symbols-outlined text-sm text-rose-500">delete</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSalesQuestionManager;
