const WorkspaceHierarchy = ({ catalog, loading = false }) => {
  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />;
  if (!catalog?.organization) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-white dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined rounded-xl bg-white/15 p-2">account_tree</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Organization</p>
            <h2 className="text-lg font-black">{catalog.organization.name}</h2>
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{catalog.brands?.length || 0} brands</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {(catalog.brands || []).map((brand) => (
          <article key={brand.code} className={`rounded-2xl border p-3 ${brand.code === 'YARROWTECH' ? 'border-indigo-200 bg-indigo-50/60 sm:col-span-2 dark:border-indigo-900 dark:bg-indigo-950/20' : 'border-neutral-200 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/60'}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">business</span>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">{brand.name}</h3>
            </div>
            {brand.projects?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {brand.projects.map((project) => (
                  <span key={project.code} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${project.accessGranted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-white text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-700'}`}>
                    {project.name}
                  </span>
                ))}
              </div>
            ) : <p className="mt-2 text-xs text-neutral-400">Brand workspace</p>}
          </article>
        ))}
      </div>
    </section>
  );
};

export default WorkspaceHierarchy;
