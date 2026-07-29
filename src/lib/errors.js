// src/lib/errors.js
// Central error → UI helpers. Every mutation's `onError` should funnel
// through these, per docs/Error_Handling.md §1.
//
// The mapping is:
//
//   !err.response                  → "Network error — check your connection"
//                                    (no HTTP response at all — DNS, offline,
//                                    CORS preflight failed, etc.)
//
//   err.response.data?.message     → use it as-is (the backend already wrote
//                                    it for end-users). This covers 401 bad
//                                    credentials, 409 insufficient stock,
//                                    404 product-not-found, etc.
//
//   no message field at all        → "Something went wrong. Please try
//                                    again." generic fallback.
//
// `applyServerErrors` is for 422 responses — it walks the `errors`
// object the backend returns and maps each field onto a React Hook
// Form instance so the user sees the error inline (NOT in a toast).
// Why no toast? Because field errors are about a specific input;
// putting them in a corner toast makes the user hunt for what to fix.

/**
 * Return a user-friendly message for any thrown error.
 *
 * Network errors (`!err.response`) get a generic fallback;
 * otherwise prefer the backend-provided `message`. If even the
 * backend message is missing, fall back to a generic message so the
 * UI never renders an empty toast.
 */
export function getErrorMessage(err) {
  if (!err.response) return 'Network error — check your connection';
  return (
    err.response.data?.message ?? 'Something went wrong. Please try again.'
  );
}

/**
 * Apply a backend `errors` map (from a 422) onto a React Hook Form instance.
 *
 * `form` is an RHF handle (the result of `useForm()`) — we only use
 * its `setError` method. Each `{ fieldName: message }` pair becomes a
 * server-side error on the corresponding form field, which RHF
 * surfaces in `formState.errors.<field>`.
 */
export function applyServerErrors(form, errors) {
  if (!errors) return;
  Object.entries(errors).forEach(([field, message]) => {
    form.setError(field, { type: 'server', message });
  });
}