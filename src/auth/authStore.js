// src/auth/authStore.js
// Module-level mutable handle for the current auth user.
//
// Why a module-level store instead of just useState? The Axios
// response interceptor in src/api/client.js runs *outside* of React
// (Axios callbacks aren't React components, so hooks like useState or
// useContext can't be used there). When that interceptor catches a 401,
// it needs to clear the user object, toast the user, and redirect —
// all without a React hook.
//
// This module solves that: it's just a plain JS object with `user`,
// `ready`, `setUser`, `clear`, and `subscribe` methods. The interceptor
// calls `authStore.clear()` directly. Meanwhile, the React side
// (AuthProvider.jsx) calls `authStore.subscribe(...)` so React
// components still re-render when the user changes.
//
// The cookie itself is HttpOnly (docs/FRONTEND_API_INTEGRATION_GUIDE.md
// §1.5), so we never store the cookie here — only the user object
// (`{ id, username }`).

const listeners = new Set();

export const authStore = {
  user: null,
  ready: false,

  setUser(user) {
    this.user = user;
    listeners.forEach((fn) => fn({ user, ready: this.ready }));
  },

  clear() {
    this.user = null;
    listeners.forEach((fn) => fn({ user: null, ready: this.ready }));
  },

  setReady(ready) {
    this.ready = ready;
    listeners.forEach((fn) => fn({ user: this.user, ready }));
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};