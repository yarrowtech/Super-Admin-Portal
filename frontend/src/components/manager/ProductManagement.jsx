import React from 'react';

const summaryCards = [
  { label: 'Active Products', value: '12', change: '+2 this month' },
  { label: 'In Development', value: '4', change: 'Launch in Q2' },
  { label: 'Archived', value: '3', change: 'Review backlog' },
];

const stageProgress = [
  { label: 'Discovery', percent: 65 },
  { label: 'Build', percent: 80 },
  { label: 'QA', percent: 45 },
  { label: 'Launch', percent: 25 },
];

const productRows = [
  { name: 'EEC', id: 'PROD-001', status: 'Active', statusClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', modules: 'Authentication, Billing' },
  { name: 'EHC', id: 'PROD-002', status: 'In Development', statusClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', modules: 'Reporting, User Management' },
  { name: 'ERMS', id: 'PROD-003', status: 'Active', statusClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', modules: 'User Management, Billing' },
  { name: 'EFNB', id: 'PROD-004', status: 'Archived', statusClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', modules: 'Authentication, Reporting' },
];

const editProduct = {
  name: 'EEC',
  id: 'PROD-001',
  description: 'The core enterprise client platform.',
  status: 'Active',
  modules: ['Authentication', 'Billing', 'Reporting', 'User Management'],
};

const ProductManagement = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black leading-tight text-neutral-900 dark:text-white">Product Management</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Track all products, their lifecycle stages, and associated modules.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-base">download</span>
                Export
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                <span className="material-symbols-outlined text-base">add</span>
                New Product
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{card.label}</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white">{card.value}</p>
                <p className="text-xs font-semibold text-primary">{card.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Lifecycle Breakdown</p>
                <span className="text-xs text-neutral-500">Active products</span>
              </div>
              <div className="space-y-4">
                {stageProgress.map((stage) => (
                  <div key={stage.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-neutral-700 dark:text-neutral-200">{stage.label}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">{stage.percent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${stage.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Status Overview</p>
              <div className="mt-4 space-y-3">
                {summaryCards.map((card) => (
                  <div key={card.label} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">{card.label}</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">{card.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Product Catalog</h2>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search products..."
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">ID</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Modules</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {productRows.map((product) => (
                    <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{product.id}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${product.statusClass}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{product.modules}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-3 text-neutral-500">
                          <button className="hover:text-primary dark:hover:text-primary">
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button className="hover:text-red-600 dark:hover:text-red-500">
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="sticky top-8 space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Product: {editProduct.name}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Update attributes and module assignments.</p>
          </div>
          <form className="space-y-4">
            <label className="flex flex-col text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Product Name
              <input
                className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                defaultValue={editProduct.name}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Product ID
              <input
                className="mt-1 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                value={editProduct.id}
                disabled
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Description
              <textarea
                rows={4}
                className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                defaultValue={editProduct.description}
              ></textarea>
            </label>
            <label className="flex flex-col text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Status
              <select className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" defaultValue={editProduct.status}>
                <option>Active</option>
                <option>In Development</option>
                <option>Archived</option>
              </select>
            </label>
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Associated Modules</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-700 dark:text-neutral-200">
                {editProduct.modules.map((module) => (
                  <label key={module} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50" />
                    {module}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <button
                type="button"
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
};

export default ProductManagement;
