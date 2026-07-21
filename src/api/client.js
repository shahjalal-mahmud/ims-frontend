// src/api/client.js
// Shared Axios instance for all API modules.
// See docs/FRONTEND_API_INTEGRATION_GUIDE.md and docs/Error_Handling.md.

import axios from 'axios';
import toast from 'react-hot-toast';
import { BASE_URL, API_TIMEOUT_MS } from '../config';
import { authStore } from '../auth/authStore';
import { queryClientHolder } from './queryClientHolder';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // required: backend uses HttpOnly session cookies
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Global response interceptor — handles 401 once, app-wide.
// See docs/Error_Handling.md §2.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error: no response object. Let call sites handle their own
    // generic fallback.
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    // 401: clear local auth + cache + redirect to /login — UNLESS the user
    // is already on /login, in which case the Login page will show the
    // backend's "Invalid username or password" message itself.
    if (status === 401) {
      const onLoginPage =
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/login');

      if (!onLoginPage) {
        authStore.clear();
        const qc = queryClientHolder.get();
        if (qc) qc.clear();
        toast.error('Your session expired. Please log in again.');
        if (typeof window !== 'undefined') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default client;