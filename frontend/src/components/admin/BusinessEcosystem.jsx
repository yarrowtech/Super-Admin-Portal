import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canEnterPortal } from '../../utils/rbac';

const workspaces = [
  ['Revenue', 'CRM & Sales', '/admin/crm', 'Customer pipeline, contacts, follow-ups and campaigns.'],
  ['Money', 'Finance', '/finance/dashboard', 'Invoices, payments, budgets, accounting and financial review.'],
  ['People', 'Human Resources', '/hr/dashboard', 'Recruitment, attendance, leave and performance.'],
  ['Delivery', 'Projects & Products', '/admin/projects', 'Project workspaces, memberships and connected products.'],
  ['Delivery', 'Outsourcing', '/admin/outsourcing', 'Freelancers, jobs, contracts and delivery tracking.'],
  ['Operations', 'IT Operations', '/it/dashboard', 'Service desk, assets, access and infrastructure.'],
  ['Governance', 'Legal & Compliance', '/law/dashboard', 'Legal documents, contracts, policies and disputes.'],
  ['Growth', 'Media', '/media/dashboard', 'Creative projects, campaigns and asset delivery.'],
  ['Operations', 'Customer Support', '/admin/support-center', 'Support requests across the portal ecosystem.'],
  ['Governance', 'Reports', '/admin/reports', 'Company reporting and performance analysis.'],
  ['Platform', 'Integrations', '/admin/api-management', 'API configuration and connected application management.'],
  ['Governance', 'Identity & Access', '/admin/users', 'Users, roles and account administration.'],
];

const journeys = [
  { name: 'Lead to cash', steps: 'CRM → Contract → Project → Invoice → Payment', gap: 'Next: connect CRM and Finance customer identities before automating customer handoffs.', path: '/admin/crm' },
  { name: 'Hire to delivery', steps: 'Recruitment → Employee → Access → Task → Performance', gap: 'Next: define onboarding ownership and access approvals across HR and IT.', path: '/hr/dashboard' },
  { name: 'Request to settlement', steps: 'Request → Approval → Vendor → Expense → Settlement', gap: 'Next: standardize approval status and traceability across departments.', path: '/finance/dashboard' },
];

export default function BusinessEcosystem() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const visible = workspaces.filter((workspace) => canEnterPortal(user, workspace[2].split('/')[1]) && workspace.join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <section aria-labelledby="ecosystem-title" className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Business ecosystem</p>
          <h2 id="ecosystem-title" className="mt-1 text-xl font-semibold">One place to navigate your business</h2>
          <p className="mt-2 max-w-3xl text-sm text-neutral-500">Explore existing workspaces and the business journeys that connect them. Your account permissions apply in every workspace.</p>
        </div>
        <label className="text-sm">Find a workspace
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search finance, people, projects…" className="mt-1 block w-full rounded-xl border border-neutral-300 bg-transparent p-2 dark:border-neutral-700 sm:w-72" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map(([group, name, path, description]) => (
          <Link key={name} to={path} className="rounded-xl border border-neutral-200 p-4 transition hover:border-indigo-500 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-neutral-700 dark:hover:bg-neutral-800">
            <p className="text-xs text-neutral-500">{group}</p>
            <h3 className="mt-1 font-semibold">{name} <span aria-hidden="true">↗</span></h3>
            <p className="mt-2 text-sm text-neutral-500">{description}</p>
          </Link>
        ))}
      </div>
      {visible.length === 0 && <p role="status" className="text-sm text-neutral-500">No matching workspaces. Try another search.</p>}
      <details className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
        <summary className="cursor-pointer font-semibold">Business journeys & integration priorities</summary>
        <p className="mt-2 text-sm text-neutral-500">Planning guidance from the source review on 24 November 2026. These journeys are proposed connections; this view does not execute automation or report live integration health.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {journeys.filter(journey => canEnterPortal(user, journey.path.split('/')[1])).map((journey) => <div key={journey.name}>
            <h3 className="font-semibold">{journey.name}</h3>
            <p className="mt-2 text-sm">{journey.steps}</p>
            <p className="mt-2 text-sm text-neutral-500">{journey.gap}</p>
            <Link to={journey.path} className="mt-3 inline-block text-sm font-semibold text-indigo-600 underline dark:text-indigo-300">Open workspace</Link>
          </div>)}
        </div>
      </details>
    </section>
  );
}
