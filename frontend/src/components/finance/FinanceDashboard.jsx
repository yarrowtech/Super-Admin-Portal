import React from 'react';

const FinanceDashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        {/* PageHeading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-72 flex-col gap-2">
            <h1 className="text-neutral-800 dark:text-neutral-100 text-4xl font-black leading-tight tracking-[-0.033em]">
              Financial Dashboards Center
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-base font-normal leading-normal">
              Access various AI-backed financial dashboards.
            </p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-neutral-300 dark:hover:bg-neutral-600">
            <span className="truncate">Create New Dashboard</span>
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          {/* SearchBar */}
          <div className="flex-1 min-w-[300px]">
            <label className="flex flex-col h-12 w-full">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                <div className="text-neutral-600 dark:text-neutral-400 flex bg-white dark:bg-neutral-800 items-center justify-center pl-4 rounded-l-lg border border-r-0 border-neutral-200 dark:border-neutral-700">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-neutral-800 dark:text-neutral-100 focus:outline-0 focus:ring-2 focus:ring-primary focus:ring-inset border border-l-0 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 h-full placeholder:text-neutral-600 dark:placeholder:text-neutral-400 px-4 text-base font-normal leading-normal" 
                  placeholder="Find a dashboard by name..." 
                  value=""
                />
              </div>
            </label>
          </div>
          
          {/* Filter Chips */}
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-primary/10 dark:bg-primary/20 px-4">
              <p className="text-primary dark:text-primary text-sm font-medium leading-normal">All</p>
            </div>
            <div className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 hover:bg-neutral-300 dark:hover:bg-neutral-600">
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Liquidity</p>
            </div>
            <div className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 hover:bg-neutral-300 dark:hover:bg-neutral-600">
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Profitability</p>
            </div>
            <div className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 hover:bg-neutral-300 dark:hover:bg-neutral-600">
              <p className="text-neutral-800 dark:text-neutral-100 text-sm font-medium leading-normal">Performance</p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {/* Cash Management Dashboard */}
          <div className="flex flex-col gap-3 pb-3 bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-6xl mb-2 block">account_balance</span>
                <p className="text-green-700 dark:text-green-300 text-sm font-medium">Cash Flow Analytics</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-800 dark:text-neutral-100 text-base font-bold leading-normal">Cash Management</p>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal mt-1">
                Overview of liquidity, ratios, and expenses.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-yellow-500 text-lg" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">Favorite</p>
              </div>
            </div>
          </div>

          {/* Profit & Loss Dashboard */}
          <div className="flex flex-col gap-3 pb-3 bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-6xl mb-2 block">trending_up</span>
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Revenue vs Costs</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-neutral-800 dark:text-neutral-100 text-base font-bold leading-normal">Profit & Loss</p>
                <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-sm">auto_awesome</span>
                  <p className="text-blue-600 dark:text-blue-300 text-xs font-medium">AI Insights</p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal mt-1">
                Analysis of revenue vs. costs and profit margins.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-600 text-lg">star_outline</span>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">Add to Favorites</p>
              </div>
            </div>
          </div>

          {/* CFO Dashboard */}
          <div className="flex flex-col gap-3 pb-3 bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-6xl mb-2 block">dashboard</span>
                <p className="text-purple-700 dark:text-purple-300 text-sm font-medium">Executive Overview</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-800 dark:text-neutral-100 text-base font-bold leading-normal">CFO Dashboard</p>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal mt-1">
                High-level view of sales goals and cash flow.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-yellow-500 text-lg" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">Favorite</p>
              </div>
            </div>
          </div>

          {/* Financial Performance Dashboard */}
          <div className="flex flex-col gap-3 pb-3 bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-6xl mb-2 block">analytics</span>
                <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">Capital Structure</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-800 dark:text-neutral-100 text-base font-bold leading-normal">Financial Performance</p>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal mt-1">
                Insights into capital structure and debt ratios.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-600 text-lg">star_outline</span>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">Add to Favorites</p>
              </div>
            </div>
          </div>

          {/* Budget Planning Dashboard */}
          <div className="flex flex-col gap-3 pb-3 bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-6xl mb-2 block">savings</span>
                <p className="text-teal-700 dark:text-teal-300 text-sm font-medium">Budget Forecasting</p>
              </div>
            </div>
            <div>
              <p className="text-neutral-800 dark:text-neutral-100 text-base font-bold leading-normal">Budget Planning</p>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal mt-1">
                Annual budget planning and forecasting tools.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-600 text-lg">star_outline</span>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">Add to Favorites</p>
              </div>
            </div>
          </div>

          {/* Expense Tracking Dashboard */}
          <div className="flex flex-col gap-3 pb-3 bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
              <div className="text-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-6xl mb-2 block">receipt_long</span>
                <p className="text-red-700 dark:text-red-300 text-sm font-medium">Expense Analysis</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-neutral-800 dark:text-neutral-100 text-base font-bold leading-normal">Expense Tracking</p>
                <div className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-green-500 dark:text-green-400 text-sm">auto_awesome</span>
                  <p className="text-green-600 dark:text-green-300 text-xs font-medium">Smart Categorization</p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal mt-1">
                Real-time expense monitoring and categorization.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="material-symbols-outlined text-yellow-500 text-lg" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-normal leading-normal">Favorite</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default FinanceDashboard;