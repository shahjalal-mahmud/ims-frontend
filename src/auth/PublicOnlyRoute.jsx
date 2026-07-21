// src/auth/PublicOnlyRoute.jsx
// If the user is already authenticated, send them to the dashboard —
// an authenticated user must not see the login form.

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';

export default function PublicOnlyRoute() {
  const { user, ready } = useAuthContext();

  // While bootstrap is still in flight, show a spinner (same gate the
  // Login page relies on to avoid a flash of the login form for an
  // already-authenticated user).
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}