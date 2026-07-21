// src/lib/queryKeys.js
// Centralized React Query keys factory. See docs/State_Management.md §1.

export const queryKeys = {
  me: ['auth', 'me'],
  categories: ['categories'],
  suppliers: ['suppliers'],
  products: (filters) => ['products', filters],
  product: (id) => ['products', id],
  stockIn: (filters) => ['stockIn', filters],
  stockOut: (filters) => ['stockOut', filters],
  dashboard: ['dashboard', 'summary'],
  reportInventory: (categoryId) => ['reports', 'inventory', categoryId],
  reportLowStock: ['reports', 'lowStock'],
  reportStockIn: (range) => ['reports', 'stockIn', range],
  reportStockOut: (range) => ['reports', 'stockOut', range],
};