# Component Architecture

Planned component inventory so nothing gets built twice or built ad hoc mid-feature. Three tiers: **layout**, **ui** (generic, reusable, app-agnostic), **domain** (feature-specific, composed from `ui/`).

---

## 1. Layout components (`components/layout/`)

| Component  | Responsibility                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `AppShell` | Renders `Sidebar` + `Topbar` + `<Outlet />`; the element on the protected layout route                        |
| `Sidebar`  | Nav links (Dashboard, Products, Categories, Suppliers, Stock In, Stock Out, Reports); highlights active route |
| `Topbar`   | Page title slot, user menu (username + logout), theme toggle                                                  |

---

## 2. Auth components (`auth/`)

| Component        | Responsibility                                                                         |
| ---------------- | -------------------------------------------------------------------------------------- |
| `AuthBootstrap`  | Fires `GET /auth/me.php` once on mount; renders spinner/children/error based on result |
| `ProtectedRoute` | Reads `AuthContext`; redirects to `/login` if no user; renders `<Outlet/>` otherwise   |
| `AuthContext`    | Provides `{ user, setUser, clear }` — see `State-Management.md`                        |

---

## 3. Generic UI components (`components/ui/`)

These know nothing about categories/products/stock — pure, reusable, prop-driven. Built on DaisyUI classes + Tailwind.

| Component                                           | Props (indicative)                                                | Notes                                                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Button`                                            | `variant` (primary/secondary/ghost/danger), `loading`, `disabled` | `loading` renders a spinner + disables the button; single source for all "Save"/"Delete" buttons        |
| `Input`                                             | `label`, `error`, `...registerProps`                              | Wraps RHF `register()`; renders label, input, error text in one place                                   |
| `Select`                                            | `label`, `options`, `error`, `...registerProps`                   | Used for category/supplier dropdowns and any enum field                                                 |
| `Modal`                                             | `open`, `onClose`, `title`, `children`                            | DaisyUI `<dialog>`-based; traps focus, closes on backdrop/Esc                                           |
| `ConfirmDialog`                                     | `open`, `onConfirm`, `onCancel`, `title`, `message`, `danger`     | Thin wrapper over `Modal` for delete confirmations                                                      |
| `DataTable`                                         | `columns`, `data`, `isLoading`, `emptyState`, `rowActions`        | Generic table renderer; renders `Skeleton` rows when `isLoading`, `EmptyState` when `data.length === 0` |
| `Pagination`                                        | `page`, `totalPages`, `onPageChange`                              | Simple prev/next + page numbers, driven by backend's `pagination` object                                |
| `SearchBar`                                         | `value`, `onChange`, `placeholder`                                | Wraps the debounced search pattern (`useDebounce` is used by the caller, not inside this component)     |
| `Card`                                              | `children`, `className`                                           | Base container — dashboard KPIs, form wrappers, empty states all use it                                 |
| `Badge`                                             | `variant` (success/warning/danger/neutral), `children`            | Used for stock status (in stock / low / out), and category/status tags                                  |
| `Loader`                                            | `size`                                                            | Full-page or inline spinner                                                                             |
| `Skeleton`                                          | `variant` (row/card/text), `count`                                | Placeholder blocks for tables/cards while `isLoading`                                                   |
| `EmptyState`                                        | `title`, `description`, `action` (optional CTA button)            | Used by every list screen — see `UI-Screens.md` for per-page copy                                       |
| `Toast` (not a component — configured `<Toaster/>`) | —                                                                 | Mounted once in `main.jsx`; components call `toast.success()/error()` directly from `react-hot-toast`   |

**Composition rule:** `ui/` components accept plain props and emit callbacks (`onClose`, `onConfirm`, `onChange`). They never import from `api/` or `queries/`. This is what makes them reusable and independently testable.

---

## 4. Domain components (`components/domain/`)

Feature-specific, but still presentation-focused — they receive data/handlers as props from the page, they don't fetch their own data (the page's `queries/` hook does that). Exception: small self-contained pieces (e.g. a modal that needs its own category list for a dropdown) may call a `queries/` hook directly if lifting it to the page would be awkward — use judgment, but default to "pages fetch, components render."

| Component            | Used on                            | Responsibility                                                                                           |
| -------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `KpiCard`            | Dashboard                          | One metric tile (label, value, icon, optional trend/link)                                                |
| `CategoryModal`      | Categories list                    | Create/edit form for a category, wraps `Modal` + RHF + Zod                                               |
| `SupplierModal`      | Suppliers list                     | Create/edit form for a supplier                                                                          |
| `ProductFormFields`  | Product Form page                  | The shared field set for both create and edit (quantity field conditionally shown, read-only, edit-only) |
| `StockInModal`       | Stock In list, Products list       | Record-stock-in form (product select, supplier, quantity, price, note)                                   |
| `StockOutModal`      | Stock Out list, Products list      | Record-stock-out form (product select, quantity, price, note); client-side max-qty guard                 |
| `LowStockRow`        | Low Stock report, Dashboard widget | Renders one product's shortfall with a "Order N more" hint                                               |
| `RecentActivityList` | Dashboard                          | Renders `dashboard.summary.recentActivity` items                                                         |
| `StockStatusBadge`   | Products list                      | Wraps `Badge`; derives success/warning/danger from `quantity` vs `minStockLevel`                         |

---

## 5. Component decision rules

1. **New UI element needed?** Check `ui/` first — most needs (a labeled input, a confirm dialog, a table) already have a home there. Only add a new `ui/` component if it's genuinely reusable across ≥2 features.
2. **Feature-specific but presentation-only?** → `domain/`.
3. **Needs its own data fetching beyond what the page already has?** Still prefer lifting the query to the page and passing props down; only let a `domain/` component own a query when it's a self-contained modal opened from multiple places (e.g. `StockInModal` used from both the Stock In page and the Products page) — in that case the modal owning its own product-list query avoids prop-drilling it through two different parents.
4. **Never** put Axios calls or `useQuery`/`useMutation` inside `ui/` components.

---

## 6. File/Component naming

- Component files: `PascalCase.jsx`, default export matching the filename.
- One component per file, except tiny presentational sub-parts used only by their parent (co-locate as `ParentName.SubPart.jsx` or an internal function — avoid a proliferation of one-line files).
- Props are destructured in the function signature; no `props.x` access inside the body.
