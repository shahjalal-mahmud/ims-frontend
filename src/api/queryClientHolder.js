// src/api/queryClientHolder.js
// Small "module-level" handle so the Axios 401 interceptor — which runs
// outside of React — can reach the QueryClient to clear the cache.
//
// Why this exists: the interceptor (src/api/client.js) needs to call
// `queryClient.clear()` on a 401, but it's an Axios callback, not a
// React component. It can't use the `useQueryClient()` hook, and it
// can't `import { QueryClient } from '@tanstack/react-query'` at the
// top of the file because that would create a circular import (the
// QueryClient is created in main.jsx, which already imports the
// client).
//
// The fix: main.jsx calls `queryClientHolder.set(queryClient)` once on
// startup, after the QueryClient is constructed. The interceptor reads
// it later via `queryClientHolder.get()`.

let client = null;

export const queryClientHolder = {
  set(next) {
    client = next;
  },
  get() {
    return client;
  },
};