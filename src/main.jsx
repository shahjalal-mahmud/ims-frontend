// src/main.jsx
// Application entry point.
// Per docs/Frontend_Architecture.md §4 the order from outside-in is:
//   StrictMode → QueryClientProvider → AuthProvider → AuthBootstrap → App
// AuthBootstrap fires /auth/me.php once on mount; ProtectedRoute blocks
// rendering of protected screens until its `ready` flag is set.
// queryClientHolder is assigned here so the Axios 401 interceptor can
// clear the cache without needing to use a React hook.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext';
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
    </QueryClientProvider>
  </StrictMode>
);