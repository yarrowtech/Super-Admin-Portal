import React, { useEffect, useMemo, useState } from 'react';
import LawRecordManager from '../LawRecordManager';
import { LAW_FORM_CONFIG, getLawSection } from '../lawModuleConfig';

const FIXED_PROJECT_OPTIONS = [];

const LawOpsPage = ({
  sectionId,
  searchTerm,
  onSearchChange,
  error,
  subtitle = '',
  records = [],
  projects = [],
  selectedProjectId = '',
  onProjectChange,
  loading = false,
  lastUpdatedAt,
  saving,
  onSaveRecord,
  onDeleteRecord,
}) => {
  const section = getLawSection(sectionId);
  const config = LAW_FORM_CONFIG[sectionId] || {};
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const textMatch = `${record.title || ''} ${record.description || ''} ${record.referenceNumber || ''}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    return textMatch;
  }), [records, searchTerm]);

  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      label: project.name || 'Untitled Project',
      value: String(project._id || project.id || ''),
    })).filter((item) => item.value);
  }, [projects]);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 p-6 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                  <span className="material-symbols-outlined text-xl">contract</span>
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-neutral-900 dark:text-white">{section.title}</h1>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{subtitle}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-neutral-800 dark:text-blue-200">
                  Wednesday, May 20
                </span>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
                  All Systems Operational
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span className="material-symbols-outlined">dark_mode</span>
              </button>
              <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
              </button>
            </div>
          </div>
        </header>

        <div className="relative mt-6 w-fit">
          <button
            type="button"
            onClick={() => setIsProjectOpen((prev) => !prev)}
            className="flex h-11 min-w-[220px] items-center justify-between rounded-xl bg-neutral-200 px-4 text-base font-medium text-neutral-900 hover:bg-neutral-300"
          >
            <span>{projectOptions.find((item) => item.value === selectedProjectId)?.label || 'Select Project'}</span>
            <span className="material-symbols-outlined text-2xl">expand_more</span>
          </button>
          {isProjectOpen && (
            <div className="absolute left-0 top-[54px] z-20 w-[260px] rounded-2xl bg-neutral-300 p-3 shadow-lg">
              {projectOptions.length === 0 ? (
                <p className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-600">No projects available</p>
              ) : null}
              {projectOptions.map((project) => (
                <button
                  key={project.value}
                  type="button"
                  onClick={() => {
                    onProjectChange?.(project.value);
                    setIsProjectOpen(false);
                  }}
                  className="mb-2 flex h-10 w-full items-center justify-center rounded-xl bg-neutral-100 text-xl font-medium text-neutral-900 hover:bg-white"
                >
                  {project.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">{section.title}</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{section.summary}</p>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="mt-4 h-12 w-full rounded-xl border border-neutral-200 px-4 text-base dark:border-neutral-700 dark:bg-neutral-900"
            placeholder={`Search ${section.navLabel.toLowerCase()} records...`}
          />
          {loading && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Loading agreements...</p>}
          {lastUpdatedAt && !loading && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Last updated: {new Date(lastUpdatedAt).toLocaleTimeString()}</p>
          )}
          {error && <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-300">{error}</p>}
        </section>

        <div className="mt-6">
          <LawRecordManager
            section={sectionId}
            records={filteredRecords}
            saving={saving}
            onSaveRecord={onSaveRecord}
            onDeleteRecord={onDeleteRecord}
            title={`${section.navLabel} Register`}
            {...config}
          />
        </div>
      </div>
    </main>
  );
};

export default LawOpsPage;
