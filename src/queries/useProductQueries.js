// src/queries/useProductQueries.js
// Products hooks — same "list + create/update/delete + invalidate"
// pattern as useCategoryQueries.js, but with two extras worth knowing
// about before your teacher asks:
//
//   (a) Filters live in URL search params (see the page —
//       src/pages/inventory/ProductsList.jsx), so the list query key
//       is the entire filter object. A new filter set gives you a new
//       cache entry, which is exactly what we want.
//       `placeholderData: keepPreviousData` keeps the old page of
//       products on screen while the new one loads — the table
//       doesn't flash blank between page clicks or filter changes.
//
//   (b) Product writes invalidate EVERY list variant
//       (queryKeys.products(*)) because the category / supplier /
//       low-stock filter columns could be denormalized on a server
//       update — better to be safe than show stale data.
//
// Invalidation rules (per docs/State_Management.md §1):
//   create / update / delete → queryKeys.products(*) and
//                              queryKeys.dashboard (KPI counts shift)
//   update                  → additionally queryKeys.product(id)

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../api/products';
import { queryKeys } from '../lib/queryKeys';

// Predicates used by product mutations to invalidate every list variant.
const invalidateAllProductLists = (qc) =>
  qc.invalidateQueries({ queryKey: ['products'] });

/**
 * useProducts(filters)
 * GET /products/list.php with the supplied filters. Returns:
 *   { items: [...], pagination: { page, limit, total, totalPages } }
 *
 * Filters default to page 1, limit 20 (matches the backend's defaults).
 */
export function useProducts(filters = {}) {
  // Stable key — even when filters is a fresh object each render, the
  // query key is computed once per call.
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: async () => {
      const { data } = await listProducts(filters);
      return data.data; // { items, pagination }
    },
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      // 401, 404, 409, 422 — not transient, don't retry.
      // (docs/State_Management.md §1 retry policy)
      if (status === 401 || status === 404 || status === 409 || status === 422) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
}

/**
 * useProduct(id) — GET /products/get.php?id=
 * Used by the edit page to prefill the form.
 * 404 → caller (page) toasts "Product not found" + redirects.
 */
export function useProduct(id) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: async () => {
      const { data } = await getProduct(id);
      return data.data;
    },
    enabled: id != null && id !== '',
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 404 || status === 409 || status === 422) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 30_000,
  });
}

/**
 * useCreateProduct() — POST /products/create.php
 * Invalidates every product list variant + dashboard on success.
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidateAllProductLists(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * useUpdateProduct() — PUT /products/update.php?id=
 * Invalidates every product list variant + the single-product cache for
 * the edited id + dashboard.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (_response, variables) => {
      invalidateAllProductLists(queryClient);
      if (variables?.id != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.product(variables.id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * useDeleteProduct() — DELETE /products/delete.php?id=
 * Invalidates every product list variant + dashboard on success.
 *
 * 409 — "Cannot delete product with existing stock history" — is handled
 * at the call site per docs/Error_Handling.md §3 (verbatim message,
 * confirmation-blocking toast). 404 — "Product not found" — refreshes the
 * list per §4.5.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      invalidateAllProductLists(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}