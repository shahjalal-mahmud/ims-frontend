// src/main.jsx
// Application entry point.
//
// Provider order from outside-in (per docs/Frontend_Architecture.md §4):
//
//   StrictMode
//     QueryClientProvider     — gives every hook below access to one
//                              shared QueryClient (set up below).
//       ThemeProvider         — localStorage-backed light/dark theme.
//         AuthProvider        — mirrors the authStore into a React
//                               context so components can use
//                               useAuthContext().
//           AuthBootstrap     — calls /auth/me.php once on mount; flips
//                               authStore.ready. While not ready,
//                               ProtectedRoute shows a spinner.
//             App             — the router + page tree.
//
// The QueryClient's default options here are the app-wide defaults;
// individual hooks can still override per-query (e.g. useMe sets
// `retry: false` because 401 is expected). We also publish the
// QueryClient to `queryClientHolder` so the Axios 401 interceptor
// (which can't use hooks) can clear the cache on session expiry.
//
// The Toaster sits at the very top of the tree so any descendant —
// including the Login page inside AuthBootstrap — can fire toasts.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthProvider';
import { ThemeProvider } from './auth/ThemeProvider';
import AuthBootstrap from './auth/AuthBootstrap';
import { queryClientHolder } from './api/queryClientHolder';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

queryClientHolder.set(queryClient);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuthBootstrap>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
              }}
            />
          </AuthBootstrap>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);