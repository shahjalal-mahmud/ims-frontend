# Frontend Implementation Roadmap

Build order for the Inventory Management System frontend. Each milestone is meant to be shippable/demoable on its own before moving to the next — mirrors the way the backend was presumably built module-by-module. Cross-references point to the doc with full detail for that milestone.

---

## Milestone 0 — Setup

- Scaffold Vite + React project.
- Install: `react-router-dom`, `axios`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `react-hot-toast`, `tailwindcss` + `daisyui`.
- Configure Tailwind + DaisyUI, set up the two themes (`UI-Design-System.md` §1).
- Create `src/config.js` (`BASE_URL`, `.env.development` / `.env.production`) — API guide §1.2.
- Create `src/api/client.js` — Axios instance with `withCredentials: true`, base response interceptor stub (401 handling wired in Milestone 1).
- Create the folder skeleton from `Frontend-Architecture.md` §2 (empty files are fine — establishes the structure up front).
- Mount `QueryClientProvider` + `<Toaster />` in `main.jsx`.
- **Exit criteria:** app boots to a blank page with no console errors, `.env` correctly points at the local backend, hitting `/auth/me.php` in a network tab manually returns `401` as expected.

---

## Milestone 1 — Authentication

- Build `AuthContext`, `AuthBootstrap`, `ProtectedRoute`, `PublicOnlyRoute` (`Component-Architecture.md` §2, `Routing.md` §3).
- Build `queries/useAuthQueries.js` (`useMe`, `useLogin`, `useLogout`).
- Build `Login.jsx` page with RHF + Zod (`Form-Validation.md` §1).
- Wire the global `401` interceptor fully (`Error-Handling.md` §2).
- Build minimal route table: `/login`, a placeholder protected `/dashboard`, catch-all `NotFound`.
- **Exit criteria:** can log in, land on a blank protected dashboard, refresh and stay logged in, log out and get redirected to `/login`; an expired/invalid session on any protected call bounces to `/login` with a toast.

---

## Milestone 2 — Dashboard Layout

- Build `AppShell`, `Sidebar`, `Topbar` (`Component-Architecture.md` §1).
- Full route table wired per `Routing.md` §1–2 (pages can be stub placeholders initially).
- Build generic `ui/` primitives needed everywhere downstream: `Button`, `Input`, `Select`, `Modal`, `Card`, `Badge`, `Loader`, `Skeleton`, `EmptyState`, `DataTable`, `Pagination`, `SearchBar`, `ConfirmDialog` (`Component-Architecture.md` §3, styled per `UI-Design-System.md`).
- Build real `Dashboard.jsx` — `useDashboardSummary()`, `KpiCard` × 4, `RecentActivityList`, skeleton loading state (`UI-Screens.md` §2).
- **Exit criteria:** full nav shell works, all routes reachable (even if some are still placeholders), Dashboard shows live KPI data with correct loading/error states.

---

## Milestone 3 — Categories

- `api/categories.js`, `queries/useCategoryQueries.js` (list/create/update/delete + invalidation per `State-Management.md` §1).
- `CategoriesList.jsx`, `CategoryModal.jsx` (`UI-Screens.md` §3, `Form-Validation.md` §2).
- Full CRUD + delete confirm + empty state.
- **Exit criteria:** categories can be created, edited, deleted end-to-end with correct toasts, inline `422` errors, and empty state; this milestone is also the template/reference implementation for Suppliers (next) since the pattern is identical.

---

## Milestone 4 — Suppliers

- `api/suppliers.js`, `queries/useSupplierQueries.js`.
- `SuppliersList.jsx`, `SupplierModal.jsx` (`UI-Screens.md` §4, `Form-Validation.md` §3).
- Same CRUD pattern as Categories, plus optional-field handling (`phone`, `email`, `address`).
- **Exit criteria:** same as Milestone 3, plus optional fields correctly omitted/validated when blank.

---

## Milestone 5 — Products

- `api/products.js`, `queries/useProductQueries.js` — list (paginated/filtered), get, create, update, delete.
- `ProductsList.jsx` — search (debounced), category/supplier filters, low-stock toggle, pagination, URL-param-driven filters (`State-Management.md` §4, `UI-Screens.md` §5).
- `ProductForm.jsx` + `ProductFormFields.jsx` — create and edit modes, `quantity` never submitted (`UI-Screens.md` §6, `Form-Validation.md` §4).
- `StockStatusBadge` for at-a-glance stock level.
- Delete with `409` handling for products with stock history (`Error-Handling.md` §3).
- **Exit criteria:** full product search/filter/paginate/CRUD works; category and supplier dropdowns are populated from Milestones 3–4's data; deleting a product with history shows the correct blocking message instead of a generic error.

