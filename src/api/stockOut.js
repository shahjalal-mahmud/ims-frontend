// src/api/stockOut.js
// Thin wrappers around the Stock-Out endpoints. One function per
// endpoint, each returns the raw Axios response — queries layer unwraps.
//
// Called by src/queries/useStockOutQueries.js. Components never call
// these directly.
//
// Stock-out records are IMMUTABLE — there is no update or delete
// endpoint. A wrong entry is corrected by recording a compensating
// stock-in (per docs/Business_Logic_Specification.md).
//
// Note the 409 "Insufficient stock" business-rule response from the
// POST endpoint — see docs/Error_Handling.md §3: it's an expected
// outcome, surfaced verbatim to the user (the modal stays open so they
// can adjust the quantity).
//
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.7
//   GET  /stock_out/list.php   — params: productId, page, limit
//   POST /stock_out/create.php — body: { productId, quantity,
//                                      sellingPrice?, note? }

import client from './client';

/**
 * GET /stock_out/list.php
 * Auth: Yes. Returns { items: [...], pagination: { page, limit, total, totalPages } }.
 *
 * `filters` is passed straight to Axios as query params. Optional filters:
 *   productId  — int, optional filter by product
 *   page       — int, default 1
 *   limit      — int, default 20
 */
export function listStockOut(filters = {}) {
  return client.get('/stock_out/list.php', { params: filters });
}

/**
 * POST /stock_out/create.php
 * Auth: Yes. Body: { productId, quantity, sellingPrice?, note? }.
 *
 * Success 201 → { id, productId, quantity, newProductQuantity, createdAt }.
 * The response carries `newProductQuantity` so the caller can update the
 * cached product quantity without a refetch (per docs/Frontend_Architecture.md
 * §Optimistic UI and FRONTEND_API_INTEGRATION_GUIDE.md §6.6).
 *
 * Error paths:
 *   - 404 → `productId` doesn't exist (product was deleted while the modal
 *           was open); refresh the product dropdown.
 *   - 409 → "Insufficient stock: only N units available" — expected
 *           business-rule conflict (see Error_Handling.md §3).
 *   - 422 → field-level validation errors under `errors` (productId,
 *           quantity, sellingPrice, note).
 *   - 500 → transaction rolls back; user can safely retry.
 */
export function createStockOut(payload) {
  return client.post('/stock_out/create.php', payload);
}
