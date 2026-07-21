// src/config.js
// Centralized application configuration.
// See docs/FRONTEND_API_INTEGRATION_GUIDE.md for the source of these values.

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost/inventory-management/backend/api';

export const API_TIMEOUT_MS = 15000;