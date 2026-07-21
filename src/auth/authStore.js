// src/auth/authStore.js
// Module-level mutable handle used by the Axios 401 interceptor.
// The interceptor cannot call React hooks, so it reads/writes this store directly.
// AuthContext stays in sync with the store via setUser/clear (see AuthContext.jsx).
// See docs/Error_Handling.md §2.

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