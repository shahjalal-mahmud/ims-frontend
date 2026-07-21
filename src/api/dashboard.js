// src/api/dashboard.js
// Dashboard API module. Single endpoint: GET /dashboard/summary.php.
// Endpoint contract: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.2.
//
// Returns the raw Axios response so callers can read the unwrapped
// `response.data.data` payload — consistent with how api/auth.js works.

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
