import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { portfolioHierarchyApi } from '../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../utils/queryKeys';
import DropdownMenu from '../../ui/DropdownMenu';
import Skeleton from '../../ui/Skeleton';
import PortfolioBreadcrumb from './PortfolioBreadcrumb';
import { UserAvatar } from './UserPicker';
import { HealthPill } from './PortfolioStatusPills';
import { timeAgo } from './portfolioStatus';
import { getAccent } from './portfolioTheme';
import CategoryOverviewTab from './tabs/CategoryOverviewTab';
import CategoryAssetsTab from './tabs/CategoryAssetsTab';
import AssetCreateDrawer from './tabs/AssetCreateDrawer';
import CategoryTasksTab from './tabs/CategoryTasksTab';
import CategoryActivityTab from './tabs/CategoryActivityTab';
import CategoryFilesTab from './tabs/CategoryFilesTab';
import CategoryMetricsTab from './tabs/CategoryMetricsTab';
import CategorySettingsTab from './tabs/CategorySettingsTab';

const unwrap = (res) => res?.data ?? res ?? {};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'activity', label: 'Activity' },
  { id: 'files', label: 'Files' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'settings', label: 'Settings' },
];

const CategoryWorkspacePage = () => {
  const { portfolioId, categoryId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const categoryQuery = useQuery({
    queryKey: QK.portfolioHierarchy.category(categoryId),
    queryFn: () => portfolioHierarchyApi.getCategory(token, categoryId),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.category(categoryId)),
  });
  const category = unwrap(categoryQuery.data);

  const groupQuery = useQuery({
    queryKey: QK.portfolioHierarchy.group(category.groupId),
    queryFn: () => portfolioHierarchyApi.getGroup(token, category.groupId),
    enabled: Boolean(token && category.groupId),
    ...cachePolicyFor(QK.portfolioHierarchy.group(category.groupId)),
  });
  const group = unwrap(groupQuery.data);

  // Same query (and cache entry) CategoryOverviewTab uses for the Overview tab
  // body — sharing it here means the header's health pill / % complete never
  // triggers a second round trip when that tab is the active one, and both
  // read from one in-flight request when it isn't.
  const overviewQuery = useQuery({
    queryKey: QK.portfolioHierarchy.overview(categoryId),
    queryFn: () => portfolioHierarchyApi.getCategoryOverview(token, categoryId),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.overview(categoryId)),
  });
  const overview = unwrap(overviewQuery.data);
  const health = overview.health || {};
  const pct = overview.execution?.pct ?? 0;

  const accent = getAccent(category.accent);
  const owner = category.ownerId && typeof category.ownerId === 'object' ? category.ownerId : null;

  const openAsset = (assetId) => navigate(`/admin/digital-portfolio/${portfolioId}/category/${categoryId}/asset/${assetId}`);

  if (categoryQuery.isLoading) {
    return <main className="portal-page"><div className="portal-page-inner"><Skeleton className="h-40 rounded-2xl" /></div></main>;
  }

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <PortfolioBreadcrumb
          items={[
            { label: 'Digital Portfolios', to: '/admin/digital-portfolio' },
            { label: group.title || '…' },
            { label: category.title || 'Category' },
          ]}
        />

        <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.soft} ${accent.text}`}>
                <span className="material-symbols-outlined text-[22px]">{category.icon || 'folder_open'}</span>
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-neutral-900 dark:text-white sm:text-xl">{category.title}</h1>
                <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
                  {category.purpose || category.description || 'No purpose has been added for this category yet.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <HealthPill value={health.status} />
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{pct}% Complete</span>
                  {owner && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <UserAvatar user={owner} size={18} />
                      Owner: {owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">Last updated {timeAgo(category.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                New Asset
              </button>
              <DropdownMenu
                items={[
                  { label: 'Edit settings', icon: 'settings', onClick: () => setActiveTab('settings') },
                ]}
              />
            </div>
          </div>
        </header>

        <div className="portal-tab-strip border-b border-neutral-200 dark:border-neutral-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <CategoryOverviewTab categoryId={categoryId} onGoToTab={setActiveTab} />}
        {activeTab === 'assets' && (
          <CategoryAssetsTab
            portfolioId={portfolioId}
            categoryId={categoryId}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            onOpenAsset={openAsset}
            onNewAsset={() => setCreateOpen(true)}
          />
        )}
        {activeTab === 'tasks' && <CategoryTasksTab portfolioId={portfolioId} categoryId={categoryId} />}
        {activeTab === 'activity' && <CategoryActivityTab categoryId={categoryId} />}
        {activeTab === 'files' && <CategoryFilesTab portfolioId={portfolioId} categoryId={categoryId} />}
        {activeTab === 'metrics' && <CategoryMetricsTab portfolioId={portfolioId} categoryId={categoryId} />}
        {activeTab === 'settings' && <CategorySettingsTab portfolioId={portfolioId} categoryId={categoryId} category={category} />}
      </div>

      <AssetCreateDrawer
        open={createOpen}
        onClose={(newAssetId) => { setCreateOpen(false); if (newAssetId) openAsset(newAssetId); }}
        portfolioId={portfolioId}
        categoryId={categoryId}
        category={category}
      />
    </main>
  );
};

export default CategoryWorkspacePage;
