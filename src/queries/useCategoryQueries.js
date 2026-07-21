// src/queries/useCategoryQueries.js
// Categories queries/mutations. See docs/State_Management.md §1.
//
// Invalidation rules (per the table in State_Management.md §1):
//   create / update / delete → queryKeys.categories
// Category names aren't denormalized into product rows in our API surface,
// so we don't need to touch queryKeys.products on category writes.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../api/categories';
import { queryKeys } from '../lib/queryKeys';

/**
 * useCategories() — GET /categories/list.php.
 * Returns an array of { id, name, createdAt }.
 * Retry disabled on 401 (handled globally) and 404 (not transient).
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const { data } = await listCategories();
      return data.data; // array
    },
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 404) return false;
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
}

/**
 * useCreateCategory() — POST /categories/create.php.
 * Returns the mutation itself; the response body is the created category
 * ({ id, name, createdAt }) for callers that want to prepend optimistic.
 * We invalidate queryKeys.categories on success — the page will refetch
 * from the server, which is the source of truth (avoids race-y prepends).
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

/**
 * useUpdateCategory() — PUT /categories/update.php?id=
 * Invalidates queryKeys.categories on success.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

/**
 * useDeleteCategory() — DELETE /categories/delete.php?id=
 * Invalidates queryKeys.categories on success.
 *
 * No 409 branch needed — deleting a category never blocks (ON DELETE SET NULL
 * un-links referencing products). The UI §3 confirms this.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}