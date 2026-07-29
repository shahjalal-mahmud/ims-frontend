// src/api/suppliers.js
// Thin wrappers around the Suppliers endpoints. One function per
// endpoint, each returns the raw Axios response — queries layer unwraps.
//
// Same pattern as src/api/categories.js. Optional fields (phone / email
// / address) are passed through verbatim; the backend is the source of
// truth for required-vs-blank handling.
//
// Called by src/queries/useSupplierQueries.js. Components never call
// these functions directly.
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.4.

import client from './client';

/**
 * GET /suppliers/list.php
 * Auth: Yes. Returns an array of { id, name, phone, email, address, createdAt }.
 */
export function listSuppliers() {
  return client.get('/suppliers/list.php');
}

/**
 * GET /suppliers/get.php?id={id}
 * Auth: Yes. Returns the single supplier. 404 → "Supplier not found".
 */
export function getSupplier(id) {
  return client.get('/suppliers/get.php', { params: { id } });
}

/**
 * POST /suppliers/create.php
 * Auth: Yes. Body: { name, phone?, email?, address? }.
 * Success 201 → the created supplier. 422 → field errors under `errors`.
 */
export function createSupplier(payload) {
  return client.post('/suppliers/create.php', payload);
}

/**
 * PUT /suppliers/update.php?id={id}
 * Auth: Yes. Body: the full editable shape.
 * Success 200. 404 → "Supplier not found". 422 → field errors.
 */
export function updateSupplier({ id, ...patch }) {
  return client.put(`/suppliers/update.php?id=${id}`, patch);
}

/**
 * DELETE /suppliers/delete.php?id={id}
 * Auth: Yes. Success 200. There is NO 409 case — deleting a supplier
 * un-links referencing rows via ON DELETE SET NULL (per the API guide).
 */
export function deleteSupplier(id) {
  return client.delete(`/suppliers/delete.php?id=${id}`);
}
