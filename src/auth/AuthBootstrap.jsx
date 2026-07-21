// src/auth/AuthBootstrap.jsx
// Fires useMe() once on mount; syncs the result into AuthContext via authStore.
// On 401 (no session): not an error — render children so routing can redirect.
// On any other failure: render a full-page error/retry screen.
// On any completion: flips the `ready` flag (used by ProtectedRoute).

import { useEffect } from 'react';
import { useMe } from '../queries/useAuthQueries';
import { authStore } from './authStore';

export default function AuthBootstrap({ children }) {
  const { data, error, isPending } = useMe();

  useEffect(() => {
    if (isPending) return;

    // 401 (no session) is expected — leave user null and let routing decide.
    if (error) {
      const status = error.response?.status;
      if (status !== 401) {
        // Other failures (network, 500) — keep user null but mark ready
        // so the UI can render an error screen via the route tree's
        // NotFound / dedicated boundary. AuthContext will still allow
        // ProtectedRoute to redirect to /login.
        authStore.setUser(null);
        authStore.setReady(true);
        return;
      }
      authStore.setUser(null);
      authStore.setReady(true);
      return;
    }

    if (data) {
      authStore.setUser(data);
      authStore.setReady(true);
    }
  }, [data, error, isPending]);

  // While the very first /auth/me.php call is in flight, render a full-page
  // spinner so ProtectedRoute's `!ready` gate doesn't flicker.
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