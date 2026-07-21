// src/queries/useDashboardQuery.js
// Dashboard query hook — single read for `/dashboard/summary.php`.
// See docs/State_Management.md §1.
//
// We do not retry on 401 or 404 (transient retries won't help; the global
// interceptor already handles 401). 500 + network are retried using the
// QueryClient default.

import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api/dashboard';
import { queryKeys } from '../lib/queryKeys';

/**
 * useDashboardSummary()
 * Returns the dashboard summary shape:
 *   { totalProducts, totalCategories, totalSuppliers, totalStockUnits,
 *     lowStockCount, recentActivity: [...] }
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const { data } = await getDashboardSummary();
      return data.data;
    },
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 404) return false;
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
}