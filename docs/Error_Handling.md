# Error Handling

Single reference for how every response outcome is handled, and **where** (globally in the Axios interceptor vs. locally at the call site). Source of truth for status codes: API guide §3.2.

---

## 1. Handling matrix

| Status / Case                                                | Where handled                  | Behavior                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200` / `201`                                                | Call site (`queries/` hook)    | Use `data`; mutation's `onSuccess` invalidates relevant Query keys (see `State-Management.md`) and toasts `message`                                                  |
| `400`                                                        | Call site, generic fallback    | Toast "Something went wrong" + `console.error` the raw error — a `400` here means the client sent malformed JSON, i.e. a frontend bug to fix, not a user-facing case |
| `401`                                                        | **Global** — Axios interceptor | See §2 below                                                                                                                                                         |
| `404` (get single)                                           | Call site                      | Toast `message` ("Product not found" / "Category not found"), redirect back to the relevant list                                                                     |
| `404` (action target gone, e.g. stock-in on deleted product) | Call site                      | Toast `message`, refresh the relevant dropdown/list                                                                                                                  |
| `405`                                                        | Call site, generic fallback    | This means the frontend called the wrong verb — a dev-time bug. Toast generic error, log full detail to console for the developer                                    |
| `409`                                                        | Call site                      | See §3 below — always a **user-facing expected outcome**, never swallowed or genericized                                                                             |
| `422`                                                        | Call site                      | See §4 below — map to form fields, never toast field errors                                                                                                          |
| `500`                                                        | Call site, generic fallback    | Toast "Something went wrong. Please try again." + optional retry affordance; log to console/error tracker                                                            |
| Network error (`!err.response`)                              | Call site, generic fallback    | Toast "Network error — check your connection." Never assume `err.response` exists before reading it.                                                                 |

---

## 2. `401` — Unauthorized (global)

Handled once, in `api/client.js`'s response interceptor — components and `queries/` hooks never need their own `401` branch.

```js
// api/client.js
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      // network error — let call sites handle their own generic fallback
      return Promise.reject(err);
    }

    if (err.response.status === 401) {
      const onLoginPage = window.location.pathname.startsWith("/login");
      if (!onLoginPage) {
        authStore.clear(); // clears AuthContext user
        queryClient.clear(); // wipes all cached server state — see State-Management.md
        toast.error("Your session expired. Please log in again.");
        window.location.assign("/login"); // hard redirect: guarantees a clean app state
      }
      // if already on /login, a 401 there is just "wrong credentials" —
      // let the Login page's own mutation error handler show it inline/toast
    }

    return Promise.reject(err);
  },
);
```

Rules:

- **Never retry** the request that 401'd — there's no refresh token to retry against (API guide §2.4).
- **Skip the redirect** when already on `/login` (a 401 there is a login-form concern, not a session-expiry concern).
- Clearing the Query cache on 401 is important — otherwise a second user logging in on the same browser session could momentarily see the previous user's cached data.

---

## 3. `409` — Business-rule conflict (expected, not an error)

These are **normal outcomes of normal actions**, not bugs. Treat them as first-class UI states, not exceptions to swallow into a generic toast.

| Endpoint                      | `409` meaning                               | UI treatment                                                                                                                                               |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DELETE /products/delete.php` | Product has stock history, can't be deleted | Show the backend's message verbatim in the `ConfirmDialog` (or a toast if the dialog already closed) — "Cannot delete product with existing stock history" |
| `POST /stock_out/create.php`  | Insufficient stock                          | Show "Insufficient stock: only N units available" verbatim, keep the modal open so the user can adjust quantity                                            |

```js
onError: (err) => {
  if (err.response?.status === 409) {
    toast.error(err.response.data.message); // verbatim, no rewriting
    return;
  }
  // ...other branches
};
```

Never write custom copy like "Error deleting product" for a `409` — the backend message already explains _why_, and rewriting it loses that context.

---

## 4. `422` — Validation failure

Always field-level. Never toast these — map onto the form (see `Form-Validation.md` §8).

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

```js
onError: (err) => {
  if (err.response?.status === 422) {
    applyServerErrors(form, err.response.data.errors); // from lib/errors.js
    return;
  }
};
```

If a mutation is fired from a context with no form (rare — none currently in this app), fall back to a toast built from the first error message, but this should not be the normal path.

---

## 5. `500` / unexpected errors

Generic toast, don't attempt to interpret `message` as anything structured (it may just be "Internal server error"). Offer a retry where the action is idempotent and cheap to repeat (e.g. re-fetching a list); for a mutation, leave the form/modal open with values intact so the user doesn't lose their input, and let them press Save again.

For `POST /stock_in/create.php` / `stock_out/create.php` specifically, the API guide notes the transaction rolls back on `500` — the reassuring copy "Couldn't record stock in. Nothing was changed." should be used verbatim on this endpoint rather than the fully generic message, since it tells the user their data wasn't partially applied.

---

## 6. Network errors

```js
if (!err.response) {
  toast.error("Network error — check your connection");
  return;
}
```

Always check this branch **before** reading `err.response.status` — reading `.status` off `undefined` throws and can crash an error handler mid-flow. This is the #1 mistake called out in the API guide's mistakes table (§6.7) — treat it as a hard rule, not a suggestion.

---

## 7. Offline

Not separately detected via `navigator.onLine` for v1 — a genuine offline state surfaces as the same "no `err.response`" network-error branch above, and gets the same toast. If a dedicated offline banner is wanted later, it's an additive enhancement (a `window.addEventListener('online'/'offline', ...)` listener feeding a small banner in `AppShell`), not a blocker for initial build.

---

## 8. Session expired mid-form

If a `401` fires while a user is mid-way through filling a modal form (session expired in the background), the global interceptor still fires the hard redirect. This is an accepted tradeoff — there is no draft-recovery mechanism in v1. If this becomes a real pain point in practice, a future enhancement could persist in-progress form values to `sessionStorage` before the redirect, but don't build this preemptively.

---

## 9. Shared helper reference

```js
// lib/errors.js
export function getErrorMessage(err) {
  if (!err.response) return "Network error — check your connection";
  return (
    err.response.data?.message ?? "Something went wrong. Please try again."
  );
}

export function applyServerErrors(form, errors) {
  if (!errors) return;
  Object.entries(errors).forEach(([field, message]) => {
    form.setError(field, { type: "server", message });
  });
}
```

Every mutation's `onError` should follow this shape:

```js
onError: (err) => {
  const status = err.response?.status;
  if (status === 422) return applyServerErrors(form, err.response.data.errors);
  if (status === 409) return toast.error(err.response.data.message);
  if (status === 401) return; // handled globally, nothing to do here
  toast.error(getErrorMessage(err));
};
```
