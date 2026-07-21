# UI Screens

Every screen in the app, what it does, what it calls, and how it validates/navigates. Cross-reference: `Routing.md` for paths, `Component-Architecture.md` for the components named here, `Form-Validation.md` for full field rules.

---

## 1. Login

**Route:** `/login` (public)

- **Purpose:** Authenticate the admin user and start a session.
- **Components:** `Card`, `Input` (username, password), `Button` (submit, loading state), form via React Hook Form + Zod.
- **API used:** `POST /auth/login.php`
- **Actions:**
  - Submit → `useLogin()` mutation.
  - Success → store user in `AuthContext`, `navigate('/dashboard', { replace: true })`.
  - `401` → toast the backend's verbatim message ("Invalid username or password"); do **not** redirect (already on `/login`).
  - `422` → map `errors.username` / `errors.password` to inline field errors.
- **Validation:** See `Form-Validation.md` §Login. Username required; password required, min 6 chars client-side (backend is the real source of truth).
- **Navigation:** On success → `/dashboard`. If a guest hit a protected route first, redirect back to that original destination instead of always `/dashboard` (see `Routing.md` §ProtectedRoute).

---

## 2. Dashboard

**Route:** `/dashboard` (protected)

- **Purpose:** At-a-glance KPIs and recent activity.
- **Components:** `KpiCard` × 4 (products, categories, suppliers, stock units), a low-stock alert `Card`, `RecentActivityList`, `Skeleton` variants for all of the above.
- **API used:** `GET /dashboard/summary.php`
- **Actions:** None mutating on this page — read-only landing page. Clicking the low-stock KPI navigates to `/reports/low-stock`.
- **Validation:** N/A.
- **Navigation:** Entry point after login; sidebar links to all other sections.
- **Loading:** Skeleton KPI cards while `isLoading`; on `500`, show retry banner in place of the cards.

---

## 3. Categories

**Route:** `/inventory/categories` (protected)

- **Purpose:** CRUD for product categories.
- **Components:** `DataTable` (name, createdAt, row actions), `Button` ("Add Category"), `CategoryModal` (create/edit form), `ConfirmDialog` (delete), `EmptyState`.
- **API used:** `GET /categories/list.php`, `POST /categories/create.php`, `PUT /categories/update.php?id=`, `DELETE /categories/delete.php?id=`.
- **Actions:**
  - Add → opens `CategoryModal` in create mode → on `201`, prepend to list, close modal, toast success.
  - Edit (row action) → opens `CategoryModal` in edit mode, prefilled from the already-loaded row (no extra `get.php` call needed) → on `200`, replace row, toast.
  - Delete (row action) → `ConfirmDialog` — copy should **not** warn about blocked deletion; deleting a category un-links products (`ON DELETE SET NULL`), it never 409s here.
- **Validation:** `name` required, max 100 chars, uniqueness enforced server-side → `422` on duplicate maps to `errors.name`.
- **Navigation:** Also reachable indirectly — this list backs the category `<select>` used on the Products page/form.
- **Empty state:** "No categories yet — Add your first category" with CTA button.

---

## 4. Suppliers

**Route:** `/inventory/suppliers` (protected)

- **Purpose:** CRUD for suppliers.
- **Components:** Same pattern as Categories — `DataTable`, `SupplierModal`, `ConfirmDialog`, `EmptyState`.
- **API used:** `GET/POST/PUT/DELETE /suppliers/*.php`.
- **Actions:** Same create/edit/delete pattern as Categories.
- **Validation:** `name` required (max 150), `phone` optional (max 30), `email` optional (valid format), `address` optional (max 255). See `Form-Validation.md` §Supplier.
- **Navigation:** Also backs the supplier `<select>` on Products and Stock In forms.
- **Empty state:** "No suppliers yet — Add your first supplier."

---

## 5. Products (List)

**Route:** `/inventory/products` (protected)

- **Purpose:** Search, filter, and browse products; entry point to create/edit/stock actions. The busiest screen in the app.
- **Components:** `SearchBar` (debounced 250ms), category `Select`, supplier `Select`, low-stock toggle, `DataTable` (paginated), `Pagination`, `Button` ("Add Product"), row actions (edit, record stock in, record stock out, delete), `StockInModal`, `StockOutModal`, `ConfirmDialog`, `EmptyState`, `Skeleton` rows.
- **API used:** `GET /products/list.php` (params: `search`, `categoryId`, `supplierId`, `lowStockOnly`, `page`, `limit`), plus `DELETE /products/delete.php?id=`.
- **Actions:**
  - Filter/search changes → update URL search params → refetch (see Architecture §8).
  - "Add Product" → navigate to `/inventory/products/new`.
  - Row click / "Edit" → navigate to `/inventory/products/:id/edit`.
  - "Record Stock In" / "Record Stock Out" row actions → open respective modal without leaving the list.
  - Delete → `ConfirmDialog`; on `409` show "Cannot delete product with existing stock history" as the blocking message (this is expected, not a bug); on `404` refresh the list.
