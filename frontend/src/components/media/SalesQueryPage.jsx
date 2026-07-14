import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { CANONICAL_PROJECTS } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import SalesPortalLayout from './SalesPortalLayout';
import VendorQuestionnaireForm from './VendorQuestionnaireForm';
import GenericQuestionForm from './GenericQuestionForm';
import { SubmissionDetailModal } from './salesSubmissionShared';
import { formatDate, projectDisplay } from './salesSubmissionUtils';
import { loadDraft, clearDraft, clearDraftsByPrefix, useDraftAutosave } from './useDraftAutosave';

const cardClass = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

const BUYER_CATEGORIES = [
  { id: 'vendor', label: 'Vendor', icon: 'local_shipping' },
  { id: 'retailer', label: 'Retailer', icon: 'storefront' },
  { id: 'store-owner', label: 'Store Owner', icon: 'store' },
  { id: 'wholesaler', label: 'Wholesaler', icon: 'warehouse' },
  { id: 'manufacturer', label: 'Manufacturer', icon: 'precision_manufacturing' },
  { id: 'distributor', label: 'Distributor', icon: 'conveyor_belt' },
  { id: 'franchise-owner', label: 'Franchise Owner', icon: 'business' },
  { id: 'other', label: 'Other Buyer', icon: 'more_horiz' },
];

const PROJECT_ICONS = {
  EEC: 'school',
  EHC: 'badge',
  BETTERPASS: 'confirmation_number',
  EFNBMMS: 'database',
  ESPORTSM: 'sports_esports',
  ERMS: 'local_shipping',
};

const StepKicker = ({ step, title, accent }) => (
  <div className="mb-3 flex items-center gap-2.5">
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
      style={{ backgroundColor: accent || 'var(--portal-accent)' }}
    >
      {step}
    </span>
    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{title}</p>
  </div>
);

const STAGES = [
  { id: 1, label: 'Product' },
  { id: 2, label: 'Buyer category' },
  { id: 3, label: 'Questionnaire' },
];

