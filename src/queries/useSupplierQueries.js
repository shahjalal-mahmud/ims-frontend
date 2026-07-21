// src/queries/useSupplierQueries.js
// Suppliers queries/mutations. See docs/State_Management.md §1.
//
// Invalidation rules (per State_Management.md §1):
//   create / update / delete → queryKeys.suppliers
// Supplier names aren't denormalized into product rows in our API surface,
// so we don't need to touch queryKeys.products on supplier writes.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from '../api/suppliers';
import { queryKeys } from '../lib/queryKeys';

/**
 * useSuppliers() — GET /suppliers/list.php.
 * Returns an array of { id, name, phone, email, address, createdAt }.
 * Retry disabled on 401 (handled globally) and 404 (not transient).
 */
export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers,
    queryFn: async () => {
      const { data } = await listSuppliers();
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
 * useCreateSupplier() — POST /suppliers/create.php.
 * Invalidates queryKeys.suppliers on success.
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    },
  });
}

/**
 * useUpdateSupplier() — PUT /suppliers/update.php?id=
 * Invalidates queryKeys.suppliers on success.
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    },
  });
}

/**
 * useDeleteSupplier() — DELETE /suppliers/delete.php?id=
 * Invalidates queryKeys.suppliers on success.
 *
 * No 409 branch needed — deleting a supplier never blocks
 * (ON DELETE SET NULL un-links referencing rows, per the API guide).
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    },
  });
}
