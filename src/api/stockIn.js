// src/api/stockIn.js
// Thin wrappers around the Stock-In endpoints. One function per
// endpoint, each returns the raw Axios response — queries layer unwraps.
//
// Called by src/queries/useStockInQueries.js. Components never call
// these directly.
//
// Stock-in records are IMMUTABLE — there is no update or delete
// endpoint. A wrong entry is corrected by recording a compensating
// stock-out (per docs/Business_Logic_Specification.md). The whole UI
// surface (StockInList page + the row-action modal on Products) reads
// from this single file.
//
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.6
//   GET  /stock_in/list.php   — params: productId, page, limit
//   POST /stock_in/create.php — body: { productId, supplierId?,
//                                     quantity, purchasePrice?, note? }

import client from './client';

/**
 * GET /stock_in/list.php
 * Auth: Yes. Returns { items: [...], pagination: { page, limit, total, totalPages } }.
 *
 * `filters` is passed straight to Axios as query params. Optional filters:
 *   productId  — int, optional filter by product
 *   page       — int, default 1
 *   limit      — int, default 20
 */
export function listStockIn(filters = {}) {
  return client.get('/stock_in/list.php', { params: filters });
}

/**
 * POST /stock_in/create.php
 * Auth: Yes. Body: { productId, supplierId?, quantity, purchasePrice?, note? }.
 *
 * Success 201 → { id, productId, quantity, newProductQuantity, createdAt }.
 * The response carries `newProductQuantity` so the caller can update the
 * cached product quantity without a refetch (per docs/Frontend_Architecture.md
 * §Optimistic UI and FRONTEND_API_INTEGRATION_GUIDE.md §6.6).
 *
 * Error paths:
 *   - 404 → `productId` doesn't exist (product was deleted while the modal
 *           was open); refresh the product dropdown.
 *   - 422 → field-level validation errors under `errors` (productId,
 *           quantity, purchasePrice, note).
 *   - 500 → "Couldn't record stock in. Nothing was changed." — transaction
 *           rolls back; user can safely retry.
 */
export function createStockIn(payload) {
  return client.post('/stock_in/create.php', payload);
}