- **Validation:** N/A on this screen (filters aren't validated beyond type coercion for `lowStockOnly`/`page`/`limit`).
- **Navigation:** → `/inventory/products/new`, `/inventory/products/:id/edit`, or opens Stock In/Out modals inline.
- **Empty state:** Distinguish "no products at all" ("Add your first product") vs "no products match filters" ("Clear filters").

---

## 6. Product Form (Create / Edit)

**Route:** `/inventory/products/new`, `/inventory/products/:id/edit` (protected)

- **Purpose:** Create a new product or edit an existing one.
- **Components:** `ProductFormFields` (name, category `Select`, supplier `Select`, purchasePrice, sellingPrice, minStockLevel), `Button` (save, disabled while pending), quantity field shown **read-only** (edit mode only — new products have no quantity field at all).
- **API used:** `GET /products/get.php?id=` (edit mode, prefill), `POST /products/create.php` (create), `PUT /products/update.php?id=` (edit).
- **Actions:**
  - Create success (`201`) → navigate to `/inventory/products`, toast "Product created".
  - Edit success (`200`) → navigate back (or stay + toast, either is fine — pick one and be consistent), toast "Product updated".
  - `404` on prefill fetch → toast "Product not found", redirect to list.
  - `422` → map `errors` onto `name`, `purchasePrice`, `sellingPrice`, `categoryId`, `supplierId`.
- **Validation:** See `Form-Validation.md` §Product. `quantity` is never submitted — omit entirely from the payload (both create and edit).
- **Navigation:** Cancel → back to `/inventory/products` without saving.

---

## 7. Stock In

**Route:** `/inventory/stock-in` (protected) — list; the "record" action is a modal, not a route (also embeddable on the Products page).

- **Purpose:** View stock-in history; record new stock-in events. Records are immutable — no edit/delete.
- **Components:** `DataTable` (product, supplier, quantity, purchasePrice, note, createdAt), `Pagination`, product `Select` filter, `Button` ("Record Stock In") → `StockInModal` (product `Select`, supplier `Select` optional, quantity, purchasePrice optional, note optional).
- **API used:** `GET /stock_in/list.php` (params: `productId`, `page`, `limit`), `POST /stock_in/create.php`.
- **Actions:**
  - Record → on `201`, close modal, update the product's cached `quantity` to `response.data.newProductQuantity` (see Architecture §Optimistic UI), toast success, prepend/refetch the list.
  - `404` (`productId` stale) → toast, refresh the product dropdown options.
  - `500` → toast "Couldn't record stock in. Nothing was changed."
  - `422` → inline field errors on `productId`, `quantity`, `purchasePrice`, `note`.
- **Validation:** See `Form-Validation.md` §Stock In. `quantity` required, positive integer.
- **Navigation:** Modal can be triggered from here or from the Products list; no dedicated create _route_.
- **Empty state:** "No stock movements yet — Record a stock-in."

---

## 8. Stock Out

**Route:** `/inventory/stock-out` (protected)

- **Purpose:** View stock-out history; record sales/removals. Immutable, same pattern as Stock In.
- **Components:** Mirrors Stock In — `DataTable`, `Pagination`, product filter `Select`, `Button` → `StockOutModal` (product `Select`, quantity, sellingPrice optional, note optional).
- **API used:** `GET /stock_out/list.php`, `POST /stock_out/create.php`.
- **Actions:**
  - Record → same `newProductQuantity` cache update pattern as Stock In.
  - `409` — **"Insufficient stock: only N units available"** — expected outcome, show verbatim, do not treat as a generic error. Client-side, disable submit if typed quantity > the product's currently-known stock (soft guard only; backend is authoritative).
  - `404`, `422` → same pattern as Stock In.
- **Validation:** See `Form-Validation.md` §Stock Out.
- **Empty state:** "No stock movements yet — Record a stock-out."

---

## 9. Reports — Inventory

**Route:** `/reports/inventory` (protected)

- **Purpose:** Full inventory snapshot with stock value, optionally filtered by category.
- **Components:** category `Select` filter, `DataTable` with a totals footer row, "Export CSV" `Button` (client-side export of already-fetched `data.items`).
- **API used:** `GET /reports/inventory.php` (param: `categoryId`).
- **Actions:** Filter change → refetch. Export → generate CSV from in-memory data, no extra request.
- **Validation:** N/A.
- **Navigation:** Linked from Reports nav / sidebar section.

---

## 10. Reports — Low Stock

**Route:** `/reports/low-stock` (protected)

- **Purpose:** Products at or below `minStockLevel`; also surfaced as a Dashboard widget.
- **Components:** `DataTable` (product, quantity, minStockLevel, `shortBy` = "Order N more" column).
- **API used:** `GET /reports/low_stock.php`.
- **Actions:** Read-only.
- **Validation:** N/A.
- **Empty state:** ✅ Happy path — "All products are above their minimum stock level." Do not style this as an alarming/error empty state.

---

## 11. Reports — Stock In History

**Route:** `/reports/stock-in` (protected)

- **Purpose:** Stock-in totals over a date range.
- **Components:** Date range picker (`startDate`, `endDate`), `DataTable`, totals footer (`totalQuantityIn`, `totalCost`).
- **API used:** `GET /reports/stock_in_report.php` (params: `startDate`, `endDate`).
- **Actions:** Apply date range (either "Apply" button or 300ms debounce) → refetch.
- **Validation:** Both dates optional; if both present, `startDate <= endDate`. `422` → "startDate must be before endDate" shown near the date inputs.

---

## 12. Reports — Stock Out History

**Route:** `/reports/stock-out` (protected)

- **Purpose:** Stock-out totals over a date range.
- **Components/API/Validation:** Identical pattern to Stock In Report, using `GET /reports/stock_out_report.php`, totals (`totalQuantityOut`, `totalRevenue`).

---

## 13. 404 / Not Found

**Route:** `*` (catch-all, both public and protected contexts)

- **Purpose:** Friendly fallback for unmatched paths.
- **Components:** Simple `Card` with message + `Button` linking to `/dashboard` (if authenticated) or `/login` (if not).
- **API used:** None.
- **Validation:** N/A.
- **Navigation:** Single CTA back to a sane starting point.