const StageStepper = ({ activeStage, progress = 0 }) => (
  <div className="mb-6 flex items-center">
    {STAGES.map((stage, i) => {
      const done = stage.id < activeStage;
      const active = stage.id === activeStage;
      const isQuestionnaire = stage.id === 3;
      return (
        <React.Fragment key={stage.id}>
          <div className="flex flex-col items-center gap-1.5">
            {isQuestionnaire && active ? (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background] duration-500 ease-out"
                style={{ background: `conic-gradient(var(--portal-accent) ${progress}%, var(--portal-accent-soft) 0)` }}
              >
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-[9px] font-black text-[var(--portal-accent)] dark:bg-neutral-900">
                  {progress}%
                </div>
              </div>
            ) : (
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                  done
                    ? 'bg-[var(--portal-accent)] text-white'
                    : active
                    ? 'bg-[var(--portal-accent)] text-white ring-4 ring-[var(--portal-accent-soft)]'
                    : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                }`}
              >
                {done ? <span className="material-symbols-outlined text-base">check</span> : stage.id}
              </div>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wide ${active || done ? 'text-[var(--portal-accent)]' : 'text-neutral-400 dark:text-neutral-500'}`}>
              {stage.label}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div className="mx-2 mb-4 h-0.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-[var(--portal-accent)] transition-all duration-500 ease-out"
                style={{ width: stage.id < activeStage ? '100%' : '0%' }}
              />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const LastSubmissionCard = ({ submission, loading, onView }) => (
  <section className={`${cardClass} overflow-hidden`}>
    <div className="h-[3px] w-full bg-[var(--portal-accent)]" />
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-[var(--portal-accent)]">history</span>
        <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-100">Your last submission</h2>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="h-3.5 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ) : !submission ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 dark:border-neutral-800 dark:bg-neutral-950">
          <span className="material-symbols-outlined text-2xl text-neutral-300 dark:text-neutral-700">inbox</span>
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            You haven't submitted a questionnaire yet. Start one below.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-sm font-black text-[var(--portal-accent)]">
              {(submission.businessName || submission.buyerName || '?').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {submission.businessName || submission.buyerName || 'Unnamed buyer'}
                </p>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Submitted
                </span>
              </div>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {[projectDisplay(submission), submission.buyerCategory, formatDate(submission.createdAt)].filter(Boolean).join(' - ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onView(submission)}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-600 transition hover:border-[var(--portal-accent)] hover:text-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            View
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  </section>
);

const SalesQueryPage = () => {
  const { token, user } = useAuth();
  const stageKey = `salesQueryStage:${user?._id || 'anon'}`;
  const stageDraft = useMemo(() => loadDraft(stageKey), [stageKey]);

  const [projects, setProjects] = useState(() => stageDraft?.value?.projects || []);
  const [category, setCategory] = useState(() => stageDraft?.value?.category || null);
  const [submitted, setSubmitted] = useState(false);
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [viewItem, setViewItem] = useState(null);
  const [formProgress, setFormProgress] = useState(0);

  useDraftAutosave(stageKey, { projects, category }, !submitted);

  // Drafts should only survive an in-page refresh, not a return visit — wipe them
  // when the user navigates away from the Sales Query page entirely.
  useEffect(() => {
    return () => {
      clearDraftsByPrefix('salesQueryDraft:');
      clearDraftsByPrefix('salesQueryStage:');
    };
  }, []);

  const loadQueries = () => {
    if (!token) return;
    setLoadingQueries(true);
    departmentApi
      .getSalesQueries(token)
      .then((response) => {
        const payload = response?.data?.data || response?.data || {};
        setQueries(Array.isArray(payload.queries) ? payload.queries : []);
      })
      .catch(() => {})
      .finally(() => setLoadingQueries(false));
  };

  useEffect(() => {
    loadQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetWizard = () => {
    clearDraft(stageKey);
    setProjects([]);
    setCategory(null);
    setSubmitted(false);
    setFormProgress(0);
  };

  const toggleProject = (item) => {
    setProjects((prev) => (prev.some((project) => project.code === item.code) ? [] : [item]));
    setCategory(null);
    setFormProgress(0);
  };

  const selectCategory = (item) => {
    setCategory(item);
    setFormProgress(0);
  };

  const primaryProject = projects[0] || null;
  const ermsProject = projects.find((item) => item.code === 'ERMS') || null;
  const formProject = ermsProject || primaryProject;
  const activeStage = category ? 3 : projects.length > 0 ? 2 : 1;

  return (
    <SalesPortalLayout activeId="query">
      <PortalHeader title="Sales Query" icon="quiz" user={user} />

      <div className="mb-4">
        <LastSubmissionCard submission={queries[0]} loading={loadingQueries} onView={setViewItem} />
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="h-[3px] w-full bg-[var(--portal-accent)]" />
        <div className="p-4 sm:p-5">
        {submitted ? (
          <div className="app-pop-enter flex flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="app-pop-enter flex h-16 w-16 items-center justify-center rounded-full bg-[var(--portal-accent-soft)]" style={{ animationDelay: '80ms' }}>
              <span className="material-symbols-outlined text-4xl text-[var(--portal-accent)]">task_alt</span>
            </span>
            <p className="text-base font-black text-neutral-900 dark:text-neutral-100">Questionnaire submitted</p>
            <p className="max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
              Thanks for capturing this field visit. You can start a new questionnaire for the next buyer.
            </p>
            <button
              type="button"
              onClick={resetWizard}
              className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--portal-accent)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Start new questionnaire
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <StageStepper activeStage={activeStage} progress={formProgress} />
            <div>
              <StepKicker step="1" title="Select a product name" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CANONICAL_PROJECTS.map((item) => {
                  const active = projects.some((project) => project.code === item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleProject(item)}
                      className={`group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150 ${
                        active
                          ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 hover:-translate-y-0.5 hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active ? 'bg-[var(--portal-accent)] text-white' : 'bg-white text-neutral-400 dark:bg-neutral-900'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{PROJECT_ICONS[item.code] || 'inventory_2'}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.name}</p>
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{item.code}</p>
                      </div>
                      {active && (
                        <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[18px] text-[var(--portal-accent)]">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {projects.length > 0 && (
              <div className="app-page-enter border-t border-neutral-100 pt-5 dark:border-neutral-800">
                <StepKicker
                  step="2"
                  title={
                    <>
                      Select the buyer category for <span className="text-[var(--portal-accent)]">{projects.map((item) => item.name).join(', ')}</span>
                    </>
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {BUYER_CATEGORIES.map((item) => {
                    const active = category?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectCategory(item)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-150 ${
                          active
                            ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] shadow-sm'
                            : 'border-neutral-200 bg-neutral-50 hover:-translate-y-0.5 hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950'
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                            active ? 'bg-[var(--portal-accent)] text-white' : 'bg-white text-[var(--portal-accent)] dark:bg-neutral-900'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                        </span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formProject && category && (
              <div key={category.id} className="app-page-enter border-t border-neutral-100 pt-5 dark:border-neutral-800">
                <StepKicker step="3" title="Fill the questionnaire" />
                <div className="-mt-2 mb-4 flex flex-wrap items-center gap-1.5">
                  {projects.map((item) => (
                    <span key={item.code} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {item.name}
                    </span>
                  ))}
                  <span className="rounded-full bg-[var(--portal-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--portal-accent)]">
                    {category.label}
                  </span>
                </div>
                {projects.some((item) => item.code === 'ERMS') ? (
                  <VendorQuestionnaireForm
                    token={token}
                    project={formProject}
                    projects={projects}
                    category={category}
                    userId={user?._id}
                    onProgress={setFormProgress}
                    onSubmitted={() => {
                      clearDraft(stageKey);
                      setSubmitted(true);
                      loadQueries();
                    }}
                  />
                ) : (
                  <GenericQuestionForm
                    token={token}
                    project={formProject}
                    projects={projects}
                    category={category}
                    formType="generic"
                    userId={user?._id}
                    onProgress={setFormProgress}
                    onSubmitted={() => {
                      clearDraft(stageKey);
                      setSubmitted(true);
                      loadQueries();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </section>

      <SubmissionDetailModal submission={viewItem} onClose={() => setViewItem(null)} />
    </SalesPortalLayout>
  );
};

export default SalesQueryPage;
