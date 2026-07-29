// src/api/client.js
// Shared Axios instance for the whole app.
//
// Every file under src/api/ imports the `client` from here. Two things
// make it special:
//   1. It sets `withCredentials: true` so the browser attaches the
//      HttpOnly session cookie (PHPSESSID) to every request. Without
//      this line every request would 401. (See docs/FRONTEND_API_INTEGRATION_GUIDE.md
//      §1.5: the cookie is the auth — there is no token to read.)
//   2. It installs one global response interceptor that handles 401 once
//      for the whole app, instead of every page reacting to 401 locally.
//
// See docs/Error_Handling.md §2 for the canonical contract.

import axios from 'axios';
import toast from 'react-hot-toast';
import { BASE_URL, API_TIMEOUT_MS } from '../config';
import { authStore } from '../auth/authStore';
import { queryClientHolder } from './queryClientHolder';

const client = axios.create({
  baseURL: BASE_URL,
  // HttpOnly session cookie — see §1.5 of the API integration guide.
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Global response interceptor — handles 401 once, app-wide.
// Plain-language walkthrough below.
// ──────────────────────────────────────────────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // STEP 1 — Check for a network error BEFORE reading the status.
    //
    // A network error means the request never reached the server
    // (offline, DNS failure, CORS preflight failed, server down, etc.).
    // In that case `error.response` is undefined. If we tried to read
    // `error.response.status` here, we'd crash with "Cannot read
    // properties of undefined". This is the #1 mistake the API guide
    // §6.7 calls out, so we always do this check first.
    //
    // We just re-throw the error — each call site decides how to
    // surface it (usually a "Network error" toast via getErrorMessage).
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    // STEP 2 — Handle 401 (session expired / no session) once, globally.
    //
    // Example: a user logged in yesterday. Today they open the app, and
    // a request to fetch products comes back 401 because the server's
    // session is gone. We do four things here so the rest of the app
    // never has to:
    //
    //   (a) Clear the user object in AuthContext so the UI stops
    //       rendering as if we were logged in.
    //   (b) Clear the entire React Query cache so the next user (or a
    //       re-login by the same browser) doesn't briefly see the
    //       previous user's cached data.
    //   (c) Toast a single friendly "session expired" message.
    //   (d) Hard-redirect to /login. We use `window.location.assign`
    //       instead of React Router's <Navigate> because a full reload
    //       guarantees a clean app state — any in-flight fetches,
    //       lingering toasts, etc. all get wiped. There's no draft-
    //       recovery mechanism in v1 (see docs/Error_Handling.md §8).
    //
    // SKIP the redirect if the user is already on /login — a 401 from
    // /auth/login.php isn't "session expired", it's literally "wrong
    // password", and the Login page's own error handler wants to show
    // the backend's message verbatim.
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

    // STEP 3 — Always re-throw so call sites can still react.
    //
    // The mutation's onError / query's error state will still be set,
    // so per-page logic (422 field mapping, 404 dropdown refresh,
    // 409 insufficient-stock toast, etc.) keeps working. We didn't
    // swallow the error — we only added global side-effects on top.
    return Promise.reject(error);
  }
);

export default client;
