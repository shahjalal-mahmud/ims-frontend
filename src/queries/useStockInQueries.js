// src/queries/useStockInQueries.js
// Stock-in hooks — list + create + optimistic patch + cascade invalidate.
//
// Same "list + create/update/delete + invalidate" pattern as the rest,
// with two important wrinkles:
//
//   (a) OPTIMISTIC PATCH on create.
//       The POST response includes `newProductQuantity` — the
//       authoritative new quantity after the stock-in was recorded.
//       Instead of waiting for every cached product list to refetch,
//       we proactively rewrite `quantity` on the matching item in
//       every cached `queryKeys.products(*)` entry. The row's
//       <StockStatusBadge> updates immediately.
//
//       Why this avoids an extra round-trip: a real refetch would
//       re-list products (with all their filters), the same payload
//       we just patched, just slower. The patch is correct because
//       the server's value IS the source of truth (no client guess).
//       The cached value could only go stale if a separate write
//       happens between the response and the next refetch — which
//       TanStack's invalidations below pick up anyway.
//
//   (b) CASCADE INVALIDATIONS on create.
//       Listing stock-in changes qty, which changes product lists,
//       dashboard totals, and the low-stock report. We invalidate
//       all of them so the next render / focus picks up anything we
//       might have missed with the optimistic patch.
//
// Invalidation rules (per docs/State_Management.md §1):
//   createStockIn → queryKeys.stockIn(*),
//                   queryKeys.product(id),
//                   queryKeys.products(*) (every list variant),
//                   queryKeys.dashboard,
//                   queryKeys.reportLowStock
//
// Filters live in URL search params (State_Management.md §4) where the
// page drives them; we key the list query off the entire filter object so
// changing productId/page yields a new cache entry instead of mutating
// the old one. `placeholderData: keepPreviousData` keeps the table
// stable across page/filter changes (per Frontend_Architecture §8).

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createStockIn, listStockIn } from '../api/stockIn';
import { queryKeys } from '../lib/queryKeys';

// Predicate helpers — invalidate every list variant matching the prefix.
const invalidateAllStockInLists = (qc) =>
  qc.invalidateQueries({ queryKey: ['stockIn'] });

const invalidateAllProductLists = (qc) =>
  qc.invalidateQueries({ queryKey: ['products'] });

/**
 * useStockInList(filters)
 * GET /stock_in/list.php with the supplied filters. Returns:
 *   { items: [...], pagination: { page, limit, total, totalPages } }
 *
 * Each item has the shape documented in the API guide §4.6:
 *   { id, productId, productName, supplierId, supplierName,
 *     quantity, purchasePrice, note, createdAt }
 *
 * Filters default to page 1, limit 20 (matches the backend's defaults).
 */
export function useStockInList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.stockIn(filters),
    queryFn: async () => {
      const { data } = await listStockIn(filters);
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
 * useCreateStockIn()
 * POST /stock_in/create.php. Invalidates the queries it affects on success:
 *
 *   - queryKeys.stockIn(*)        every stock-in list variant refetches
 *   - queryKeys.product(id)       the single-product cache for the affected id
 *   - queryKeys.products(*)       every product list variant (so the table
 *                                 reflects the new quantity immediately)
 *   - queryKeys.dashboard         the dashboard KPI tile refreshes on next
 *                                 refetch (totalStockUnits + lowStockCount)
 *   - queryKeys.reportLowStock    the low-stock report responds to qty change
 *
 * Optimistic UI (docs/Frontend_Architecture.md §Optimistic UI /
 * FRONTEND_API_INTEGRATION_GUIDE.md §6.6): the backend returns
 * `newProductQuantity` in `data.data` (after envelope unwrap). We
 * proactively patch every cached product-list entry and the
 * single-product entry with that value, so the displayed quantity
 * changes immediately everywhere — no awaiting a refetch. (See
 * State_Management.md §1 invalidation table footnote.)
 *
 * Error paths (UI Screens §7 + Error_Handling.md §1/§5):
 *   - 422 → field errors mapped onto the form by the modal via
 *           applyServerErrors (Form_Validation.md §8).
 *   - 404 → "Product not found" — usually means the selected product
 *           was deleted while the modal was open; refresh the dropdown.
 *   - 500 → "Couldn't record stock in. Nothing was changed."
 *           (verbatim per Error_Handling.md §5).
 */
export function useCreateStockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStockIn,
    onSuccess: (response) => {
      // 1) Patch every cached product list with `newProductQuantity` so
      //    the displayed quantity updates without a refetch. Cache layout
      //    for products list: { items: [...], pagination: {...} } — the
      //    item shape includes a flat `quantity` field (ProductsList
      //    renders <StockStatusBadge quantity={row.quantity} />).
      const createdRow = response?.data?.data;
      const productId = createdRow?.productId;
      const newQty = createdRow?.newProductQuantity;

      if (productId != null && typeof newQty === 'number') {
        // Patch every product-list query (all filter variants).
        queryClient.setQueriesData(
          { queryKey: ['products'], exact: false },
          (old) => {
            if (!old || !Array.isArray(old.items)) return old;
            let touched = false;
            const nextItems = old.items.map((p) => {
              if (Number(p.id) === Number(productId)) {
                touched = true;
                return { ...p, quantity: newQty };
              }
              return p;
            });
            return touched ? { ...old, items: nextItems } : old;
          }
        );

        // Patch the single-product cache if any consumer has loaded it.
        queryClient.setQueryData(queryKeys.product(productId), (old) =>
          old ? { ...old, quantity: newQty } : old
        );
      }

      // 2) Invalidate per the State_Management.md table. Invalidation
      //    triggers a refetch on the next render / focus, picking up any
      //    server-side drift; the optimistic patch above keeps the UI
      //    correct in the meantime.
      invalidateAllStockInLists(queryClient);
      if (productId != null) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.product(productId),
        });
      }
      invalidateAllProductLists(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.reportLowStock });
    },
  });
}