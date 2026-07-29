// src/lib/queryKeys.js
// Centralized React Query keys factory.
//
// WHY a single file for keys?
// Every cache lookup and every invalidation runs through these keys.
// If two hooks accidentally use slightly-different array shapes for
// "the same" cache (e.g. ['products'] vs ['products', undefined]),
// they won't share cache and won't invalidate each other — and the
// bug is silent. Centralizing the keys here means we have one
// canonical source of truth and a typo only takes one keystroke to
// fix.
//
// Before (typo-prone, copy-paste between files):
//   useQuery({ queryKey: ['proudcts'], ... })        // ❌
//   queryClient.invalidateQueries({ queryKey: ['products'] })  // ✅
//
// After (this file):
//   useQuery({ queryKey: queryKeys.products, ... })
//   queryClient.invalidateQueries({ queryKey: queryKeys.products })
//
// Keys are split into "static" (single array) and "dynamic" (a
// function that returns the array) depending on whether they need a
// parameter. Predicate-style invalidations on the dynamic keys use
// just the prefix — e.g. ['products'] (the array itself) is the
// prefix for every `queryKeys.products(filters)` variant.

export const queryKeys = {
  // Auth: just the user object — see useAuthQueries.js.
  me: ['auth', 'me'],

  // Categories / Suppliers — single list, no filters. The whole list is
  // one cache entry.
  categories: ['categories'],
  suppliers: ['suppliers'],

  // Products: list variants are keyed by the whole filter object so a
  // new filter set is a new cache entry. `product(id)` is the
  // single-product cache (used by the edit page).
  products: (filters) => ['products', filters],
  product: (id) => ['products', id],

  // Stock-in / Stock-out: paginated history lists.
  stockIn: (filters) => ['stockIn', filters],
  stockOut: (filters) => ['stockOut', filters],

  // Dashboard summary — single read.
  dashboard: ['dashboard', 'summary'],

  // Reports — see src/queries/useReportQueries.js for the Dashboard
  // reuses `reportLowStock` contract (Milestone 8).
  reportInventory: (categoryId) => ['reports', 'inventory', categoryId],
  reportLowStock: ['reports', 'lowStock'],
  reportStockIn: (range) => ['reports', 'stockIn', range],
  reportStockOut: (range) => ['reports', 'stockOut', range],
};