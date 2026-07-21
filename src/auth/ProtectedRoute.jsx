// src/auth/ProtectedRoute.jsx
// While !ready: spinner (we're still waiting on /auth/me.php).
// While ready && !user: redirect to /login preserving the intended location.
// Otherwise: render children.

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