// src/auth/AuthContext.jsx
// AuthContext — { user, ready, setUser, clear }. See docs/State_Management.md §2.
// The 401 interceptor (which can't use hooks) reaches the same state via
// the module-level authStore; this Provider subscribes to that store and
// re-renders consumers on every change.

import { createContext, useContext, useEffect, useState } from 'react';
import { authStore } from './authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(authStore.user);
  const [ready, setReadyState] = useState(authStore.ready);

  useEffect(() => {
    return authStore.subscribe(({ user: u, ready: r }) => {
      setUserState(u);
      setReadyState(r);
    });
  }, []);

  const value = {
    user,
    ready,
    setUser: (u) => authStore.setUser(u),
    clear: () => authStore.clear(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;