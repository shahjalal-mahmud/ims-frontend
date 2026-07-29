// src/auth/ThemeContext.js
// The bare React context object for the theme.
//
// Held in its own module so ThemeProvider.jsx (a components-only file
// for ESLint's `react-refresh/only-export-components` rule) doesn't
// also have to export non-component bindings.
// The Provider lives in ThemeProvider.jsx; consumers use `useTheme`
// (src/auth/useTheme.js).

import { createContext } from 'react';

export const ThemeContext = createContext(null);
