const DashboardLayout = ({ sidebar, header, children }) => (
  <div className="flex min-h-screen overflow-x-clip bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    {sidebar}
    <div className="flex min-w-0 flex-1 flex-col lap:ml-64">
      {header}
      <main className="responsive-page min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>
);

export default DashboardLayout;
