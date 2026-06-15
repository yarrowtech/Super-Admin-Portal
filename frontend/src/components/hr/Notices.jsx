import React from 'react';

const tabs = [
  { label: 'Active (3)', active: true },
  { label: 'Scheduled (1)', active: false },
  { label: 'Archived (12)', active: false },
];

const announcements = [
  {
    title: 'Welcome New Hires - August 2024',
    audience: 'Company-Wide',
    date: 'Aug 01, 2024',
    status: { label: 'Published', className: 'bg-success/10 text-success', dot: 'bg-success' },
  },
  {
    title: 'Updated Holiday Schedule for Q4',
    audience: 'Company-Wide',
    date: 'Jul 25, 2024',
    status: { label: 'Published', className: 'bg-success/10 text-success', dot: 'bg-success' },
  },
  {
    title: 'Engineering All-Hands Meeting',
    audience: 'Engineering',
    date: 'Jul 22, 2024',
    status: {
      label: 'Draft',
      className: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
      dot: 'bg-neutral-500',
    },
  },
];

const Notices = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex min-w-72 flex-col gap-3">
            <p className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              HR Notices &amp; Announcements
            </p>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              Create, manage, and publish company-wide announcements.
            </p>
          </div>
          <button className="flex h-10 min-w-[84px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              add
            </span>
            <span className="truncate">Create New</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">New Announcement</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-100" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Annual Company Offsite"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-100" htmlFor="content">
                  Content
                </label>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-600">
                  <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-2 dark:border-neutral-600">
                    {['format_bold', 'format_italic', 'format_underlined'].map((icon) => (
                      <button key={icon} className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                          {icon}
                        </span>
                      </button>
                    ))}
                    <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-600"></div>
                    {['format_list_bulleted', 'format_list_numbered'].map((icon) => (
                      <button key={icon} className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                          {icon}
                        </span>
                      </button>
                    ))}
                    <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-600"></div>
                    {['link', 'image'].map((icon) => (
                      <button key={icon} className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                          {icon}
                        </span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="content"
                    rows={8}
                    placeholder="Start writing your announcement here..."
                    className="w-full resize-none bg-transparent p-3 text-sm text-neutral-800 placeholder:text-neutral-600 focus:outline-none dark:text-neutral-100"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Publishing Options</h2>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-100" htmlFor="audience">
                  Audience
                </label>
                <select
                  id="audience"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-100"
                  defaultValue="company"
                >
                  <option value="company">Company-Wide</option>
                  <option value="engineering">Engineering</option>
                  <option value="design">Design</option>
                  <option value="sales">Sales</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-800 dark:text-neutral-100" htmlFor="publish-date">
                  Publish Date
                </label>
                <input
                  id="publish-date"
                  type="date"
                  defaultValue="2024-08-15"
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary dark:border-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-100"
                />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button className="flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white">
                  Publish Now
                </button>
                <button className="flex h-10 items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-bold text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                  Schedule for Later
                </button>
                <button className="text-sm font-medium text-primary">Save as Draft</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                className={`px-4 py-3 text-sm ${
                  tab.active
                    ? 'font-semibold text-primary border-b-2 border-primary'
                    : 'font-medium text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-b-xl border-x border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Title</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Audience</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Published Date</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((announcement) => (
                  <tr key={announcement.title} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                    <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {announcement.title}
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{announcement.audience}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{announcement.date}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${announcement.status.className}`}
                      >
                        <span className={`size-1.5 rounded-full ${announcement.status.dot}`}></span>
                        {announcement.status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right text-sm text-neutral-600 dark:text-neutral-400">
                      {['edit', 'archive', 'delete'].map((icon) => (
                        <button
                          key={`${announcement.title}-${icon}`}
                          className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                            {icon}
                          </span>
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Notices;
