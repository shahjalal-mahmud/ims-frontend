// src/auth/AuthProvider.jsx
// React-side wrapper around the authStore.
//
// We use `useState` to mirror the store's `user` and `ready` values,
// then `useEffect` to subscribe to store updates. Whenever the
// interceptor (src/api/client.js) or AuthBootstrap writes to the
// store, this Provider re-renders — and so do every consumer of
// AuthContext (via useAuthContext).
//
// See docs/State_Management.md §2 for the full state model.

import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { authStore } from './authStore';

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