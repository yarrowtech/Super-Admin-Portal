import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const Card = ({ title, children }) => (
  <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
    {children}
  </section>
);

const Shell = ({ title, subtitle, children }) => (
  <main className="flex-1 overflow-y-auto p-4 md:p-5">
    <div className="mx-auto w-full max-w-[1200px] space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">{title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
      </header>
      {children}
    </div>
  </main>
);

export const MediaDepartmentPortal = () => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [content, setContent] = useState([]);

  useEffect(() => {
    (async () => {
      const [d, c, k] = await Promise.all([
        departmentApi.getMediaDashboard(token),
        departmentApi.getMediaCampaigns(token),
        departmentApi.getMediaContent(token),
      ]);
      setDashboard(d?.data || {});
      setCampaigns(c?.data?.campaigns || []);
      setContent(k?.data?.content || []);
    })();
  }, [token]);

  return (
    <Shell title="Media Dashboard" subtitle="Campaign and content operations">
      <Card title="Overview">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{dashboard?.message || 'Loading...'}</p>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Campaigns">
          <p className="text-sm text-neutral-500">{campaigns.length} campaign items</p>
        </Card>
        <Card title="Content Library">
          <p className="text-sm text-neutral-500">{content.length} content items</p>
        </Card>
      </div>
    </Shell>
  );
};

export const SalesDepartmentPortal = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    departmentApi.getSalesDashboard(token).then((res) => setData(res?.data || null));
  }, [token]);

  return (
    <Shell title="Sales Dashboard" subtitle="Pipeline, leads and growth metrics">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Total Leads"><p className="text-2xl font-bold">{data?.totalLeads ?? 0}</p></Card>
        <Card title="Pipeline Value"><p className="text-2xl font-bold">{data?.totalPipelineValue ?? 0}</p></Card>
        <Card title="Stages"><p className="text-2xl font-bold">{(data?.pipelineByStage || []).length}</p></Card>
      </div>
    </Shell>
  );
};

export const ResearchDepartmentPortal = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    departmentApi.getResearchDashboard(token).then((res) => setData(res?.data || null));
  }, [token]);

  return (
    <Shell title="Research Operator Dashboard" subtitle="Research operations and records">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Total Records"><p className="text-2xl font-bold">{data?.totalRecords ?? 0}</p></Card>
        <Card title="Departments"><p className="text-2xl font-bold">{(data?.departmentStats || []).length}</p></Card>
        <Card title="Recent Records"><p className="text-2xl font-bold">{(data?.recentRecords || []).length}</p></Card>
      </div>
    </Shell>
  );
};

