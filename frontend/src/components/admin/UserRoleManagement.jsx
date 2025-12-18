import React, { useCallback, useState } from 'react';

const stats = [
  { label: 'Active Roles', value: '12', change: '+2 this week' },
  { label: 'Pending Approvals', value: '5', change: '3 urgent' },
  { label: 'Teams Covered', value: '8', change: 'Enterprise-wide' },
];

const teams = [
  { name: 'Executive Team', members: 4 },
  { name: 'Product & Design', members: 18 },
  { name: 'Engineering', members: 42 },
  { name: 'Marketing', members: 15 },
];

const people = [
  {
    name: 'Koushik Bala',
    email: 'koushikbala54@gmail.com',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBexYXG10WxoXa8ojfJ5FL2l7YD9ba6S2SgpUem5ApHK1pCFc6bvH4sy8Fi_o4Hl3K2x4y8oRxQL-MEi3Gu9J3ghkoWBDevRYL6EAdmPDP_w_Jk4zkIgl8hG5RHnIASuEX-IqKGoHUnQdOklJCwn-0m56kZIv12qoeMo5NhseGAnEOvZIQNrSta77-1YgMHzIYnKzfEWT813TgmJNrK5X_bsWTDOAyDtVy0ij9h0RbJm02il8U-YlsZIg1MwO0xvEx08FLAa7w-2nO4',
    role: 'Admin',
    active: true,
  },
  {
    name: 'Boby Peter Mondal',
    email: 'boby.peter@gmail.com',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDh-dgARhehegTzzGTLScxYBxeETK334s114iBiDx2rlmgHrC3D3z3OseT-Zu7_SObZUBmLut6pyBUXeWcofaUTGZSydSUKl2Y90sR8L64Q-PCzEIm6brqqNdS69TiUSEv9Nt31ok1jrvrUH6cwIGzqVTX2-B6CHgWBbeGh3ztgGAqc3xDWVfevy7bK-zGF1HPJGYqd8hYsrcjYtv06TePjHmLHYxeJT8BFeqDCdbgBlxIu3695W5w3Lcs0k06M4Y6tYSk7WhB12W96',
    role: 'Manager',
  },
  {
    name: 'Raktim Maity',
    email: 'raktim.maity@gmail.com',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDk7gNShtZIkL3LpnGF1sR1aYqcxNAvlUZNTPQI09NgrFZR8k-2lgXWrmpkJxQIPe8Sy3F_N5EAet4aUm96nbSM8iGmFH2pfCQx3vpIMNwQCqJHzsM29TRFMK6feAC8miVBwACGgq1lYpX7ZNcXcm2CmGYqZgI021VFXOn_uP7DNzgixLl2GqAl1ZfhN875M_QKXoF07E8F4XpnWzD5xNg6KEZAQo6Eeu_ZgRAKpndzOsp15qWNPayaf4MrRfxUVS1IZ1-HMqaOYfgi',
    role: 'Viewer',
  },
];

const assignments = [
  { category: 'Platform Roles', values: ['Super Admin', 'Finance Admin', 'Workflow Builder'] },
  { category: 'Permissions', values: ['Can publish content', 'Can manage security policies', 'Can invite new admins'] },
];

const activity = [
  { action: 'Role updated to Finance Admin', time: '2 hours ago' },
  { action: 'Added to Workflow Builder group', time: 'Yesterday' },
  { action: 'Reset MFA device', time: '3 days ago' },
];

const UserRoleManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddUserClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    // For now, just close the modal after submission; integrate API later.
    setIsModalOpen(false);
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              User &amp; Role Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Create, edit, and manage user roles and permissions across all products.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAddUserClick}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Add User
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">settings</span>
              Manage Roles
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stat.value}</p>
              <p className="text-xs font-semibold text-primary">{stat.change}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-6">
          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Search Users</label>
              <div className="mt-2 flex h-11 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <span className="flex items-center px-3 text-neutral-500 dark:text-neutral-400">
                  <span className="material-symbols-outlined text-base">search</span>
                </span>
                <input
                  className="flex-1 bg-transparent pr-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-100"
                  placeholder="Name or email"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Teams</h3>
              <div className="mt-3 space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.name}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <span>{team.name}</span>
                    <span className="text-xs text-neutral-500">{team.members}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">People</h3>
              <div className="space-y-2">
                {people.map((person) => (
                  <div
                    key={person.email}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <img src={person.avatar} alt={person.name} className="size-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{person.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{person.email}</p>
                    </div>
                    {person.role && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{person.role}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-3">
            <div className="flex flex-col items-center text-center">
              <img
                src={people[0].avatar}
                alt={people[0].name}
                className="mb-4 size-24 rounded-full border-4 border-white shadow dark:border-neutral-800"
              />
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{people[0].name}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{people[0].email}</p>
              <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span className="material-symbols-outlined text-base">verified</span>
                  Active
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Primary Owner</span>
              </div>
            </div>
            {assignments.map((group) => (
              <div key={group.category}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{group.category}</p>
                  <button className="text-xs font-semibold text-primary">Edit</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <span key={value} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Need to escalate access? <span className="font-semibold text-primary">Start approval workflow</span>
            </div>
          </div>

          <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-1">
            <div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Access Level</h3>
              <select className="mt-2 w-full rounded-lg border-neutral-200 text-sm shadow-sm focus:border-primary focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                <option>Full Platform Admin</option>
                <option>Finance Admin</option>
                <option>Content Editor</option>
              </select>
              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
                  Require MFA
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50" />
                </label>
                <label className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
                  Temporary access
                  <input type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50" />
                </label>
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Activity</h3>
              <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                {activity.map((item) => (
                  <div key={item.action} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/80">
                    <p className="font-medium text-neutral-800 dark:text-neutral-100">{item.action}</p>
                    <p className="text-xs text-neutral-500">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Add New User</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Invite a member and assign their primary role.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Full Name</label>
                <input
                  required
                  type="text"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Koushik Bala"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Email Address</label>
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="koushikbala54@gmail.com"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Primary Role</label>
                  <select className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Department</label>
                  <select className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                    <option>Operations</option>
                    <option>Technology</option>
                    <option>IT</option>
                    <option>Compliance</option>
                    <option>Media</option>
                    <option>LAW</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/50" />
                Require MFA on first login
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-base">Add</span>
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default UserRoleManagement;
