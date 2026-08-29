import { useQueryClient } from '@tanstack/react-query';
import { QK } from '../utils/queryKeys';

// Every portfolio-hierarchy mutation touches more than one screen (a status
// change moves Overview counters, the Activity feed, the portfolio card, and
// possibly the asset itself) — spec §24 "no manual page refresh should be
// required". Centralising the fan-out here means every mutation call site
// invalidates the same consistent set instead of hand-picking keys and
// forgetting one.
export const usePortfolioInvalidate = () => {
  const queryClient = useQueryClient();

  return ({ portfolioId, categoryId, assetId } = {}) => {
    if (portfolioId) {
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.tree(portfolioId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.portfolioHealth(portfolioId) });
    }
    if (categoryId) {
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.category(categoryId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.categoryStats(categoryId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.overview(categoryId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.health(categoryId) });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'activity', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'assets', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'tasks', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'files', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metrics', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metricsTimeseries', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'metricsByAsset', categoryId] });
    }
    if (assetId) {
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.asset(assetId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.assetTransitions(assetId) });
      queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'assetHistory', assetId] });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.assetVersions(assetId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.comments(assetId) });
      queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.relations(assetId) });
    }
  };
};
