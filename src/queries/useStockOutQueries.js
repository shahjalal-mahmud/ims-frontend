// src/queries/useStockOutQueries.js
// Stock-out hooks — list + create + optimistic patch + cascade invalidate.
//
// Structurally identical to src/queries/useStockInQueries.js. Read that
// file's top-of-file comment first; the only differences are:
//
//   - The endpoint changes (/stock_out/* vs /stock_in/*).
//   - 409 "Insufficient stock: only N units available" is an
//     *expected* business outcome on POST (see
//     docs/Error_Handling.md §3) — the modal STAYS OPEN and shows the
//     backend's message verbatim so the user can adjust the quantity.
//
// Invalidation rules (per docs/State_Management.md §1):
//   createStockOut → queryKeys.stockOut(*),
//                    queryKeys.product(id),
//                    queryKeys.products(*) (every list variant),
//                    queryKeys.dashboard,
//                    queryKeys.reportLowStock
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
import { createStockOut, listStockOut } from '../api/stockOut';
import { queryKeys } from '../lib/queryKeys';

// Predicate helpers — invalidate every list variant matching the prefix.
const invalidateAllStockOutLists = (qc) =>
  qc.invalidateQueries({ queryKey: ['stockOut'] });

const invalidateAllProductLists = (qc) =>
  qc.invalidateQueries({ queryKey: ['products'] });

/**
 * useStockOutList(filters)
 * GET /stock_out/list.php with the supplied filters. Returns:
 *   { items: [...], pagination: { page, limit, total, totalPages } }
 *
 * Each item has the shape documented in the API guide §4.7:
 *   { id, productId, productName, quantity, sellingPrice, note, createdAt }
 *
 * Filters default to page 1, limit 20 (matches the backend's defaults).
 */
export function useStockOutList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.stockOut(filters),
    queryFn: async () => {
      const { data } = await listStockOut(filters);
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
 * useCreateStockOut()
 * POST /stock_out/create.php. Invalidates the queries it affects on
 * success:
 *
 *   - queryKeys.stockOut(*)       every stock-out list variant refetches
 *   - queryKeys.product(id)      the single-product cache for the affected id
 *   - queryKeys.products(*)      every product list variant (so the table
 *                                reflects the new quantity immediately)
 *   - queryKeys.dashboard        the dashboard KPI tile refreshes on next
 *                                refetch (totalStockUnits + lowStockCount)
 *   - queryKeys.reportLowStock   the low-stock report responds to qty change
 *
 * Optimistic UI (docs/Frontend_Architecture.md §Optimistic UI /
 * FRONTEND_API_INTEGRATION_GUIDE.md §6.6): the backend returns
 * `newProductQuantity` in `data.data` (after envelope unwrap). We
 * proactively patch every cached product-list entry and the
 * single-product entry with that value, so the displayed quantity
 * changes immediately everywhere — no awaiting a refetch. (See
 * State_Management.md §1 invalidation table footnote.)
 *
 * Error paths (UI Screens §8 + Error_Handling.md §1/§3/§5):
 *   - 422 → field errors mapped onto the form by the modal via
 *           applyServerErrors (Form_Validation.md §8).
 *   - 404 → "Product not found" — usually means the selected product
 *           was deleted while the modal was open; refresh the dropdown.
 *   - 409 → "Insufficient stock: only N units available" — expected
 *           business-rule conflict, shown verbatim by the modal's
 *           onError handler (Error_Handling.md §3).
 *   - 500 → generic fallback ("Something went wrong. Please try
 *           again."); the transaction rolls back, so the user's
 *           input is preserved for retry.
 */
export function useCreateStockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStockOut,
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
      invalidateAllStockOutLists(queryClient);
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