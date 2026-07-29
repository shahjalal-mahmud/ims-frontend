// src/auth/PublicOnlyRoute.jsx
// Mirror of ProtectedRoute, but for the /login page.
//
// Three states (kept in lockstep with ProtectedRoute):
//   - !ready: still waiting on /auth/me.php → spinner (no point
//             flashing the login form if the user is actually logged in).
//   - !user: no active session → render the Login page (via <Outlet />).
//   - user: already authenticated → redirect to /dashboard. An
//             authenticated user must not see the login form.

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