// src/components/layout/Topbar.jsx
// Page-title slot + user menu (username + logout) + theme toggle.
// Per docs/Component_Architecture.md §1 and docs/UI_Design_System.md §5.

import toast from 'react-hot-toast';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuthContext } from '../../auth/useAuthContext';
import { useTheme } from '../../auth/useTheme';
import { useLogout } from '../../queries/useAuthQueries';
import { authStore } from '../../auth/authStore';

export default function Topbar({ title }) {
  const { user } = useAuthContext();
  const { isDark, toggleTheme } = useTheme();
  const logoutMutation = useLogout();

  const onLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        authStore.clear();
        toast.success('Logged out');
        window.location.assign('/login');
      },
    });
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-base-300 bg-base-100">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{title || 'Dashboard'}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-base-300">
            <span className="hidden sm:inline text-sm text-base-content/80">
              {user.username}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onLogout}
              disabled={logoutMutation.isPending}
              aria-label="Log out"
            >
              {logoutMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Log out</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
