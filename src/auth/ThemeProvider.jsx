// src/auth/ThemeProvider.jsx
// Light/dark theme toggle.
//
// Persists to localStorage. This is purely a UI preference (the API
// guide's "don't store auth in localStorage" prohibition is about
// session data, not user settings). On mount we read the stored
// value, and on every change we set `data-theme` on <html> so DaisyUI
// swaps the palette for free — no React tree re-render required.
//
// Per docs/State_Management.md §2 and docs/Frontend_Architecture.md §10.

import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';

const STORAGE_KEY = 'ims.theme';
const DEFAULT_THEME = 'light';

function readInitial() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable (private mode, etc.) — ignore.
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore storage write failures
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      isDark: theme === 'dark',
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}