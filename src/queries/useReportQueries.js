// src/queries/useReportQueries.js
// Reports hooks — four read-only endpoints.
//
// Keys centralized in src/lib/queryKeys.js (see that file for why a
// shared factory instead of inline arrays):
//   reportInventory   — ['reports', 'inventory', categoryId]
//   reportLowStock    — ['reports', 'lowStock']
//   reportStockIn     — ['reports', 'stockIn', range]
//   reportStockOut    — ['reports', 'stockOut', range]
//
// IMPORTANT: the Dashboard's low-stock widget reuses
// `useLowStockReport()` so the Dashboard and the dedicated
// /reports/low-stock page share ONE cache entry (Milestone 8 wiring).
// Don't accidentally rename the key or split the two surfaces.
//
// Retry policy (State_Management.md §1): no retry on 401/404/409/422 —
// these are not transient. 500 + network use the QueryClient default.
//
// 422 on the date-range reports is handled at the call site (page-level
// error banner / form errors) rather than globally, since the documented
// behavior is "startDate must be before endDate" shown near the inputs.

import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import {
  getInventoryReport,
  getLowStockReport,
  getStockInReport,
  getStockOutReport,
} from '../api/reports';
import { queryKeys } from '../lib/queryKeys';

// Shared retry helper — disable on non-transient statuses.
function defaultRetry(failureCount, error) {
  const status = error?.response?.status;
  if (status === 401 || status === 404 || status === 409 || status === 422) {
    return false;
  }
  return failureCount < 1;
}

/**
 * useInventoryReport(categoryId?)
 * GET /reports/inventory.php?categoryId=
 *
 * Returns the unwrapped payload:
 *   { items: [{ productId, productName, category, supplier, quantity,
 *     purchasePrice, sellingPrice, stockValue }],
 *     totals: { totalQuantity, totalStockValue } }
 *
 * `categoryId` is the optional filter. Pass `undefined` / `''` for "all".
 * `placeholderData: keepPreviousData` keeps the table stable across
 * category filter changes (State_Management.md §1).
 */
export function useInventoryReport(categoryId) {
  const params = { categoryId: categoryId || undefined };
  return useQuery({
    queryKey: queryKeys.reportInventory(categoryId || null),
    queryFn: async () => {
      const { data } = await getInventoryReport(params);
      return data.data; // { items, totals }
    },
    placeholderData: keepPreviousData,
    retry: defaultRetry,
    staleTime: 30_000,
  });
}

/**
 * useLowStockReport()
 * GET /reports/low_stock.php
 *
 * Returns the unwrapped payload — an array of:
 *   { productId, productName, quantity, minStockLevel, shortBy }
 *
 * The same hook backs the Dashboard low-stock widget and the dedicated
 * /reports/low-stock page (UI Screens §10 / Milestone 8 exit criteria).
 */
export function useLowStockReport() {
  return useQuery({
    queryKey: queryKeys.reportLowStock,
    queryFn: async () => {
      const { data } = await getLowStockReport();
      return data.data; // array
    },
    retry: defaultRetry,
    staleTime: 30_000,
  });
}

/**
 * useStockInReport(range?)
 * GET /reports/stock_in_report.php?startDate=&endDate=
 *
 * `range` shape: { startDate?: 'YYYY-MM-DD', endDate?: 'YYYY-MM-DD' }.
 * Both dates optional. 422 on bad range is surfaced to the page.
 *
 * Returns: { items: [...], totals: { totalQuantityIn, totalCost } }
 */
export function useStockInReport(range = {}) {
  return useQuery({
    queryKey: queryKeys.reportStockIn(range),
    queryFn: async () => {
      const { data } = await getStockInReport(range);
      return data.data; // { items, totals }
    },
    placeholderData: keepPreviousData,
    retry: defaultRetry,
    staleTime: 30_000,
  });
}

/**
 * useStockOutReport(range?)
 * GET /reports/stock_out_report.php?startDate=&endDate=
 *
 * Same shape as useStockInReport, totals: { totalQuantityOut, totalRevenue }.
 */
export function useStockOutReport(range = {}) {
  return useQuery({
    queryKey: queryKeys.reportStockOut(range),
    queryFn: async () => {
      const { data } = await getStockOutReport(range);
      return data.data; // { items, totals }
    },
    placeholderData: keepPreviousData,
    retry: defaultRetry,
    staleTime: 30_000,
  });
}