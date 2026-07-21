# Frontend Architecture

## Inventory Management System — React (Vite) Frontend

**Companion docs:** `API_INTEGRATION_GUIDE.md` (source of truth for endpoints/behavior), `UI-Screens.md`, `Component-Architecture.md`, `Routing.md`, `State-Management.md`.

---

## 1. Tech Stack

| Concern                | Choice                        | Notes                                                                             |
| ---------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| Build tool             | Vite                          | React template                                                                    |
| Routing                | React Router (v6+)            | Client-side only, no backend routing to coordinate                                |
| HTTP client            | Axios                         | Single configured instance, `withCredentials: true`                               |
| Styling                | Tailwind CSS                  | Utility-first, tokens defined in `UI-Design-System.md`                            |
| Component library      | DaisyUI (Tailwind plugin)     | Base components (button, modal, table, badge) themed via Tailwind                 |
| Forms                  | React Hook Form               | Uncontrolled-first, minimal re-renders                                            |
| Validation             | Zod (+ `@hookform/resolvers`) | Schema-based, mirrors backend rules (see `Form-Validation.md`)                    |
| Tables                 | Custom table components       | TanStack Table only if a screen needs sorting/column features beyond simple lists |
| Icons                  | Lucide React                  | Consistent icon set                                                               |
| Notifications          | React Hot Toast               | Single `<Toaster />` mounted at app root                                          |
| Server state / caching | TanStack Query                | Wraps the `api/` layer; owns caching, refetch, mutation state                     |
| Client/global state    | React Context                 | Auth user, theme, and other cross-cutting UI state (see `State-Management.md`)    |

**Why TanStack Query + Context, not Redux/Zustand:** Almost all state in this app is _server state_ (categories, products, stock, reports) — TanStack Query is built for exactly that (caching, invalidation, loading/error flags, refetch-on-focus). What's left (current user, theme, ephemeral UI flags) is small enough for Context. Introducing a global store on top would duplicate what Query already gives us.

---

## 2. Project Structure

```
src/
├── api/                     # Thin wrappers around Axios calls — one file per resource
│   ├── client.js            # Axios instance + interceptors
│   ├── auth.js
│   ├── categories.js
│   ├── suppliers.js
│   ├── products.js
│   ├── stockIn.js
│   ├── stockOut.js
│   ├── dashboard.js
│   └── reports.js
│
├── queries/                 # TanStack Query hooks — one file per resource
│   ├── useAuthQueries.js    # useMe, useLogin, useLogout
│   ├── useCategoryQueries.js
│   ├── useSupplierQueries.js
│   ├── useProductQueries.js
│   ├── useStockInQueries.js
│   ├── useStockOutQueries.js
│   ├── useDashboardQuery.js
│   └── useReportQueries.js
│
├── auth/
│   ├── AuthContext.jsx      # Global auth store (user object only — never the cookie)
│   ├── AuthBootstrap.jsx    # Calls /auth/me.php once on app boot
│   └── ProtectedRoute.jsx   # Redirects guests to /login
│
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── inventory/
│   │   ├── ProductsList.jsx
│   │   ├── ProductForm.jsx
│   │   ├── CategoriesList.jsx
│   │   ├── SuppliersList.jsx
│   │   ├── StockInList.jsx
│   │   └── StockOutList.jsx
│   ├── reports/
│   │   ├── InventoryReport.jsx
│   │   ├── LowStockReport.jsx
│   │   ├── StockInReport.jsx
│   │   └── StockOutReport.jsx
│   └── NotFound.jsx
│
├── components/
│   ├── ui/                  # Generic, app-agnostic building blocks
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Modal.jsx
│   │   ├── DataTable.jsx
│   │   ├── Pagination.jsx
│   │   ├── SearchBar.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Loader.jsx
│   │   ├── Skeleton.jsx
│   │   ├── EmptyState.jsx
│   │   └── ConfirmDialog.jsx
│   ├── layout/
│   │   ├── AppShell.jsx     # Sidebar + Topbar + <Outlet/>
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   └── domain/               # Feature-specific composites (built from ui/)
│       ├── ProductFormFields.jsx
│       ├── StockInModal.jsx
│       ├── StockOutModal.jsx
│       ├── CategoryModal.jsx
│       ├── SupplierModal.jsx
│       └── KpiCard.jsx
│
├── lib/
│   ├── validators.js         # Zod schemas (see Form-Validation.md)
│   ├── format.js             # Currency, date, quantity formatters
│   ├── queryKeys.js          # Centralized TanStack Query key factory
│   └── errors.js             # Shared error-parsing helpers (see Error-Handling.md)
│
├── config.js                 # BASE_URL, timeouts
├── App.jsx                   # Route table (see Routing.md)
└── main.jsx                  # QueryClientProvider, AuthBootstrap, Toaster, Router
```

**Rule:** components never call `axios` or the `api/` layer directly. They call a `queries/` hook. The `queries/` layer never touches the DOM or React state beyond what Query manages. This keeps each layer testable in isolation.

---

## 3. Layered Data Flow

```
Component
   │  calls
   ▼
queries/useXQueries.js   (useQuery / useMutation, owns cache key + invalidation)
   │  calls
   ▼
api/x.js                 (one function per endpoint, unwraps { data } envelope)
   │  calls
   ▼
api/client.js             (Axios instance: baseURL, withCredentials, interceptors)
   │
   ▼
PHP Backend
```

Each layer has exactly one responsibility:

