import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { CANONICAL_PROJECTS } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import SalesPortalLayout from './SalesPortalLayout';
import VendorQuestionnaireForm from './VendorQuestionnaireForm';
import GenericQuestionForm from './GenericQuestionForm';

const cardClass = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';

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

const STEPS = [
  { id: 'project', label: 'Project' },
  { id: 'category', label: 'Buyer Category' },
  { id: 'form', label: 'Questionnaire' },
];

const StepIndicator = ({ step }) => {
  const activeIndex = STEPS.findIndex((item) => item.id === step);
  return (
    <div className="mb-4 flex items-center gap-2">
      {STEPS.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <React.Fragment key={item.id}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active || done
                    ? 'bg-[var(--portal-accent)] text-white'
                    : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span className={`text-xs font-bold ${active ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                {item.label}
              </span>
            </div>
            {index < STEPS.length - 1 && <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-800" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const RecentQueriesPanel = ({ queries, loading }) => (
  <section className={cardClass}>
    <h2 className="mb-3 text-base font-black text-neutral-900 dark:text-neutral-100">Recent field submissions</h2>
    {loading ? (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading...</p>
    ) : queries.length === 0 ? (
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
        <span className="material-symbols-outlined mb-2 text-3xl text-neutral-400">quiz</span>
        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">No submissions yet</p>
        <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
          Field questionnaires submitted by the sales team will appear here.
        </p>
      </div>
    ) : (
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {queries.slice(0, 8).map((item) => (
          <div key={item._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {item.businessName || item.buyerName || 'Unnamed buyer'}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {[item.project?.name, item.buyerCategory].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold capitalize text-teal-700">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    )}
  </section>
);

const SalesQueryPage = () => {
  const { token, user } = useAuth();
  const [step, setStep] = useState('project');
  const [project, setProject] = useState(null);
  const [category, setCategory] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(true);

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
    setStep('project');
    setProject(null);
    setCategory(null);
    setSubmitted(false);
  };

  return (
    <SalesPortalLayout activeId="query">
      <PortalHeader title="Sales Query" subtitle="Field buyer questionnaire" icon="quiz" user={user} />

      <section className={cardClass}>
        <StepIndicator step={step} />

        {step === 'project' && (
          <div>
            <p className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-100">Select the in-house project</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CANONICAL_PROJECTS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setProject(item);
                    setStep('category');
                  }}
                  className="flex flex-col items-start gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left transition hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.name}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'category' && project && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                Select the buyer category for <span className="text-[var(--portal-accent)]">{project.name}</span>
              </p>
              <button type="button" onClick={() => setStep('project')} className="text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                Change project
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {BUYER_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item);
                    setStep('form');
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center transition hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <span className="material-symbols-outlined text-2xl text-[var(--portal-accent)]">{item.icon}</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && project && category && (
          submitted ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--portal-accent)]">task_alt</span>
              <p className="text-base font-black text-neutral-900 dark:text-neutral-100">Questionnaire submitted</p>
              <p className="max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
                Thanks for capturing this field visit. You can start a new questionnaire for the next buyer.
              </p>
              <button
                type="button"
                onClick={resetWizard}
                className="mt-2 rounded-lg bg-[var(--portal-accent)] px-4 py-2 text-xs font-bold text-white"
              >
                Start new questionnaire
              </button>
            </div>
          ) : project.code === 'ERMS' && category.id === 'vendor' ? (
            <VendorQuestionnaireForm
              token={token}
              project={project}
              category={category}
              onChangeCategory={() => setStep('category')}
              onSubmitted={() => {
                setSubmitted(true);
                loadQueries();
              }}
            />
          ) : (
            <GenericQuestionForm
              token={token}
              project={project}
              category={category}
              onChangeCategory={() => setStep('category')}
              onSubmitted={() => {
                setSubmitted(true);
                loadQueries();
              }}
            />
          )
        )}
      </section>

      <div className="mt-4">
        <RecentQueriesPanel queries={queries} loading={loadingQueries} />
      </div>
    </SalesPortalLayout>
  );
};

export default SalesQueryPage;
