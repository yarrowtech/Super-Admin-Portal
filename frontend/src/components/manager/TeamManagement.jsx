import React from 'react';

const filters = {
  departments: ['All Departments', 'Engineering', 'Design', 'Marketing', 'Finance'],
  statuses: ['All Statuses', 'Hiring', 'At Capacity', 'Paused'],
};

const teamRows = [
  {
    name: 'Team EEC',
    department: 'Engineering',
    members: 12,
    lead: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAv90Dv0ngG_fdukdx2lpCe_foDFKmgMxFOgwME4ya8YQmELcfKoYZf936q8aipwS14skpG72wJWGcbj0zlpSvLhE2cIcFvWBva-7mlNNa_pMe3OJYw7mB5kiBafxGKpGH8UrJAM0s5OZacFpogEld224iipbKP4QopfA_npNzN9bwsV0yVll53LVhacW1edRw3xYgN-ja03GIReY61NW4rV8w2S938-gYVI0qoK2e04ixyDFZOuCwXaVnTU_9hpEKA2jyPK2J6OVd1',
  },
  {
    name: 'Design Mavericks',
    department: 'Design',
    members: 5,
    lead: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMdELkF8D_86oQJW6MEqhc5XDhGng4bNgMX98BQNJicFdNzbvIWz14zbsH5KF1PszAYaM9XhFTgCQRb9qdkCmyAiI5vEw7ffzCDJXjmAyh5Hbt9r7LqlEsS70YtYOxBSwnsYzU0jpQ0JFBKnoWUW7BoZaqWIoO9Vj_Ewsv7LPFTRW3SHYJCMpA1zQIao5pzXrs6ZutUaBcgUy91Al5drk8udnOeUF_O2OrM8Y744Uuyy3KOmtIa2qUkWflX8Y1uypHLXHysB0NCT3f',
  },
  {
    name: 'QA Legends',
    department: 'Quality Assurance',
    members: 6,
    lead: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAkY6NpuCw7-UonpdrQglvbr2oBDsft4gBPRz46WJPtuKItznV7nM1CMhWuI8qNOi5LFvurZigEJ0TBFUSP-0K5Aq9522ID8bHhRl9lU6ASPq_Mt1NxIarxOpsQsZ-rp1BfqkletZSk3HtIGFPVQtlRpGP8U7sqX3mVeSNjFO8CrKouOd5lTrX_s60Swjs0-FMogG_gLGmk6RXCMC72sZTYJCuZgd1qQdtANn70kaaLpWe27vxXqqFkBpkZd3sXJd_4CWbHd9FQVXUW',
  },
  {
    name: 'Marketing Gurus',
    department: 'Marketing',
    members: 7,
    lead: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDk7gNShtZIkL3LpnGF1sR1aYqcxNAvlUZNTPQI09NgrFZR8k-2lgXWrmpkJxQIPe8Sy3F_N5EAet4aUm96nbSM8iGmFH2pfCQx3vpIMNwQCqJHzsM29TRFMK6feAC8miVBwACGgq1lYpX7ZNcXcm2CmGYqZgI021VFXOn_uP7DNzgixLl2GqAl1ZfhN875M_QKXoF07E8F4XpnWzD5xNg6KEZAQo6Eeu_ZgRAKpndzOsp15qWNPayaf4MrRfxUVS1IZ1-HMqaOYfgi',
  },
];

