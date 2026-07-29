// src/api/reports.js
// Thin wrappers around the four Reports endpoints. All GET, all
// Auth: Yes. Each returns the raw Axios response — queries layer unwraps.
//
// Called by src/queries/useReportQueries.js. All four endpoints are
// read-only; there are no mutations defined here.
//
// Empty arrays are a normal success outcome (e.g. /reports/low_stock.php
// returning [] means "everything is above the minimum stock level" — a
// happy path, not an error).
//
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.8.

import client from './client';

/**
 * GET /reports/inventory.php
 * Auth: Yes.
 * Params: { categoryId? } — optional category filter.
 *
 * Success 200 → { items: [{ productId, productName, category, supplier,
 *   quantity, purchasePrice, sellingPrice, stockValue }], totals: {
 *   totalQuantity, totalStockValue } }.
 *
 * Error paths: 401 (handled globally), 500.
 */
export function getInventoryReport(params = {}) {
  // Drop falsy/empty params so the URL stays clean.
  const clean = {};
  if (params.categoryId) clean.categoryId = params.categoryId;
  return client.get('/reports/inventory.php', { params: clean });
}

/**
 * GET /reports/low_stock.php
 * Auth: Yes. No params.
 *
 * Success 200 → array of { productId, productName, quantity,
 *   minStockLevel, shortBy } where `shortBy = minStockLevel - quantity`.
 *
 * Empty array is a happy path — the UI shows a calm "all products are
 * above their minimum stock level" message rather than an alarming
 * empty state (UI Screens §10).
 */
export function getLowStockReport() {
  return client.get('/reports/low_stock.php');
}

/**
 * GET /reports/stock_in_report.php
 * Auth: Yes.
 * Params: { startDate?, endDate? } — both optional, both `YYYY-MM-DD`,
 *   if both present then startDate <= endDate.
 *
 * Success 200 → { items: [...], totals: { totalQuantityIn, totalCost } }.
 *
 * Error paths: 422 on bad date range — caller maps onto the form
 * (Error_Handling.md §4).
 */
export function getStockInReport(params = {}) {
  const clean = {};
  if (params.startDate) clean.startDate = params.startDate;
  if (params.endDate) clean.endDate = params.endDate;
  return client.get('/reports/stock_in_report.php', { params: clean });
}

/**
 * GET /reports/stock_out_report.php
 * Auth: Yes. Same params/validation as stock-in report.
 *
 * Success 200 → { items: [...], totals: { totalQuantityOut, totalRevenue } }.
 */
export function getStockOutReport(params = {}) {
  const clean = {};
  if (params.startDate) clean.startDate = params.startDate;
  if (params.endDate) clean.endDate = params.endDate;
  return client.get('/reports/stock_out_report.php', { params: clean });
}
