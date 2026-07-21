// src/pages/Login.jsx
// Login screen. RHF + Zod (loginSchema).
// 401 (bad credentials) → toast the backend message verbatim.
// 422 (field errors)    → applyServerErrors onto the form (no toast).
// Other errors           → generic toast fallback.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import { loginSchema } from '../lib/validators';
import { applyServerErrors, getErrorMessage } from '../lib/errors';
import { useLogin } from '../queries/useAuthQueries';
import { authStore } from '../auth/authStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = (values) => {
    loginMutation.mutate(values, {
      onSuccess: (response) => {
        const user = response.data.data; // { id, username }
        authStore.setUser(user);
        toast.success(response.data.message || 'Login successful');
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      },
      onError: (err) => {
        const status = err.response?.status;

        // 401: bad credentials — backend supplies a generic, verbatim message.
        if (status === 401) {
          toast.error(
            err.response.data?.message || 'Invalid username or password'
          );
          return;
        }

        // 422: field-level validation from the backend.
        if (status === 422) {
          applyServerErrors({ setError }, err.response.data?.errors);
          return;
        }

        // 401s from non-login endpoints are handled globally — and any other
        // status / network error gets a generic fallback.
        toast.error(getErrorMessage(err));
      },
    });
  };

  const isSubmitting = loginMutation.isPending;

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="card bg-base-100 shadow-md w-full max-w-sm">
        <div className="card-body">
          <h1 className="card-title text-2xl">Inventory Management System</h1>
          <p className="text-base-content/70 text-sm">Sign in to continue.</p>

          <form
            className="flex flex-col gap-4 mt-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="form-control">
              <label className="label" htmlFor="username">
                <span className="label-text">Username</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className={`input input-bordered w-full ${
                  errors.username ? 'input-error' : ''
                }`}
                {...register('username')}
                disabled={isSubmitting}
              />
              {errors.username && (
                <span className="label-text-alt text-error mt-1">
                  {errors.username.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text">Password</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`input input-bordered w-full ${
                  errors.password ? 'input-error' : ''
                }`}
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <span className="label-text-alt text-error mt-1">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}