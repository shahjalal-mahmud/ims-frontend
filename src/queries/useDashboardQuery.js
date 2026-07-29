// src/queries/useDashboardQuery.js
// Single-endpoint hook for the Dashboard summary.
//
// Read-only — no mutations. The dashboard is invalidated by other
// hooks (stock-in, stock-out, product writes, etc.) when their data
// affects the KPI tiles, per docs/State_Management.md §1.
//
// We do not retry on 401 or 404 — transient retries won't help, and
// the global 401 interceptor already handles session expiry. 500 +
// network fall back to the QueryClient default (one retry).

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