const selectedTeam = {
  name: 'Design Mavericks',
  description: 'A multidisciplinary squad focused on the new mobile experience for EEC.',
  metrics: [
    { label: 'Active Members', value: '5' },
    { label: 'Open Projects', value: '3' },
    { label: 'Hiring Plan', value: '2 roles' },
  ],
  members: [
    {
      name: 'Michael Chen',
      role: 'Lead Designer',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCMdELkF8D_86oQJW6MEqhc5XDhGng4bNgMX98BQNJicFdNzbvIWz14zbsH5KF1PszAYaM9XhFTgCQRb9qdkCmyAiI5vEw7ffzCDJXjmAyh5Hbt9r7LqlEsS70YtYOxBSwnsYzU0jpQ0JFBKnoWUW7BoZaqWIoO9Vj_Ewsv7LPFTRW3SHYJCMpA1zQIao5pzXrs6ZutUaBcgUy91Al5drk8udnOeUF_O2OrM8Y744Uuyy3KOmtIa2qUkWflX8Y1uypHLXHysB0NCT3f',
    },
    {
      name: 'Emily Rodriguez',
      role: 'UX Researcher',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAv90Dv0ngG_fdukdx2lpCe_foDFKmgMxFOgwME4ya8YQmELcfKoYZf936q8aipwS14skpG72wJWGcbj0zlpSvLhE2cIcFvWBva-7mlNNa_pMe3OJYw7mB5kiBafxGKpGH8UrJAM0s5OZacFpogEld224iipbKP4QopfA_npNzN9bwsV0yVll53LVhacW1edRw3xYgN-ja03GIReY61NW4rV8w2S938-gYVI0qoK2e04ixyDFZOuCwXaVnTU_9hpEKA2jyPK2J6OVd1',
    },
    {
      name: 'David Kim',
      role: 'Visual Designer',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAkY6NpuCw7-UonpdrQglvbr2oBDsft4gBPRz46WJPtuKItznV7nM1CMhWuI8qNOi5LFvurZigEJ0TBFUSP-0K5Aq9522ID8bHhRl9lU6ASPq_Mt1NxIarxOpsQsZ-rp1BfqkletZSk3HtIGFPVQtlRpGP8U7sqX3mVeSNjFO8CrKouOd5lTrX_s60Swjs0-FMogG_gLGmk6RXCMC72sZTYJCuZgd1qQdtANn70kaaLpWe27vxXqqFkBpkZd3sXJd_4CWbHd9FQVXUW',
    },
  ],
};

const TeamManagement = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 dark:text-white">Team Management</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Organize and manage teams across different departments.
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">add</span>
              Create New Team
            </button>
          </header>

          <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40 sm:flex-row">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Search</label>
              <div className="mt-2 flex h-11 items-center rounded-lg border border-neutral-200 bg-white shadow-sm transition dark:border-neutral-700 dark:bg-neutral-900/60">
                <span className="flex h-full items-center border-r border-neutral-200 px-3 text-neutral-400 dark:border-neutral-800">
                  <span className="material-symbols-outlined text-base">search</span>
                </span>
                <input
                  className="flex-1 bg-transparent px-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-white dark:placeholder:text-neutral-500"
                  placeholder="Search teams or owners"
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="flex-1 text-xs font-semibold uppercase text-neutral-500">
                Department
                <select className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                  {filters.departments.map((dep) => (
                    <option key={dep}>{dep}</option>
                  ))}
                </select>
              </label>
              <label className="flex-1 text-xs font-semibold uppercase text-neutral-500">
                Status
                <select className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                  {filters.statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-3 text-left">Team Name</th>
                  <th className="px-6 py-3 text-left">Department</th>
                  <th className="px-6 py-3 text-left">Members</th>
                  <th className="px-6 py-3 text-left">Lead</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {teamRows.map((team) => (
                  <tr key={team.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-white">{team.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{team.department}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{team.members}</td>
                    <td className="px-6 py-4">
                      <div
                        className="size-8 rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${team.lead})` }}
                      ></div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-4">
                        <button className="text-primary hover:text-primary/80">Edit</button>
                        <button className="text-red-600 hover:text-red-500">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Team Details</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedTeam.name}</p>
            </div>
            <button className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <span className="material-symbols-outlined">edit</span>
            </button>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{selectedTeam.description}</p>
          <div className="grid grid-cols-3 gap-3">
            {selectedTeam.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg bg-neutral-100 p-3 text-center text-sm font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-white">
                <p className="text-xl">{metric.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{metric.label}</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Members</h3>
            <div className="space-y-3">
              {selectedTeam.members.map((member) => (
                <div key={member.name} className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
                  <img src={member.avatar} alt={member.name} className="size-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.role}</p>
                  </div>
                  <button className="ml-auto text-xs font-semibold text-primary">View</button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
            Need to update team staffing? <span className="font-semibold text-primary">Open hiring workflow</span>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default TeamManagement;
