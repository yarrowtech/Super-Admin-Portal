import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { CANONICAL_PROJECTS } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import SalesPortalLayout from './SalesPortalLayout';
import VendorQuestionnaireForm from './VendorQuestionnaireForm';
import GenericQuestionForm from './GenericQuestionForm';
import { SubmissionDetailModal } from './salesSubmissionShared';
import { formatDate, projectDisplay } from './salesSubmissionUtils';

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

const LastSubmissionCard = ({ submission, loading, onView }) => (
  <section className={cardClass}>
    <h2 className="mb-3 text-base font-black text-neutral-900 dark:text-neutral-100">Your last submission</h2>
    {loading ? (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading...</p>
    ) : !submission ? (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        You haven't submitted a questionnaire yet. Start one below.
      </p>
    ) : (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {submission.businessName || submission.buyerName || 'Unnamed buyer'}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {[projectDisplay(submission), submission.buyerCategory, formatDate(submission.createdAt)].filter(Boolean).join(' - ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onView(submission)}
          className="flex h-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          View
        </button>
      </div>
    )}
  </section>
);

const SalesQueryPage = () => {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [category, setCategory] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [viewItem, setViewItem] = useState(null);

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
    setProjects([]);
    setCategory(null);
    setSubmitted(false);
  };

  const toggleProject = (item) => {
    setProjects((prev) =>
      prev.some((project) => project.code === item.code)
        ? prev.filter((project) => project.code !== item.code)
        : [...prev, item]
    );
    setCategory(null);
  };

  const primaryProject = projects[0] || null;
  const ermsProject = projects.find((item) => item.code === 'ERMS') || null;
  const formProject = category?.id === 'vendor' ? (ermsProject || primaryProject) : primaryProject;

  return (
    <SalesPortalLayout activeId="query">
      <PortalHeader title="Sales Query" icon="quiz" user={user} />

      <div className="mb-4">
        <LastSubmissionCard submission={queries[0]} loading={loadingQueries} onView={setViewItem} />
      </div>

      <section className={cardClass}>
        {submitted ? (
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
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-100">1. Select product name(s)</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CANONICAL_PROJECTS.map((item) => {
                  const active = projects.some((project) => project.code === item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => toggleProject(item)}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]'
                          : 'border-neutral-200 bg-neutral-50 hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-800 dark:bg-neutral-950'
                      }`}
                    >
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.name}</span>
                      {active && <span className="material-symbols-outlined text-lg text-[var(--portal-accent)]">check_circle</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {projects.length > 0 && (
              <div className="border-t border-neutral-100 pt-5 dark:border-neutral-800">
                <p className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  2. Select the buyer category for <span className="text-[var(--portal-accent)]">{projects.map((item) => item.name).join(', ')}</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {BUYER_CATEGORIES.map((item) => {
                    const active = category?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                          active
                            ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]'
                            : 'border-neutral-200 bg-neutral-50 hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent-soft)] dark:border-neutral-800 dark:bg-neutral-950'
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl text-[var(--portal-accent)]">{item.icon}</span>
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {formProject && category && (
              <div className="border-t border-neutral-100 pt-5 dark:border-neutral-800">
                <p className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-100">3. Fill the questionnaire</p>
                {category.id === 'vendor' && projects.some((item) => item.code === 'ERMS') ? (
                  <VendorQuestionnaireForm
                    token={token}
                    project={formProject}
                    projects={projects}
                    category={category}
                    onSubmitted={() => {
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
                    formType={category.id === 'vendor' ? 'vendor' : 'generic'}
                    onSubmitted={() => {
                      setSubmitted(true);
                      loadQueries();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <SubmissionDetailModal submission={viewItem} onClose={() => setViewItem(null)} />
    </SalesPortalLayout>
  );
};

export default SalesQueryPage;
