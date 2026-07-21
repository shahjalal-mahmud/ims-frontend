// src/auth/useAuthContext.js
// Hook for consuming AuthContext. Kept in its own file so the Provider
// module only exports components (react-refresh happy).

import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}
