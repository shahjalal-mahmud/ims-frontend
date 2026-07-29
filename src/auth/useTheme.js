// src/auth/useTheme.js
// Hook for consuming ThemeContext. Kept in its own file so
// ThemeProvider.jsx only exports the Provider component itself
// (react-refresh ESLint rule).
//
// Returns `{ theme, setTheme, toggleTheme, isDark }`.

import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
