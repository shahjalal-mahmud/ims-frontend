// src/config.js
// Centralized application configuration.
// See docs/FRONTEND_API_INTEGRATION_GUIDE.md for the source of these values.
//
// In development the Vite dev proxy (see vite.config.js) serves the API at
// /api/* on the same origin, so BASE_URL is "/api". This sidesteps CORS
// preflight in the browser without losing `withCredentials: true` — the
// proxy still forwards the request to the PHP backend and the HttpOnly
// session cookie is set on the API origin (the backend), not the dev
// origin, which is what the browser cares about for `fetch`/XHR.
//
// When serving the built bundle directly from XAMPP (without the Vite
// proxy), set VITE_API_BASE_URL to the absolute URL of the PHP backend,
// e.g. http://localhost/inventory-management-backend/api.
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

export const API_TIMEOUT_MS = 15000;
