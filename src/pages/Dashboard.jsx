// src/pages/Dashboard.jsx
// Milestone 1 placeholder. The full UI is built in later milestones — this
// page exists only so ProtectedRoute has a destination and the "log out
// and get redirected to /login" flow has a real exit button.

import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import { useAuthContext } from '../auth/AuthContext';
import { useLogout } from '../queries/useAuthQueries';
import { authStore } from '../auth/authStore';

export default function Dashboard() {
  const { user } = useAuthContext();
  const logoutMutation = useLogout();

  const onLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        // The Axios interceptor will not redirect here (we're calling logout
        // ourselves), so we clear local state and navigate to /login.
        authStore.clear();
        toast.success('Logged out');
        window.location.assign('/login');
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card bg-base-100 shadow-md w-full max-w-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl">Dashboard</h1>
          <p className="text-base-content/70">
            Signed in as <span className="font-medium">{user?.username}</span>.
          </p>
          <p className="text-base-content/60 text-sm">
            Milestone 1 placeholder — the dashboard UI ships in a later milestone.
          </p>
          <div className="card-actions justify-end mt-2">
            <button
              className="btn btn-outline"
              onClick={onLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <LogOut size={16} />
              )}
              Log out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}