- **`api/*`** — knows the URL, HTTP verb, and how to unwrap `response.data.data`. Never touches React.
- **`queries/*`** — knows the cache key, `staleTime`, and which other queries to invalidate on success. Never touches the DOM.
- **Components/pages** — call a hook, render `data`/`isLoading`/`isError`, and forward user actions to `mutate()`.

---

## 4. Authentication Flow

Full detail lives in the API guide §2; the frontend-side contract is:

1. `main.jsx` mounts `<AuthBootstrap>` around the router.
2. `AuthBootstrap` fires `useMe()` (a `useQuery` wrapping `GET /auth/me.php`) exactly once on mount.
   - Success → `AuthContext` user = response data, render children.
   - `401` → this is **expected**, not an error state. Render children anyway; `ProtectedRoute` will redirect to `/login` for any route that needs auth.
   - Any other error (network, 500) → render a full-page error/retry screen.
3. `ProtectedRoute` reads `user` from `AuthContext` and redirects unauthenticated visitors to `/login`, preserving the intended destination.
4. `Login.jsx` calls a `useLogin()` mutation. On success it writes the user into `AuthContext` (and seeds the `me` query cache to avoid a redundant refetch), then navigates to `/dashboard`.
5. A global Axios response interceptor (in `api/client.js`) watches for `401` on **any non-login request**. On `401`:
   - Clear `AuthContext` user.
   - Clear the entire TanStack Query cache (`queryClient.clear()`) — stale authenticated data must not leak to the next login.
   - Redirect to `/login` (skip this if already on `/login` — that 401 just means "wrong password").
6. Logout calls `useLogout()` mutation → on settle (success or failure), clear `AuthContext`, clear the query cache, navigate to `/login`.

See `State-Management.md` §2 and `Error-Handling.md` §401 for the exact code contracts.

---

## 5. API Layer Conventions

- One file per backend resource under `api/`, mirroring the Endpoint Reference in the API guide (`categories.js`, `products.js`, etc.).
- Every exported function returns **already-unwrapped data** (`response.data.data`), except where the caller needs the full envelope (e.g. `message` for a toast) — in that case return `response.data` and let the `queries/` layer destructure.
- Functions are named by verb + resource: `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`.
- No business logic in `api/*` — no formatting, no conditionals beyond building query params.
- Query params for filters/pagination are passed as a single params object straight to Axios's `params` config; do not hand-build query strings.

---

## 6. Error Handling (summary)

Full matrix in `Error-Handling.md`. Architectural placement:

- **Network errors / 401** → handled once, globally, in the Axios interceptor. Components never see these.
- **404 on a "get single" request** → handled in the `queries/` hook or the page (redirect to list + toast), since the correct behavior differs by page.
- **409 (business-rule conflict)** and **422 (validation)** → always surfaced at the point of the mutation (inline form errors for 422, toast/banner for 409). Never swallowed globally, because they're expected, actionable outcomes, not failures.
- **500 / unexpected** → generic toast + optional retry, handled per-mutation or per-query.

---

## 7. Loading States

Handled by TanStack Query's `isLoading` / `isFetching` / `isPending` flags — no manual `loading` `useState` needed anywhere data comes from a query or mutation. Which UI to render for which flag is documented in `UI-Design-System.md` §Loading & Skeletons and summarized per-page in `UI-Screens.md`.

Rule of thumb:

- First load of a page → `isLoading` → skeleton.
- Background refetch (filters changed, refocus) → `isFetching && !isLoading` → keep old data visible, show a subtle indicator (see `keepPreviousData` in §8).
- Mutation in flight → `isPending` on the mutation → disable the triggering button, show inline spinner.

---

## 8. Pagination & Filtering Pattern

Paginated endpoints (`products`, `stock_in`, `stock_out` lists) return `{ items, pagination }` — see API guide §3.5. Frontend pattern:

- Filter state (`search`, `categoryId`, `supplierId`, `lowStockOnly`, `page`, `limit`) lives in **URL search params**, not component state, so filtered views are shareable/bookmarkable and survive refresh (see `State-Management.md` §Filters).
- The corresponding `queries/useXQueries.js` hook reads those params, builds the query key from them (`['products', filters]`), and passes `placeholderData: keepPreviousData` so the table doesn't flash empty while a new page/filter loads.
- The search input is debounced (250ms, `useDebounce`) **before** it's written to the URL param, so typing doesn't spam the network or the history stack.

---

## 9. Protected Routes

See `Routing.md` for the full route table. Architecturally: a single `<ProtectedRoute>` wraps a layout route (`AppShell`) so every nested route inherits the guard — no need to wrap each page individually.

---

## 10. Theming

Light/dark theme is a **local-only** UI preference (not a backend concept). It lives in `AuthContext`'s sibling — a small `ThemeContext` — persisted to `localStorage` (this is fine for UI prefs; the "never localStorage" rule from the API guide is specifically about auth tokens, not theme). DaisyUI's `data-theme` attribute on `<html>` is toggled from this context. Full palette in `UI-Design-System.md`.

---

## 11. What NOT to do (carried over from the API guide's mistake list)

- Don't call `axios` directly from a component — always go through `api/` → `queries/`.
- Don't store the user object in more than one place (`AuthContext` is the single source of truth; TanStack Query's `me` cache exists only to drive the initial bootstrap, not as a second copy read by components).
- Don't build a Redux/Zustand store "just in case" — server state goes in Query, everything else goes in Context, per `State-Management.md`.
- Don't hand-roll pagination math on the client — the backend returns `pagination.totalPages`; use it directly.
