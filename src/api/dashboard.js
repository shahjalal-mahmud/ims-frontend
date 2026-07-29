// src/api/dashboard.js
// Single-endpoint wrapper for the Dashboard summary.
//
// Called by src/queries/useDashboardQuery.js. Returns the raw Axios
// response (consistent with the other api/* modules) so the caller can
// read the unwrapped `response.data.data` payload.
//
// Endpoint contract: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.2

import client from './client';

/**
 * GET /dashboard/summary.php
 * Auth: Yes.
 * Success 200 → { success, data: { totalProducts, totalCategories,
 *   totalSuppliers, totalStockUnits, lowStockCount, recentActivity: [...] } }.
 * Errors: 401 (handled globally), 500.
 */
export function getDashboardSummary() {
  return client.get('/dashboard/summary.php');
}
