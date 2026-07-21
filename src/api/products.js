// src/api/products.js
// Products API module. One function per endpoint, returning the raw
// Axios response so the queries layer can read the unwrapped envelope.
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.5.
//
// Per §4.5:
//   GET    /products/list.php  — params: search, categoryId, supplierId,
//                                 lowStockOnly, page, limit
//   GET    /products/get.php   — params: id
//   POST   /products/create.php — body: { name, categoryId, supplierId,
//                                       purchasePrice, sellingPrice,
//                                       minStockLevel? }
//                                       (NEVER include `quantity`)
//   PUT    /products/update.php?id= — body: partial subset of the above
//   DELETE /products/delete.php?id=

import client from './client';

/**
 * GET /products/list.php
 * Auth: Yes. Returns { items: [...], pagination: { page, limit, total, totalPages } }.
 *
 * `filters` is passed straight to Axios as query params — the URLs are
 * exactly what the backend expects. Page/limit default to 1 / 20 if absent.
 * lowStockOnly is passed as the string "true"/"false" (the backend accepts
 * both "true"/"false" and 0/1 per §4.5).
 */
export function listProducts(filters = {}) {
  return client.get('/products/list.php', { params: filters });
}

/**
 * GET /products/get.php?id={id}
 * Auth: Yes. Returns the single product.
 * 404 → "Product not found".
 */
export function getProduct(id) {
  return client.get('/products/get.php', { params: { id } });
}

/**
 * POST /products/create.php
 * Auth: Yes. Body: { name, categoryId, supplierId, purchasePrice,
 *                   sellingPrice, minStockLevel? }.
 * quantity is server-managed — NEVER include it in the payload here.
 * 422 → field errors under `errors` (name / purchasePrice / sellingPrice /
 * categoryId / supplierId).
 */
export function createProduct(payload) {
  // Defensive guard: the spec says `quantity` is not editable through
  // this module. If anything slips through, drop it at the boundary so
  // the backend never sees it (and never 422s on a field it doesn't accept).
  const safe = { ...payload };
  delete safe.quantity;
  return client.post('/products/create.php', safe);
}

/**
 * PUT /products/update.php?id={id}
 * Auth: Yes. Body: partial subset of editable fields. Same quantity guard.
 */
export function updateProduct({ id, ...patch }) {
  const safe = { ...patch };
  delete safe.quantity;
  return client.put(`/products/update.php?id=${id}`, safe);
}

/**
 * DELETE /products/delete.php?id={id}
 * Auth: Yes. Success 200. Error paths:
 *   - 404 → "Product not found" — refresh list.
 *   - 409 → "Cannot delete product with existing stock history"
 *           This is an EXPECTED business outcome, not an error.
 */
export function deleteProduct(id) {
  return client.delete(`/products/delete.php?id=${id}`);
}