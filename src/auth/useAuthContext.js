// src/auth/useAuthContext.js
// Hook for consuming AuthContext. Kept in its own file so AuthProvider.jsx
// only exports the Provider component itself — otherwise ESLint's
// `react-refresh/only-export-components` rule gets grumpy.
//
// Returns `{ user, ready, setUser, clear }`. `ready` flips true once
// AuthBootstrap has finished talking to /auth/me.php; while it's false
// the protected routes show a spinner.

import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
