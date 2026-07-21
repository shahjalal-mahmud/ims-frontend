// src/api/client.js
// Shared Axios instance for all API modules.
// See docs/FRONTEND_API_INTEGRATION_GUIDE.md for the contract.

import axios from 'axios';
import { BASE_URL, API_TIMEOUT_MS } from '../config';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // required: backend uses HttpOnly session cookies
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Response interceptor stub.
// Milestone 0: log only — no side-effects. 401 handling (clearing AuthContext,
// queryClient, redirecting to /login) is implemented in Milestone 1.
// See docs/Frontend_Architecture.md and docs/Error_Handling.md.
// TODO (Milestone 1): on 401 (and not on /login), clear auth + cache + redirect.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.warn('[api/client] response error', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export default client;
