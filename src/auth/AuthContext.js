// src/auth/AuthContext.js
// The bare React context object for the auth user.
//
// Held in its own module so AuthProvider.jsx (a components-only file
// for ESLint's `react-refresh/only-export-components` rule) doesn't
// have to also export non-component bindings.
// The Provider lives in AuthProvider.jsx; consumers use the
// `useAuthContext` hook (src/auth/useAuthContext.js).

import { createContext } from 'react';

export const AuthContext = createContext(null);
