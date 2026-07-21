// src/queries/useAuthQueries.js
// Auth queries/mutations. See docs/State_Management.md.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { login, logout, me } from '../api/auth';
import { queryKeys } from '../lib/queryKeys';

/**
 * useMe() — GET /auth/me.php.
 * Retry is disabled (a 401 here is not transient).
 * Used by AuthBootstrap to determine the initial auth state.
 */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const { data } = await me();
      return data.data; // { id, username }
    },
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * useLogin() — POST /auth/login.php.
 * On success seeds queryKeys.me directly with the response to avoid a redundant
 * /auth/me.php refetch. The response is also returned to the caller for AuthContext.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      const user = response.data.data; // { id, username }
      queryClient.setQueryData(queryKeys.me, user);
      return user;
    },
  });
}

/**
 * useLogout() — POST /auth/logout.php then wipe the entire query cache.
 * The 401 from a stale session is treated as success (interceptor handles the
 * global side-effects); we still wipe local state either way.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}