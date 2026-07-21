// src/auth/ThemeContext.js
// The bare React context object. Held in its own module so the Provider
// file (`ThemeProvider.jsx`) is a components-only file, satisfying ESLint's
// `react-refresh/only-export-components` rule.

import { createContext } from 'react';

export const ThemeContext = createContext(null);
