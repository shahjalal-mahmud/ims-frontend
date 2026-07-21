// src/auth/useTheme.js
// Hook for consuming ThemeContext. Kept in its own file so the Provider
// module only exports components (react-refresh happy).

import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
