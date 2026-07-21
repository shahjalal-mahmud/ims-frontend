# State Management

Decide once, don't relitigate mid-build. Two systems, cleanly split by _kind_ of state — no overlap:

- **TanStack Query** → anything that originates from the backend (server state).
- **React Context** → small, cross-cutting client-only state.
- **Local `useState`** → everything scoped to one component/page (form drafts, modal open/closed, table sort direction on a screen that doesn't need it in the URL).
- **URL search params** → filters/pagination on list & report pages.

No Redux, no Zustand — see `Frontend-Architecture.md` §1 for why.

---

## 1. Server state → TanStack Query

Every piece of data that comes from an endpoint in the API guide is owned by a Query hook in `queries/`. Never copy server data into `useState` "to make it easier to edit" — mutate via a `useMutation` and let Query's cache be the source of truth.

| Data                                       | Query hook                            | Key shape                                   |
| ------------------------------------------ | ------------------------------------- | ------------------------------------------- |
| Current user (`/auth/me.php`)              | `useMe()`                             | `['auth', 'me']`                            |
| Categories list                            | `useCategories()`                     | `['categories']`                            |
| Suppliers list                             | `useSuppliers()`                      | `['suppliers']`                             |
| Products list (paginated/filtered)         | `useProducts(filters)`                | `['products', filters]`                     |
| Single product                             | `useProduct(id)`                      | `['products', id]`                          |
| Stock-in list                              | `useStockInList(filters)`             | `['stockIn', filters]`                      |
| Stock-out list                             | `useStockOutList(filters)`            | `['stockOut', filters]`                     |
| Dashboard summary                          | `useDashboardSummary()`               | `['dashboard', 'summary']`                  |
| Reports (inventory/low-stock/stock in/out) | `useInventoryReport(categoryId)` etc. | `['reports', 'inventory', categoryId]` etc. |

Centralize key construction in `lib/queryKeys.js` (a small factory object) so invalidation calls elsewhere can't typo a key:

```js
// lib/queryKeys.js
export const queryKeys = {
  me: ["auth", "me"],
  categories: ["categories"],
  suppliers: ["suppliers"],
  products: (filters) => ["products", filters],
  product: (id) => ["products", id],
  stockIn: (filters) => ["stockIn", filters],
  stockOut: (filters) => ["stockOut", filters],
  dashboard: ["dashboard", "summary"],
  reportInventory: (categoryId) => ["reports", "inventory", categoryId],
  reportLowStock: ["reports", "lowStock"],
  reportStockIn: (range) => ["reports", "stockIn", range],
  reportStockOut: (range) => ["reports", "stockOut", range],
};
```

### Mutations & invalidation

Every `useMutation` invalidates the queries it affects `onSuccess`:

| Mutation                           | Invalidates                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `createCategory`/`update`/`delete` | `queryKeys.categories` (and `queryKeys.products(*)` if category name is denormalized into product rows — otherwise not needed) |
| `createSupplier`/`update`/`delete` | `queryKeys.suppliers`                                                                                                          |
| `createProduct`/`update`/`delete`  | `queryKeys.products(*)` (use a predicate to invalidate all filter variants), `queryKeys.dashboard`                             |
| `createStockIn`                    | `queryKeys.stockIn(*)`, `queryKeys.product(id)`, `queryKeys.products(*)`, `queryKeys.dashboard`, low-stock report              |
| `createStockOut`                   | Same as `createStockIn`                                                                                                        |
| `login`                            | Seed `queryKeys.me` directly with the response (avoid an extra round trip)                                                     |
| `logout`                           | `queryClient.clear()` — wipe everything, not just `me`                                                                         |

### Defaults

- `staleTime`: `30_000` (30s) for lists that don't change every second (categories, suppliers). `0`/short for products list if stock changes are frequent in your usage pattern — tune per team preference, but pick one number and put it in `main.jsx`'s `QueryClient` default config rather than per-hook.
- `placeholderData: keepPreviousData` on all paginated list queries, so page/filter changes don't blank the table.
- `retry`: disable retry on `401`/`404`/`409`/`422` (these are not transient — retrying won't help); default retry (1–2x) is fine for network/`500`.

---

## 2. Client state → React Context

Two contexts, kept intentionally small:

### `AuthContext`

```js
{ user: { id, username } | null, ready: boolean, setUser(user), clear() }
```

- `ready` becomes `true` once `AuthBootstrap`'s initial `/auth/me.php` call settles (success or `401`).
- Written to by: `AuthBootstrap` (initial), `Login` success handler, the Axios 401 interceptor (`clear()`), `Logout` handler (`clear()`).
- Read by: `ProtectedRoute`, `PublicOnlyRoute`, `Topbar` (display username).
- **Never** holds a token/cookie — there isn't one to hold (HttpOnly session cookie, see API guide §1.5).

### `ThemeContext`

```js
{
  theme: ("light" | "dark", toggleTheme());
}
```

- Persisted to `localStorage` (UI preference only — not auth-related, so this doesn't conflict with the "never store auth in localStorage" rule).
- Read by `Topbar` (toggle button) and applied via a `data-theme` attribute on `<html>` for DaisyUI.

That's it — two contexts, both small. If a third context feels tempting mid-build, first check whether the data is actually server state (→ Query) or page-local state (→ `useState`) before adding one.

---

## 3. Local component state → `useState`

Stays local, never lifted:

- Modal open/closed flags (`CategoryModal`, `StockInModal`, etc.).
- Form field values — owned by React Hook Form internally, not mirrored into `useState`.
- Which row is being edited/deleted (e.g. `const [deletingId, setDeletingId] = useState(null)` to drive a `ConfirmDialog`).
- Non-shareable UI toggles (e.g. "show advanced filters" collapse) that don't need to survive a refresh.

---

## 4. Filters & pagination → URL search params

List and report pages store their filter/pagination state in the URL (`useSearchParams`), not `useState` and not Context. See `Routing.md` §4 and `Frontend-Architecture.md` §8.

```js
// pages/inventory/ProductsList.jsx (sketch)
const [searchParams, setSearchParams] = useSearchParams();
const filters = {
  search: searchParams.get("search") ?? "",
  categoryId: searchParams.get("categoryId") ?? "",
  supplierId: searchParams.get("supplierId") ?? "",
  lowStockOnly: searchParams.get("lowStockOnly") === "true",
  page: Number(searchParams.get("page") ?? 1),
  limit: Number(searchParams.get("limit") ?? 20),
};

const { data, isLoading, isFetching } = useProducts(filters);
```

Updating a filter calls `setSearchParams({ ...current, page: 1, search: newValue })` — always reset `page` to `1` when a non-page filter changes.

---

## 5. Toast state

Not app state at all — `react-hot-toast` manages its own internal store. Components call `toast.success(msg)` / `toast.error(msg)` directly; no wrapper context needed. See `Error-Handling.md` for the outcome → toast mapping.

---

## 6. Decision checklist (use when unsure where something goes)

1. Did it come from an API response? → **TanStack Query**.
2. Does more than one unrelated part of the app need to read it right now (not "might later")? → **Context**, and keep the shape minimal.
3. Should refreshing the page or sharing the URL preserve it? → **URL search params**.
4. Otherwise → **local `useState`**, scoped to the component that owns the interaction.