---

## Milestone 6 — Stock In

- `api/stockIn.js`, `queries/useStockInQueries.js`.
- `StockInList.jsx`, `StockInModal.jsx` (`UI-Screens.md` §7, `Form-Validation.md` §5).
- Wire `newProductQuantity` cache update on success (`Frontend-Architecture.md` §Optimistic UI, `State-Management.md` §1 invalidation table).
- Make the modal callable both from `/inventory/stock-in` and as a row action on the Products page.
- **Exit criteria:** recording stock-in updates the product's displayed quantity immediately everywhere it's shown (list, dashboard KPI on next refetch), history list paginates correctly, `404`/`422`/`500` cases all show correct messaging.

---

## Milestone 7 — Stock Out

- `api/stockOut.js`, `queries/useStockOutQueries.js`.
- `StockOutList.jsx`, `StockOutModal.jsx` (`UI-Screens.md` §8, `Form-Validation.md` §6).
- Client-side max-quantity soft guard + `409 Insufficient stock` handling verbatim (`Error-Handling.md` §3).
- **Exit criteria:** mirrors Milestone 6, plus the insufficient-stock path is verified by actually attempting to over-sell a low-quantity product.

---

## Milestone 8 — Reports

- `api/reports.js`, `queries/useReportQueries.js` — inventory, low-stock, stock-in report, stock-out report.
- `InventoryReport.jsx` (category filter, totals footer, CSV export) — `UI-Screens.md` §9.
- `LowStockReport.jsx` (happy-path empty state) — `UI-Screens.md` §10.
- `StockInReport.jsx` / `StockOutReport.jsx` (date range, `422` on bad range) — `UI-Screens.md` §11–12, `Form-Validation.md` §7.
- Wire the Dashboard's low-stock widget to reuse `LowStockReport`'s query/data shape.
- **Exit criteria:** all four report screens render correct totals, date validation works, CSV export produces a sane file from already-fetched data (no extra network call).

---

## Milestone 9 — UI Polish

- Sweep every screen against `UI-Design-System.md`: consistent spacing, button variants, icon usage, loading/skeleton patterns.
- Sweep every list/empty state against the exact copy in `UI-Screens.md`.
- Theme toggle (`ThemeContext`) fully wired if not already done incidentally in Milestone 2.
- Accessibility pass: focus trapping in modals, keyboard nav (Esc closes modal, Enter submits forms), sufficient color contrast in both themes, labeled form inputs.
- Responsive pass: sidebar collapses on small viewports, tables scroll horizontally instead of breaking layout.
- Verify every case in `Error-Handling.md`'s matrix has been implemented somewhere and produces the documented behavior (not just the happy path).
- **Exit criteria:** app looks and behaves consistently end-to-end; a fresh pass through every `UI-Screens.md` entry finds no missing states.

---

## Milestone 10 — Testing

- Manual QA pass through every row of the Appendix — Endpoint Summary table in the API guide, confirming each endpoint's frontend consumer works.
- Deliberately trigger each error status (`401`, `404`, `409`, `422`, `500`, network-offline) per screen where applicable and confirm the documented UI response.
- Cross-check `Form-Validation.md` field rules against actual backend behavior (frontend and backend rules should already match — this pass catches drift).
- Optional, if time allows: component tests for `ui/` primitives (`Button`, `DataTable`, `Modal`) and a couple of integration tests (login flow, product create flow) using your test runner of choice (not prescribed here — pick one when you reach this milestone).
- **Exit criteria:** every endpoint in the API guide has a confirmed, working frontend consumer; every documented error case has been manually reproduced and handled correctly.

---

## Suggested sequencing notes

- Milestones 3 and 4 (Categories, Suppliers) are deliberately back-to-back and structurally identical — build Categories first as the reference pattern, then Suppliers should be fast to copy.
- Milestone 5 (Products) depends on 3 and 4 for its dropdowns — don't start it earlier even though it's tempting to build the "main" screen first.
- Milestones 6 and 7 (Stock In/Out) depend on 5 for the product picker and the `newProductQuantity` cache-update target.
- Milestone 8 (Reports) can start as soon as 5–7 exist, since reports are read-only aggregations of that same data.
- Keep Milestone 9 (Polish) as a dedicated pass rather than doing it screen-by-screen during 3–8 — consistency is easier to enforce in one sweep across finished screens than to maintain incrementally while the design system is still being discovered.
