// src/api/queryClientHolder.js
// Module-level handle so the Axios 401 interceptor (which can't call React
// hooks) can reach the QueryClient. The Provider in main.jsx assigns it
// once on mount.

let client = null;

export const queryClientHolder = {
  set(next) {
    client = next;
  },
  get() {
    return client;
  },
};