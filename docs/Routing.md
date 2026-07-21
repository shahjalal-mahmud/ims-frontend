# Routing

**Library:** React Router (v6+). Client-side only — the PHP backend has no page routes to coordinate with (see API guide §1.1).

---

## 1. Route table

| Path                                       | Element                   | Guard       | Notes                                             |
| ------------------------------------------ | ------------------------- | ----------- | ------------------------------------------------- |
| `/login`                                   | `Login`                   | Public only | Redirect to `/dashboard` if already authenticated |
| `/` _(layout route)_                       | `AppShell`                | Protected   | Wraps all authenticated routes below              |
| &nbsp;&nbsp;`/dashboard`                   | `Dashboard`               | Protected   | Default landing page after login                  |
| &nbsp;&nbsp;`/inventory/products`          | `ProductsList`            | Protected   |                                                   |
| &nbsp;&nbsp;`/inventory/products/new`      | `ProductForm` (create)    | Protected   |                                                   |
| &nbsp;&nbsp;`/inventory/products/:id/edit` | `ProductForm` (edit)      | Protected   |                                                   |
| &nbsp;&nbsp;`/inventory/categories`        | `CategoriesList`          | Protected   |                                                   |
| &nbsp;&nbsp;`/inventory/suppliers`         | `SuppliersList`           | Protected   |                                                   |
| &nbsp;&nbsp;`/inventory/stock-in`          | `StockInList`             | Protected   |                                                   |
| &nbsp;&nbsp;`/inventory/stock-out`         | `StockOutList`            | Protected   |                                                   |
| &nbsp;&nbsp;`/reports/inventory`           | `InventoryReport`         | Protected   |                                                   |
| &nbsp;&nbsp;`/reports/low-stock`           | `LowStockReport`          | Protected   |                                                   |
| &nbsp;&nbsp;`/reports/stock-in`            | `StockInReport`           | Protected   |                                                   |
| &nbsp;&nbsp;`/reports/stock-out`           | `StockOutReport`          | Protected   |                                                   |
| &nbsp;&nbsp;`/` (index)                    | `Navigate` → `/dashboard` | Protected   | Bare `/` redirects into the app                   |
| `*`                                        | `NotFound`                | Either      | Catch-all, works whether authenticated or not     |

There is no `/settings` screen in v1 (nothing in the API surface backs it yet) — omit until a backend endpoint exists for it, to avoid a page with nothing to call.

---

## 2. Route tree (App.jsx sketch)

```jsx
<AuthBootstrap>
  <Routes>
    <Route
      path="/login"
      element={
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      }
    />

    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />

      <Route path="inventory/products" element={<ProductsList />} />
      <Route
        path="inventory/products/new"
        element={<ProductForm mode="create" />}
      />
      <Route
        path="inventory/products/:id/edit"
        element={<ProductForm mode="edit" />}
      />
      <Route path="inventory/categories" element={<CategoriesList />} />
      <Route path="inventory/suppliers" element={<SuppliersList />} />
      <Route path="inventory/stock-in" element={<StockInList />} />
      <Route path="inventory/stock-out" element={<StockOutList />} />

      <Route path="reports/inventory" element={<InventoryReport />} />
      <Route path="reports/low-stock" element={<LowStockReport />} />
      <Route path="reports/stock-in" element={<StockInReport />} />
      <Route path="reports/stock-out" element={<StockOutReport />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
</AuthBootstrap>
```

---

## 3. Guards

### `ProtectedRoute`

- Reads `{ user, ready }` from `AuthContext`.
- `!ready` → full-page spinner (still waiting on `AuthBootstrap`'s `/auth/me.php` call).
- `ready && !user` → `<Navigate to="/login" replace state={{ from: location }} />`.
- `ready && user` → render `<Outlet />` (or `children`, depending on usage site).

### `PublicOnlyRoute` (wraps `/login`)

- If `user` is already set, redirect to `/dashboard` — an authenticated user shouldn't see the login form.
- Otherwise render `Login`.

### Redirect-back-after-login

- `ProtectedRoute` stashes `location` in `state.from` when redirecting to `/login`.
- `Login`'s success handler navigates to `location.state?.from?.pathname ?? '/dashboard'`.

---

## 4. URL as state for filters

List pages (`/inventory/products`, report pages) encode their filters in **URL search params** rather than component state:

```
/inventory/products?search=widget&categoryId=3&lowStockOnly=true&page=2
```

Rationale and implementation pattern are in `Frontend-Architecture.md` §8 and `State-Management.md` §Filters. Routing implication: use `useSearchParams()` from React Router as the single read/write point for these values — don't duplicate them into `useState`.

---

## 5. Navigation conventions

- Use `<Link>` / `useNavigate()` exclusively — never `window.location.href` for in-app navigation (reserve `window.location.assign` for the hard-redirect-on-401 case in the Axios interceptor, where a full reload is intentional to guarantee clean state).
- Row clicks that navigate to a detail/edit page use `useNavigate()` in an `onClick`, not a wrapping `<Link>` around table rows (keeps row action buttons like "delete" from also triggering navigation).
- Breadcrumbs are not required for this app's depth (max 2 levels) — the `Topbar` page title plus `Sidebar` active-state is sufficient wayfinding.
