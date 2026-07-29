// src/api/auth.js
// Thin wrappers around the three auth endpoints. Each function returns
// the raw Axios response object — the queries layer (src/queries/useAuthQueries.js)
// reads `response.data.data` after the envelope is unwrapped.
//
// Endpoint contracts: docs/FRONTEND_API_INTEGRATION_GUIDE.md §4.1.
// The 401-handling live here is the Axios interceptor's, not ours —
// see src/api/client.js for the walkthrough.

import client from './client';

/**
 * POST /auth/login.php
 * Auth: No. Body: { username, password }.
 * Success 200 → { success, data: { id, username }, message }.
 * 422 → field errors under `errors`. 401 → `message`.
 */
export function login({ username, password }) {
  return client.post('/auth/login.php', { username, password });
}

/**
 * POST /auth/logout.php
 * Auth: Yes. Destroys session server-side.
 * 401 (already gone) is treated as success by the caller.
 */
export function logout() {
  return client.post('/auth/logout.php');
}

/**
 * GET /auth/me.php
 * Auth: Yes. Returns { id, username }.
 * 401 is expected when no session — handled by the caller.
 */
export function me() {
  return client.get('/auth/me.php');
}