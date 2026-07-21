# Frontend API Integration Guide

## Inventory Management System — React (Vite) ↔ PHP Backend

**Audience:** React (Vite) frontend developers consuming the Inventory Management System PHP API.

**Purpose:** A practical, opinionated guide on _how to consume_ the API. It does **not** explain backend logic, internal database layout, or duplicate the full request/response schema — for that, read [`API_SPECIFICATION.md`](./API_SPECIFICATION.md). This document assumes the backend works exactly as specified.

---

## Table of Contents

1. [Overview & Setup](#1-overview--setup)
2. [Auth Lifecycle](#2-auth-lifecycle)
3. [Response Formats & Errors](#3-response-formats--errors)
4. [Endpoint Reference](#4-endpoint-reference)
5. [Frontend Architecture](#5-frontend-architecture)
6. [UI Workflow & Best Practices](#6-ui-workflow--best-practices)
7. [Appendix — Endpoint Summary](#7-appendix--endpoint-summary)

---

## 1. Overview & Setup

### 1.1 Stack at a glance

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | React + Vite, Axios (or `fetch`), React Router    |
| Backend  | Raw PHP + MySQL, JSON-only responses              |
| Auth     | PHP session cookie (HttpOnly, server-issued)      |
| Wire     | `application/json` request/response, CORS-enabled |

The backend is a _stateless-per-request_ JSON API. Every endpoint is a single PHP file under `backend/api/`. There is no central router — you hit the exact path. There is no SPA fallback; you don't need to configure React Router rewrites against the backend.

### 1.2 BASE_URL setup

All API paths in this guide are relative to a single `BASE_URL` constant. In development:

```
BASE_URL = "http://localhost/inventory-management/backend/api"
```

Centralize it in a single config file:

```js
// src/config.js
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost/inventory-management/backend/api";

export const API_TIMEOUT_MS = 15000;
```

Use a `.env` file for overrides per environment:

```env
# .env.development
VITE_API_BASE_URL=http://localhost/inventory-management/backend/api

# .env.production
VITE_API_BASE_URL=https://api.your-domain.com
```

> The base path ends in `/api` — every endpoint below is appended directly to it (e.g. `BASE_URL + "/products/list.php"`).

### 1.3 JSON everywhere

- Request bodies: `Content-Type: application/json`. Send a JSON-stringified object.
- Response bodies: always JSON. No XML, no form-encoded responses (form-encoded _requests_ via `application/x-www-form-urlencoded` are accepted on login for convenience, but JSON is preferred everywhere).
- All keys are **`camelCase`** on the wire. The DB uses `snake_case` internally — you will never see snake_case in API responses.

### 1.4 CORS

The backend is configured to allow cross-origin requests from the frontend dev server. Two rules on your side:

1. Every request must include credentials so the session cookie is sent:

   ```js
   axios.get(url, { withCredentials: true });
   fetch(url, { credentials: "include" });
   ```

2. Do not add custom headers like `X-Requested-With` unless required — the backend's CORS allow-list is intentionally narrow.

If you see a CORS error in DevTools (e.g. `Access-Control-Allow-Origin` missing), it's almost always because you forgot `withCredentials` **or** because the backend origin allow-list doesn't include your dev host. Treat backend CORS config as fixed; don't try to bypass it from the frontend.

### 1.5 Cookie-based session auth (quick primer)

- On successful `POST /auth/login.php`, the backend issues a session cookie (`PHPSESSID` by default) and sets it on your origin.
- That cookie is **HttpOnly** — your JavaScript cannot read it. That's a security feature, not a bug.
- The browser automatically attaches it to every subsequent request to the backend origin, **as long as `withCredentials: true` is set**.
- On `POST /auth/logout.php` the backend destroys the server-side session. You should also redirect to the login page immediately.

You never store auth tokens in `localStorage`. The cookie is the auth.

### 1.6 First-boot checklist

- [ ] Backend reachable at `http://localhost/inventory-management/backend/api/auth/me.php` returns `401` (this is the _expected_ response when no session exists — see §2.1).
- [ ] `VITE_API_BASE_URL` is set in `.env`.
- [ ] Axios instance with `baseURL = BASE_URL` and `withCredentials: true` is created once and imported everywhere (see §6.1).
- [ ] Toast / notification system wired (e.g. `react-hot-toast`, `sonner`).
- [ ] Router with `<ProtectedRoute>` guarding authenticated pages (see §6.2).

---

## 2. Auth Lifecycle

### 2.1 App load — decide Login vs Dashboard

On every app load (including refresh), call `GET /auth/me.php` _first_. This is the single source of truth for "is the user logged in?"

```js
// src/auth/AuthBootstrap.jsx
import { useEffect, useState } from "react";
import api from "@/api/client";
import { Navigate } from "react-router-dom";

export function AuthBootstrap({ children }) {
  const [state, setState] = useState("loading");

  useEffect(() => {
    api
      .get("/auth/me.php")
      .then(() => setState("authed"))
      .catch((err) => {
        // 401 is expected for unauthenticated visitors — it's not an error.
        setState(err.response?.status === 401 ? "guest" : "error");
      });
  }, []);

  if (state === "loading") return <FullPageSpinner />;
  if (state === "error") return <FullPageError />;
  if (state === "guest") return <Navigate to="/login" replace />;
  return children;
}
```

> **Why `/auth/me.php` and not localStorage?** The cookie is HttpOnly and unreadable from JS. There is no client-side token to check — the _server_ must tell you. This is also why refresh "just works": the browser keeps the cookie.

### 2.2 Login flow

```jsx
// pages/Login.jsx (excerpt)
const onSubmit = async (values) => {
  try {
    const { data } = await api.post("/auth/login.php", values);
    toast.success(data.message); // "Login successful"
    setAuthUser(data.data); // { id, username }
    navigate("/dashboard", { replace: true });
  } catch (err) {
    if (err.response?.status === 401) {
      // Generic "Invalid username or password" — show as-is
      toast.error(err.response.data.message);
    } else if (err.response?.status === 422) {
      // Field-level validation errors from backend
      setFieldErrors(err.response.data.errors);
    } else {
      toast.error("Login failed. Please try again.");
    }
  }
};
```

**What happens on success:**

1. Backend sets `PHPSESSID` cookie (HttpOnly).
2. Response body: `{ success: true, data: { id, username }, message: "Login successful" }`.
3. You store `data.data` in a global auth context (or `zustand`/`redux`) — **just the user object, never the cookie**.
4. Navigate to `/dashboard`.

**What happens on bad credentials (`401`):**

- Backend returns the _generic_ message `"Invalid username or password"` whether the username is unknown or the password is wrong. Do **not** try to differentiate. Show the message verbatim.

**What happens on validation (`422`):**

- `errors` is an object keyed by field name. Map each key to the corresponding input.

### 2.3 Authenticated requests

Every request after login automatically carries the session cookie because:

1. The Axios instance has `withCredentials: true` set globally.
2. The browser stores the cookie on your origin.
3. You do nothing else.

Don't manually attach headers, don't read the cookie, don't put anything in `Authorization`. If a request comes back `401`, the session is gone — handle it (see §2.5).

### 2.4 Session expiration

The backend does **not** expose token refresh. When the session ends (timeout, manual logout, server restart), every authenticated endpoint will respond `401` with `"message": "Unauthorized"`.

There is exactly one trigger to handle globally: a `401` from any non-login endpoint.

```js
// api/client.js — response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isOnLoginPage()) {
      // Clear any local auth state and bounce to login.
      authStore.getState().clear();
      toast.error("Your session expired. Please log in again.");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  },
);
```

Key points:

- Do not retry the request that 401'd. The session is gone — there's nothing to retry against.
- Skip the redirect on the login page itself (a 401 _there_ just means "wrong password").
- Clearing in-memory auth state prevents stale UI.

### 2.5 Logout

```js
const onLogout = async () => {
  try {
    await api.post("/auth/logout.php");
    toast.success("Logged out");
  } catch {
    // Even if the call fails (e.g. session already expired), still clear local state.
  } finally {
    authStore.getState().clear();
    navigate("/login", { replace: true });
  }
};
```

There's no request body. The response is `{ success: true, data: null, message: "Logged out successfully" }`. The cookie remains in the browser but is now invalid server-side, so the next request to a protected endpoint will `401` — exactly what we want.

---

## 3. Response Formats & Errors

### 3.1 The envelope — every endpoint returns this

```json
{
  "success": true,
  "data": { ... } | [ ... ] | null,
  "message": "human-readable string",
  "errors": null | { "fieldName": "human-readable string" }
}
```

| Field     | Meaning                                                               |
| --------- | --------------------------------------------------------------------- |
| `success` | `true` if HTTP status is 2xx, `false` otherwise                       |
| `data`    | Payload (object, array, or `null`)                                    |
| `message` | Always present, always a string                                       |
| `errors`  | `null` for non-validation errors; object of `{field: message}` on 422 |

> ⚠️ Always check `success` first, **then** `data`. Don't blindly trust HTTP status alone — the backend uses a few non-obvious codes (e.g. `200` on `POST /auth/login.php`, `201` on creates, `409` for business-rule conflicts).

### 3.2 Status code cheatsheet

| Status | When                                                                   | What to do                                                                             |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `200`  | Successful GET / PUT / DELETE / login                                  | Use `data`                                                                             |
| `201`  | Successful POST (resource created)                                     | Use `data` (often contains the new resource + `newProductQuantity`)                    |
| `400`  | Malformed request body (e.g. invalid JSON)                             | Show generic error toast, log to console                                               |
| `401`  | No / expired session                                                   | Global interceptor → redirect to login (unless on `/login`)                            |
| `404`  | Resource ID doesn't exist                                              | Show `message` ("Product not found"), usually as inline form error or list empty-state |
| `405`  | Wrong HTTP verb                                                        | You miscoded the call — fix the client; surface a dev-only warning                     |
| `409`  | Business-rule violation (e.g. insufficient stock, product has history) | Show `message` as a user-facing error — _this is a normal, expected outcome_           |
| `422`  | Validation failed                                                      | Map `errors[fieldName]` onto form inputs                                               |
| `500`  | Unexpected / DB error                                                  | Generic toast ("Something went wrong"), retry button, log to error tracker             |

### 3.3 Two flavors of error: field-level vs message-level

**Field-level (`422` validation):**

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": {
    "name": "name is required",
    "purchasePrice": "purchasePrice must be numeric"
  }
}
```

→ Loop over `errors` and assign to your form state:

```js
const errs = err.response.data.errors ?? {};
setFieldErrors({
  name: errs.name,
  purchasePrice: errs.purchasePrice,
});
```

**Message-level (everything else):**

```json
{
  "success": false,
  "data": null,
  "message": "Insufficient stock: only 4 units available",
  "errors": null
}
```

→ Show `err.response.data.message` to the user via toast or inline banner.

### 3.4 Network errors

A network error (DNS failure, server down, CORS preflight fail, offline) produces an Axios error **without** `err.response`. Always handle this branch:

```js
if (!err.response) {
  toast.error("Network error — check your connection");
  return;
}
// else: err.response.status / .data is safe to read
```

### 3.5 Pagination shape

For paginated endpoints (`/products/list.php`, `/stock_in/list.php`, `/stock_out/list.php`):

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 }
  }
}
```

> ⚠️ `data` is **not** an array for paginated endpoints — it's `{ items, pagination }`. Categories and suppliers lists, by contrast, _are_ plain arrays under `data` (they're unpaginated). Code defensively based on the endpoint.

---

## 4. Endpoint Reference

> Every snippet below assumes `import api from "@/api/client"` where `api` is the configured Axios instance (see §6.1). Method paths are appended to `BASE_URL`.

---

### 4.1 Authentication

#### `POST /auth/login.php` — **Auth: No**

| Aspect  | Detail                                                                          |
| ------- | ------------------------------------------------------------------------------- |
| Body    | `{ username: string, password: string }` — both required                        |
| Success | `200` — `data = { id, username }`, cookie set by browser                        |
| Errors  | `422` (missing fields) → use `errors`. `401` (bad credentials) → use `message`. |

```js
const { data } = await api.post("/auth/login.php", { username, password });
```

**React usage:** Login page form. On success: store user, navigate to dashboard. On `401`: toast with `message`. On `422`: map `errors` to fields.

**Loading state:** Disable the submit button and show inline spinner.
**UI action:** On `401` do **not** redirect — the user is already on the login page.

---

#### `POST /auth/logout.php` — **Auth: Yes**

| Aspect  | Detail                                                              |
| ------- | ------------------------------------------------------------------- |
| Body    | none                                                                |
| Success | `200` — `data = null`, session destroyed server-side                |
| Errors  | `401` — session already gone (treat as success — clear local state) |

```js
await api.post("/auth/logout.php");
```

**React usage:** "Logout" button in topbar / sidebar. Wrap in `try/catch` and _always_ clear local auth state in `finally`.

**Loading state:** Show button spinner.
**UI action:** Navigate to `/login` after.

---

#### `GET /auth/me.php` — **Auth: Yes**

| Aspect  | Detail                                             |
| ------- | -------------------------------------------------- |
| Body    | none                                               |
| Success | `200` — `data = { id, username }`                  |
| Errors  | `401` — **expected** when no session; not an error |

```js
const { data } = await api.get("/auth/me.php");
```

**React usage:** Called once on app boot (see §2.1) inside `AuthBootstrap`. Do _not_ call repeatedly — it has no use other than session check.

---

### 4.2 Dashboard

#### `GET /dashboard/summary.php` — **Auth: Yes**

| Aspect  | Detail                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Params  | none                                                                                                                       |
| Success | `200` — `data = { totalProducts, totalCategories, totalSuppliers, totalStockUnits, lowStockCount, recentActivity: [...] }` |
| Errors  | `401`, `500`                                                                                                               |

```js
const { data: summary } = await api.get("/dashboard/summary.php");
```

**React usage:** Dashboard page (`/dashboard`). Render four KPI cards from the totals and a small "Recent Activity" feed.

**Loading state:** Skeleton cards while fetching.
**UI action:** None on success; on `500` show a retry banner.

---

### 4.3 Categories

Base path: `/categories`

#### `GET /categories/list.php` — **Auth: Yes**

```js
const { data: categories } = await api.get("/categories/list.php");
// categories is an array of { id, name, createdAt }
```

**React usage:** `useCategories()` hook (see §5.3). Used in the Categories management page, and to populate the `<select>` for category filter on the Products page.

**Loading state:** Spinner inside the table area.
**UI action:** None on empty list — render an "Add your first category" empty-state with a CTA.

#### `GET /categories/get.php?id={id}` — **Auth: Yes**

```js
const { data: category } = await api.get("/categories/get.php", {
  params: { id },
});
```

**React usage:** Edit form prefilling. Often skipped in favor of finding the category in the already-loaded list.

**UI action:** `404` → "Category not found", redirect back to list.

#### `POST /categories/create.php` — **Auth: Yes**

```js
const { data } = await api.post("/categories/create.php", { name });
// data = { id, name, createdAt }
```

**React usage:** Categories "Add" modal.

**Loading state:** Disable Save button.
**UI action:** `201` → close modal, prepend new category to local list, toast success. `422` → map `errors.name` to input.

#### `PUT /categories/update.php?id={id}` — **Auth: Yes**

```js
await api.put(`/categories/update.php?id=${id}`, { name });
```

**React usage:** Categories "Edit" modal.

**UI action:** `200` → replace row in list, toast success. `404` → "Category not found", refresh list. `422` → field errors.

#### `DELETE /categories/delete.php?id={id}` — **Auth: Yes**

```js
await api.delete(`/categories/delete.php?id=${id}`);
```

**UI action:** `200` → remove row, toast. **No `409` case here** — deleting a category does not fail if products reference it (the FK is `ON DELETE SET NULL`, so products become uncategorized). Reflect that in the UI copy — don't say "this will be blocked by products".

---

### 4.4 Suppliers

Base path: `/suppliers` — five endpoints, same pattern as Categories.

Fields: `name` (required, max 150), `phone` (optional, max 30), `email` (optional, valid format), `address` (optional, max 255).

#### `GET /suppliers/list.php` — **Auth: Yes**

```js
const { data: suppliers } = await api.get("/suppliers/list.php");
```

**React usage:** `useSuppliers()` hook. Used in Suppliers page and as a `<select>` for product/stock-in filters.

#### `GET /suppliers/get.php?id={id}` — **Auth: Yes**

```js
const { data: supplier } = await api.get("/suppliers/get.php", {
  params: { id },
});
```

#### `POST /suppliers/create.php` — **Auth: Yes**

```js
await api.post("/suppliers/create.php", { name, phone, email, address });
```

**UI action:** `422` → `errors.email` may say "must be a valid email" — surface on the email field.

#### `PUT /suppliers/update.php?id={id}` — **Auth: Yes**

```js
await api.put(`/suppliers/update.php?id=${id}`, patch);
```

#### `DELETE /suppliers/delete.php?id={id}` — **Auth: Yes**

```js
await api.delete(`/suppliers/delete.php?id=${id}`);
```

**UI action:** Same `SET NULL` rule as categories — deleting a supplier un-links it from products and stock-in history, doesn't fail. Reflect in your UI.

---

### 4.5 Products

Base path: `/products`

#### `GET /products/list.php` — **Auth: Yes**

| Param          | Type    | Default | Notes                                              |
| -------------- | ------- | ------- | -------------------------------------------------- |
| `search`       | string  | —       | `LIKE` against product name                        |
| `categoryId`   | int     | —       | Filter by category                                 |
| `supplierId`   | int     | —       | Filter by supplier                                 |
| `lowStockOnly` | boolean | `false` | Send `"true"` / `"false"` as strings, or use `0/1` |
| `page`         | int     | `1`     |                                                    |
| `limit`        | int     | `20`    | max `100`                                          |

```js
const { data } = await api.get("/products/list.php", {
  params: { search, categoryId, supplierId, lowStockOnly, page, limit },
});
// data = { items: [...], pagination: { page, limit, total, totalPages } }
```

**React usage:** `useProducts(filters)` hook. The Products page is the busiest: search box, category filter, supplier filter, low-stock toggle, paginated table.

**Loading state:** Skeleton rows on table.
**UI action:** Debounce the search input (250ms, see §6.5). Render `data.pagination.totalPages` page buttons.

#### `GET /products/get.php?id={id}` — **Auth: Yes**

```js
const { data: product } = await api.get("/products/get.php", {
  params: { id },
});
```

**React usage:** Product edit page (`/products/:id/edit`).

**UI action:** `404` → redirect to list with toast.

#### `POST /products/create.php` — **Auth: Yes**

```js
await api.post("/products/create.php", {
  name,
  categoryId,
  supplierId,
  purchasePrice,
  sellingPrice,
  minStockLevel, // optional, defaults to 5 server-side
});
```

> ⚠️ `quantity` is **not** accepted here. New products start at `0`; use `/stock_in/create.php` to add stock. Disable the quantity input on the create form.

**UI action:** `201` → navigate to list, toast "Product created". `422` → map `errors` (`name`, `purchasePrice`, `sellingPrice`, `categoryId`, `supplierId`).

#### `PUT /products/update.php?id={id}` — **Auth: Yes**

```js
await api.put(`/products/update.php?id=${id}`, patch);
// patch may contain any subset of { name, categoryId, supplierId, purchasePrice, sellingPrice, minStockLevel }
```

**UI action:** Same as create for validation errors. `quantity` remains non-editable.

#### `DELETE /products/delete.php?id={id}` — **Auth: Yes**

```js
await api.delete(`/products/delete.php?id=${id}`);
```

**UI action:** Two error paths to design for:

- `404` → "Product not found", refresh list.
- `409` → "Cannot delete product with existing stock history" — **this is a normal business outcome**, not an error. Show as a confirmation-blocking message.

---

### 4.6 Stock In

Base path: `/stock_in`. Stock-in records are **immutable** — there is no update or delete endpoint. A wrong entry is corrected by recording a compensating stock-out.

#### `GET /stock_in/list.php` — **Auth: Yes**

| Param            | Type | Notes                        |
| ---------------- | ---- | ---------------------------- |
| `productId`      | int  | optional filter              |
| `page` / `limit` | int  | pagination, same as products |

```js
const { data } = await api.get("/stock_in/list.php", {
  params: { productId, page, limit },
});
// data = { items: [...], pagination: {...} }
```

**React usage:** Stock history page (under Inventory). Item shape includes `productName`, `supplierName`, `quantity`, `purchasePrice`, `note`, `createdAt`.

**Loading state:** Table skeleton.

#### `POST /stock_in/create.php` — **Auth: Yes**

```js
await api.post("/stock_in/create.php", {
  productId,
  supplierId, // optional
  quantity, // positive integer
  purchasePrice, // optional, numeric >= 0
  note, // optional, max 255 chars
});
// Success data: { id, productId, quantity, newProductQuantity, createdAt }
```

> Use `newProductQuantity` from the response to update the product's displayed stock _without_ a second request.

**React usage:** "Record Stock In" modal. Often a dropdown of products + quantity + price + supplier + note.

**Loading state:** Disable Save.
**UI action:**

- `201` → close modal, **update the product's `quantity` field in any cached list to `newProductQuantity`**, toast success.
- `404` → `productId` doesn't exist — usually means the product was deleted while the modal was open; refresh the product dropdown.
- `500` → "Couldn't record stock in. Nothing was changed." (the transaction was rolled back — reassure the user).
- `422` → field errors on `productId`, `quantity`, `purchasePrice`, `note`.

---

### 4.7 Stock Out

Base path: `/stock_out`. Same immutability rule as stock-in.

#### `GET /stock_out/list.php` — **Auth: Yes**

Same params and shape as stock-in list.

```js
const { data } = await api.get("/stock_out/list.php", {
  params: { productId, page, limit },
});
```

#### `POST /stock_out/create.php` — **Auth: Yes**

```js
await api.post("/stock_out/create.php", {
  productId,
  quantity, // positive integer
  sellingPrice, // optional, numeric >= 0
  note, // optional, max 255 chars
});
```

**UI action:**

- `201` → close modal, update displayed `quantity` to `data.newProductQuantity`, toast.
- `404` → product doesn't exist.
- **`409` → "Insufficient stock: only N units available"** — **expected**. Show this directly to the user. Disable the submit button if the typed quantity exceeds the product's current stock (client-side prevention, server-side is the source of truth).
- `422` → field errors on `productId` / `quantity`.

---

### 4.8 Reports

Base path: `/reports`. All `GET`, all **Auth: Yes**. Return pre-shaped display data — no client-side math required.

#### `GET /reports/inventory.php`

| Param        | Type | Notes           |
| ------------ | ---- | --------------- |
| `categoryId` | int  | optional filter |

```js
const { data } = await api.get("/reports/inventory.php", {
  params: { categoryId },
});
// data = { items: [{ productId, productName, category, supplier, quantity, purchasePrice, sellingPrice, stockValue }], totals: { totalQuantity, totalStockValue } }
```

**React usage:** Reports → Inventory page. Render table + a totals footer. Optionally an "Export CSV" button that runs entirely on the data you already have.

#### `GET /reports/low_stock.php`

```js
const { data } = await api.get("/reports/low_stock.php");
// data is an array of { productId, productName, quantity, minStockLevel, shortBy }
```

**React usage:** Reports → Low Stock page, and as a "needs attention" widget on the Dashboard. `shortBy` is `minStockLevel - quantity` — use it for the "Order X more" hint column.

#### `GET /reports/stock_in_report.php`

| Param       | Type         | Notes                            |
| ----------- | ------------ | -------------------------------- |
| `startDate` | `YYYY-MM-DD` | optional                         |
| `endDate`   | `YYYY-MM-DD` | optional, must be `>= startDate` |

```js
const { data } = await api.get("/reports/stock_in_report.php", {
  params: { startDate, endDate },
});
// data = { items: [...], totals: { totalQuantityIn, totalCost } }
```

**React usage:** Reports → Stock In History. Date-range picker → debounce (or "Apply" button) → refetch.

**UI action:** `422` on bad dates → "startDate must be before endDate".

#### `GET /reports/stock_out_report.php`

Same params/validation as stock-in report.

```js
const { data } = await api.get("/reports/stock_out_report.php", {
  params: { startDate, endDate },
});
// data = { items: [...], totals: { totalQuantityOut, totalRevenue } }
```

---

## 5. Frontend Architecture

### 5.1 Recommended folder structure

```
src/
├── api/
│   ├── client.js                 # Axios instance + interceptors
│   ├── auth.js                   # login, logout, me
│   ├── categories.js             # list, get, create, update, delete
│   ├── suppliers.js
│   ├── products.js
│   ├── stockIn.js
│   ├── stockOut.js
│   ├── dashboard.js
│   └── reports.js
│
├── auth/
│   ├── AuthContext.jsx           # global auth store (user object, not token)
│   ├── AuthBootstrap.jsx         # calls /auth/me.php on app boot
│   └── ProtectedRoute.jsx        # redirects guests to /login
│
├── hooks/
│   ├── useCategories.js
│   ├── useSuppliers.js
│   ├── useProducts.js
│   ├── useStockIn.js
│   ├── useStockOut.js
│   ├── useDashboard.js
│   └── useDebounce.js
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
│   └── reports/
│       ├── InventoryReport.jsx
│       ├── LowStockReport.jsx
│       ├── StockInReport.jsx
│       └── StockOutReport.jsx
│
├── components/
│   ├── ui/                       # Button, Input, Modal, Table, Toast...
│   └── layout/                   # Sidebar, Topbar, ProtectedShell
│
├── lib/
│   ├── validators.js             # shared frontend validation rules
│   └── format.js                 # currency, date, qty formatters
│
├── config.js                     # BASE_URL
├── App.jsx
└── main.jsx
```

The `api/` folder is **thin wrappers around endpoints** — one file per resource, one function per endpoint, returning `{ data }`. Components never call `axios` directly. This gives you one place to change a path or unwrap an envelope.

```js
// api/categories.js
import api from "./client";

export const listCategories = () =>
  api.get("/categories/list.php").then((r) => r.data.data);

export const getCategory = (id) =>
  api.get("/categories/get.php", { params: { id } }).then((r) => r.data.data);

export const createCategory = (payload) =>
  api.post("/categories/create.php", payload).then((r) => r.data);

export const updateCategory = (id, payload) =>
  api.put(`/categories/update.php?id=${id}`, payload).then((r) => r.data);

export const deleteCategory = (id) =>
  api.delete(`/categories/delete.php?id=${id}`).then((r) => r.data);
```

### 5.2 Global vs local state

| State                                     | Where                                                   |
| ----------------------------------------- | ------------------------------------------------------- |
| Current logged-in user                    | **Global** — `AuthContext`/`zustand`                    |
| Toast notifications                       | **Global** — `Toaster` (e.g. `sonner`)                  |
| Sidebar collapsed, theme, locale          | **Global** (or persisted localStorage)                  |
| A list of products, categories, suppliers | **Local** per page (via custom hooks)                   |
| Form values, modal open state, table sort | **Local** component state                               |
| Filter params for a list page             | **Local** + URL search params (so the URL is shareable) |

Rule of thumb: if more than two unrelated components need to read it, lift it to global. Otherwise keep it local — global state is the most common source of React perf issues.

### 5.3 Custom hooks

Custom hooks wrap the API layer, own loading/error/data state, and optionally own caching for read-mostly resources.

```js
// hooks/useCategories.js
import { useEffect, useState } from "react";
import { listCategories } from "@/api/categories";

export function useCategories() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const items = await listCategories();
      setData(items);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { data, loading, error, reload };
}
```

For paginated lists, the hook also owns `page` and `limit` state:

```js
// hooks/useProducts.js (sketch)
export function useProducts(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({
    items: [],
    pagination: { page: 1, totalPages: 0, total: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProducts({ ...filters, page, limit });
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    limit,
    reload,
  };
}
```

Hooks you typically want:
`useAuth`, `useCategories`, `useSuppliers`, `useProducts`, `useStockIn`, `useStockOut`, `useDashboard`, `useDebounce`, `useToast` (or just import `toast` directly from `sonner`/`react-hot-toast`).

### 5.4 Form validation mapping

Use a single source of truth for each field's rule, applied on the frontend _and_ re-mapped from backend errors.

| Field                           | Backend rule (from API_SPEC)                 | Frontend rule                                   | Error message to display                                              |
| ------------------------------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `username` (login)              | required, string                             | required, non-empty                             | "Username is required"                                                |
| `password` (login)              | required, string                             | required, min 6 chars                           | "Password is required"                                                |
| `name` (category)               | required, max 100, unique (case-insensitive) | required, max 100; uniqueness checked by server | "name is required" / "name already exists"                            |
| `name` (supplier)               | required, max 150                            | required, max 150                               | "name is required"                                                    |
| `email`                         | optional, valid format                       | optional, must match email regex if provided    | "email must be a valid email"                                         |
| `phone`                         | optional, max 30                             | optional, max 30                                | "phone must be at most 30 chars"                                      |
| `address`                       | optional, max 255                            | optional, max 255                               | "address must be at most 255 chars"                                   |
| `name` (product)                | required, max 150                            | required, max 150                               | "name is required"                                                    |
| `purchasePrice`                 | required, numeric, ≥ 0                       | required, number ≥ 0                            | "purchasePrice must be numeric"                                       |
| `sellingPrice`                  | required, numeric, ≥ 0                       | required, number ≥ 0                            | "sellingPrice must be numeric"                                        |
| `minStockLevel`                 | optional, positive integer                   | optional, integer ≥ 0                           | "minStockLevel must be a positive integer"                            |
| `quantity` (stock-in/out)       | required, positive integer                   | required, integer > 0                           | "quantity is required"                                                |
| `note`                          | optional, max 255                            | optional, max 255                               | "note must be at most 255 chars"                                      |
| `startDate`/`endDate` (reports) | valid `YYYY-MM-DD`, `startDate <= endDate`   | date regex + `startDate <= endDate`             | "startDate must be a valid date" / "startDate must be before endDate" |

**Mapping pattern:**

```js
const FIELD_LABEL = {
  name: "Name",
  purchasePrice: "Purchase price",
  sellingPrice: "Selling price",
  email: "Email",
};

// Convert backend's snake-cased-ish messages (still camelCase keys) to friendly form errors.
export function mapApiErrors(errors) {
  if (!errors) return {};
  return Object.fromEntries(
    Object.entries(errors).map(([k, v]) => [k, prettify(k, v)]),
  );
}

function prettify(field, raw) {
  // Backend says: "purchasePrice must be numeric"
  // We display: "Purchase price must be a number"
  if (raw.endsWith("is required"))
    return `${FIELD_LABEL[field] ?? field} is required`;
  if (raw.endsWith("must be numeric"))
    return `${FIELD_LABEL[field] ?? field} must be a number`;
  return raw; // fall back to the backend message verbatim — it's already user-safe
}
```

> Show backend messages verbatim when you're unsure — they're already written for end-users. Only prettify when the wording is awkward (e.g. raw field name leakage).

---

## 6. UI Workflow & Best Practices

### 6.1 App flow

```
Login ──POST /auth/login.php──► Dashboard ──► Inventory ──► Reports
                                       \           \            \
                                        \           \─ Categories \
                                         \          └─ Suppliers   └─ Low Stock
                                          └─ Products              └─ Stock In/Out
                                              Stock In / Stock Out   History
```

A typical user session:

1. **Login** — submit credentials. On success → `Dashboard`.
2. **Dashboard** — KPI cards (totals + low-stock count) + recent activity feed.
3. **Inventory ▸ Products** — search, filter, paginate. Click "Add Product" → modal. Click row → edit page. From a product page, "Record Stock In" / "Record Stock Out".
4. **Inventory ▸ Categories / Suppliers** — CRUD via modals.
5. **Reports** — date-range pickers, tables with totals.
6. **Logout** — top-right button. Always clears local state.

### 6.2 Axios client (single source of truth)

```js
// api/client.js
import axios from "axios";
import { BASE_URL } from "@/config";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ← required for the session cookie
  timeout: 15000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// Response interceptor — unwrap envelope, handle 401 globally.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;

    if (!err.response) {
      // Network / CORS / offline — never reached the server.
      // eslint-disable-next-line no-console
      console.error("[api] network error", err);
    } else if (status === 401) {
      const onLogin = window.location.pathname.startsWith("/login");
      if (!onLogin) {
        // Session expired — wipe local state and bounce.
        // (Use whichever auth store you're using.)
        useAuthStore.getState().clear();
        window.location.assign("/login");
      }
    }
    return Promise.reject(err);
  },
);

export default api;
```

`withCredentials: true` is the most important line in this file. Without it, the session cookie is silently dropped and every request 401s.

### 6.3 ProtectedRoute + AuthBootstrap

```jsx
// auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

Wrap `<AuthBootstrap>` around the _router_, and `<ProtectedRoute>` around every authenticated route:

```jsx
// App.jsx
<AuthBootstrap>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedShell />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory/products" element={<ProductsList />} />
      <Route path="/inventory/categories" element={<CategoriesList />} />
      <Route path="/inventory/suppliers" element={<SuppliersList />} />
      <Route path="/inventory/stock-in" element={<StockInList />} />
      <Route path="/inventory/stock-out" element={<StockOutList />} />
      <Route path="/reports/*" element={<Reports />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
</AuthBootstrap>
```

### 6.4 Toast notifications

Use one library consistently (`sonner`, `react-hot-toast`, etc.) and a single mapping from response → toast:

| Outcome            | Toast                                                      |
| ------------------ | ---------------------------------------------------------- |
| Create success     | `toast.success(res.message)`                               |
| Update success     | `toast.success(res.message)`                               |
| Delete success     | `toast.success(res.message)`                               |
| Login success      | `toast.success(res.message); navigate("/dashboard")`       |
| Validation fail    | (handled inline on form, **don't toast** the field errors) |
| 401 (on non-login) | Interceptor handles redirect — _no toast_ or one warning   |
| 409                | `toast.error(err.response.data.message)` — show verbatim   |
| 500                | `toast.error("Something went wrong. Please try again.")`   |
| Network error      | `toast.error("Network error — check your connection")`     |

### 6.5 Debouncing

Debounce any input that triggers an API call as the user types:

- Product list **search** box — 250ms.
- Category / supplier **filter dropdowns** — no debounce needed (discrete events).
- Report **date pickers** — either "Apply" button or 300ms debounce.

```js
// hooks/useDebounce.js
import { useEffect, useState } from "react";

export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

### 6.6 Optimistic UI for stock-in/stock-out

When the user records a stock-in or stock-out, the response includes `newProductQuantity`. Use it to update any cached product list _immediately_, without a refetch:

```js
const res = await createStockIn(payload);
toast.success(res.message);
// Update local cache so the products table reflects the new quantity.
productsStore
  .getState()
  .bumpQuantity(payload.productId, res.data.newProductQuantity);
```

### 6.7 Common integration mistakes

| Mistake                                                                              | Fix                                                                                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Forgot `withCredentials: true` — every request 401s                                  | Set it once on the Axios instance (see §6.2)                                        |
| Tried to read the session cookie from JS (`document.cookie`)                         | Don't — it's HttpOnly by design. Use `/auth/me.php`                                 |
| Storing the JWT in `localStorage` — there's no JWT; there is only a session cookie   | Store the _user object_ in memory, not the cookie                                   |
| Redirecting to `/login` on every 401, including from the login page itself           | Skip the redirect when already on `/login`                                          |
| Treating `409` "Insufficient stock" as an unexpected error and toast-ing generically | Show the backend's `message` verbatim — it's an expected business outcome           |
| Assuming `data` is always an array                                                   | Check the endpoint: paginated resources return `{ items, pagination }`              |
| Sending `quantity` on `POST /products/create.php` and getting `422`                  | `quantity` is server-managed; omit it from the create/update payload                |
| Trying to update or delete a stock-in / stock-out record                             | There is no such endpoint — records are immutable; correct via a compensating entry |
| Retrying the request that 401'd                                                      | Don't — the session is gone, the server has no way to "refresh"                     |
| Not handling the network-error branch (`!err.response`)                              | Always handle it explicitly — see §3.4                                              |
| Calling `/auth/me.php` on every render / in a tight loop                             | Call it **once** on app boot                                                        |
| Custom `Content-Type` headers (e.g. `application/x-www-form-urlencoded`) on POSTs    | Use `application/json` and JSON-stringify the body                                  |
| Pre-validating on the frontend with _different_ rules than the backend               | Keep the rules in sync (see §5.4) — frontend is UX, backend is truth                |

### 6.8 Loading states — pick one per surface

| Surface                | Loading UI                                          |
| ---------------------- | --------------------------------------------------- |
| Full page first-paint  | Centered spinner                                    |
| Table / list           | Skeleton rows (5–8 placeholders)                    |
| Button submit          | Inline spinner inside button, button disabled       |
| Modal form             | Spinner replaces Save button label, inputs disabled |
| KPI cards on dashboard | Skeleton blocks                                     |
| Background refetch     | Subtle top progress bar — **don't replace the UI**  |

Never block the whole page on a background refetch. Keep the previous data visible and show a small "refreshing" indicator if it takes longer than ~300ms.

### 6.9 Empty states

Every list endpoint can legitimately return zero rows. Design for it:

- Categories list: "No categories yet — Add your first category" with CTA.
- Products list (filtered): "No products match your filters — Clear filters".
- Stock-in / stock-out list: "No stock movements yet — Record a stock-in".
- Low stock report: ✅ _This is the happy path_ — "All products are above their minimum stock level." (Don't show an alarming empty state here.)

---

## 7. Appendix — Endpoint Summary

| Module     | Method | URL                              | Auth | Used on page(s)                                | Purpose                                  |
| ---------- | ------ | -------------------------------- | ---- | ---------------------------------------------- | ---------------------------------------- |
| Auth       | POST   | `/auth/login.php`                | No   | `/login`                                       | Authenticate admin, start session        |
| Auth       | POST   | `/auth/logout.php`               | Yes  | Topbar / Sidebar                               | Destroy current session                  |
| Auth       | GET    | `/auth/me.php`                   | Yes  | App boot (`AuthBootstrap`)                     | Check if session is active, return user  |
| Dashboard  | GET    | `/dashboard/summary.php`         | Yes  | `/dashboard`                                   | KPI totals + recent activity             |
| Categories | GET    | `/categories/list.php`           | Yes  | `/inventory/categories`, product form dropdown | List all categories                      |
| Categories | GET    | `/categories/get.php?id={id}`    | Yes  | Edit modal                                     | Get a single category                    |
| Categories | POST   | `/categories/create.php`         | Yes  | Add modal                                      | Create a new category                    |
| Categories | PUT    | `/categories/update.php?id={id}` | Yes  | Edit modal                                     | Update an existing category              |
| Categories | DELETE | `/categories/delete.php?id={id}` | Yes  | List row action                                | Delete a category (cascades to NULL)     |
| Suppliers  | GET    | `/suppliers/list.php`            | Yes  | `/inventory/suppliers`, product form dropdown  | List all suppliers                       |
| Suppliers  | GET    | `/suppliers/get.php?id={id}`     | Yes  | Edit modal                                     | Get a single supplier                    |
| Suppliers  | POST   | `/suppliers/create.php`          | Yes  | Add modal                                      | Create a new supplier                    |
| Suppliers  | PUT    | `/suppliers/update.php?id={id}`  | Yes  | Edit modal                                     | Update an existing supplier              |
| Suppliers  | DELETE | `/suppliers/delete.php?id={id}`  | Yes  | List row action                                | Delete a supplier (cascades to NULL)     |
| Products   | GET    | `/products/list.php`             | Yes  | `/inventory/products`                          | Searchable, filterable, paginated list   |
| Products   | GET    | `/products/get.php?id={id}`      | Yes  | Product edit page                              | Get a single product                     |
| Products   | POST   | `/products/create.php`           | Yes  | Add modal                                      | Create a new product (quantity = 0)      |
| Products   | PUT    | `/products/update.php?id={id}`   | Yes  | Edit form                                      | Update an existing product               |
| Products   | DELETE | `/products/delete.php?id={id}`   | Yes  | List row action                                | Delete product (409 if has history)      |
| Stock In   | GET    | `/stock_in/list.php`             | Yes  | `/inventory/stock-in`                          | Paginated stock-in history               |
| Stock In   | POST   | `/stock_in/create.php`           | Yes  | "Record stock in" modal                        | Record a stock purchase, increase qty    |
| Stock Out  | GET    | `/stock_out/list.php`            | Yes  | `/inventory/stock-out`                         | Paginated stock-out history              |
| Stock Out  | POST   | `/stock_out/create.php`          | Yes  | "Record stock out" modal                       | Record a sale, decrease qty (409 if low) |
| Reports    | GET    | `/reports/inventory.php`         | Yes  | `/reports/inventory`                           | Full inventory snapshot with totals      |
| Reports    | GET    | `/reports/low_stock.php`         | Yes  | `/reports/low-stock`                           | Products at/below minimum stock          |
| Reports    | GET    | `/reports/stock_in_report.php`   | Yes  | `/reports/stock-in`                            | Stock-in history with totals (by date)   |
| Reports    | GET    | `/reports/stock_out_report.php`  | Yes  | `/reports/stock-out`                           | Stock-out history with totals (by date)  |

---

**See also:**

- [`API_SPECIFICATION.md`](./API_SPECIFICATION.md) — Full request/response schemas and validation rules.
- [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) — Backend implementation details (CORS config, session handling, service layer).
- [`Business_Logic_Specification.md`](./Business_Logic_Specification.md) — The why behind business rules like immutability of stock records.
