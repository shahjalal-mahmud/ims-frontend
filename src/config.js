// src/config.js
// Centralized application configuration.
//
// BASE_URL is the base URL prepended to every API path (see
// src/api/*). The two modes:
//
//   - Development (Vite dev server):
//     The Vite proxy in vite.config.js listens on /api/* on the dev
//     server (http://localhost:5173) and forwards each request to the
//     PHP backend. Using a same-origin /api/ prefix sidesteps CORS
//     preflight while still carrying `withCredentials: true`, so the
//     HttpOnly session cookie is attached to every request.
//
//   - Built bundle served from XAMPP (no proxy in the picture):
//     The browser hits the backend directly, so we need an absolute
//     URL. Set VITE_API_BASE_URL in your .env (see .env.development
//     for the local-XAMPP value).
//
// API_TIMEOUT_MS is the per-request timeout in milliseconds. 15s is
// generous enough for any of our endpoints (the slowest are report
// pages with date filters).
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

export const API_TIMEOUT_MS = 15000;
