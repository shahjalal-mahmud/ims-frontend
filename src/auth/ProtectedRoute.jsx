// src/auth/ProtectedRoute.jsx
// Route guard for every authenticated screen.
//
// Three states (matches AuthBootstrap's job):
//   - !ready: AuthBootstrap hasn't finished asking /auth/me.php yet →
//             show a full-page spinner so the page doesn't flash the
//             login redirect for a half-second on every reload.
//   - ready && !user: no active session → redirect to /login. We pass
//             the current location in `state.from` so the Login page
//             can bounce the user back to where they were headed after
//             they sign in.
//   - ready && user: render the child route (via <Outlet />).

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';

export default function ProtectedRoute() {
  const { user, ready } = useAuthContext();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location }} />
    );
  }

  return <Outlet />;
}