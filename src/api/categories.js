// src/api/categories.js
// Categories API module. One function per endpoint, returning the raw
// Axios response so the queries layer can read the unwrapped envelope.
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.3.

import client from './client';

/**
 * GET /categories/list.php
 * Auth: Yes. Returns an array of { id, name, createdAt }.
 */
export function listCategories() {
  return client.get('/categories/list.php');
}

/**
 * GET /categories/get.php?id={id}
 * Auth: Yes. Returns the single category. 404 → "Category not found".
 */
export function getCategory(id) {
  return client.get('/categories/get.php', { params: { id } });
}

/**
 * POST /categories/create.php
 * Auth: Yes. Body: { name }.
 * Success 201 → { id, name, createdAt }. 422 → field errors under `errors`.
 */
export function createCategory({ name }) {
  return client.post('/categories/create.php', { name });
}

/**
 * PUT /categories/update.php?id={id}
 * Auth: Yes. Body: { name }.
 * Success 200. 404 → "Category not found". 422 → field errors.
 */
export function updateCategory({ id, name }) {
  return client.put(`/categories/update.php?id=${id}`, { name });
}

/**
 * DELETE /categories/delete.php?id={id}
 * Auth: Yes. Success 200. There is NO 409 case — deleting a category
 * un-links products via ON DELETE SET NULL, it never blocks.
 */
export function deleteCategory(id) {
  return client.delete(`/categories/delete.php?id=${id}`);
}