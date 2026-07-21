// src/auth/AuthContext.js
// The bare React context object. Held in its own module so the Provider
// file (`AuthProvider.jsx`) is a components-only file, satisfying ESLint's
// `react-refresh/only-export-components` rule.

import { createContext } from 'react';

export const AuthContext = createContext(null);
