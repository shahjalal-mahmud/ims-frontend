// src/auth/AuthBootstrap.jsx
// Decides, on every fresh app load, whether the user is logged in.
//
// It calls useMe() (which hits GET /auth/me.php) exactly once, then
// drives the app through three possible states — see the comments
// below. AuthContext stays in sync because we write the result into
// `authStore` (see authStore.js for why a module-level store is used).
//
// Mounted near the root of the tree (see src/main.jsx) so children
// always see a settled auth state by the time they render.

import { useEffect } from 'react';
import { useMe } from '../queries/useAuthQueries';
import { authStore } from './authStore';

export default function AuthBootstrap({ children }) {
  const { data, error, isPending } = useMe();

  useEffect(() => {
    if (isPending) return;

    // The key insight: a 401 from /auth/me.php is NOT an error in our
    // sense — it simply means "no active session". That's the normal
    // first-visit case. We just leave the user as null and flip
    // `ready=true`; ProtectedRoute will then redirect to /login.
    if (error) {
      const status = error.response?.status;
      if (status !== 401) {
        // Genuine problem — network down, server 500, etc. Still leave
        // user as null so ProtectedRoute redirects, but the AuthBootstrap
        // screen below will render a retry banner instead of silently
        // dropping the user on /login.
        authStore.setUser(null);
        authStore.setReady(true);
        return;
      }
      authStore.setUser(null);
      authStore.setReady(true);
      return;
    }

    // Got a user — log them in immediately.
    if (data) {
      authStore.setUser(data);
      authStore.setReady(true);
    }
  }, [data, error, isPending]);

  // While the very first /auth/me.php call is in flight, render a full-page
  // spinner so ProtectedRoute's `!ready` gate doesn't flicker between
  // "redirect to login" and "render the protected page".
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Non-401 error: render a retry screen (only if not on /login, where the
  // user will see the login form anyway).
  if (error && error.response?.status !== 401) {
    const onRetry = () => window.location.reload();
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
        <div className="card bg-base-100 shadow-md w-full max-w-md">
          <div className="card-body">
            <h2 className="card-title text-error">Unable to start the app</h2>
            <p className="text-base-content/70">
              {error.response?.data?.message ||
                'Network error — check your connection'}
            </p>
            <div className="card-actions justify-end mt-2">
              <button className="btn btn-primary" onClick={onRetry}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}