// src/lib/errors.js
// Error helpers. See docs/Error_Handling.md.
// Backend response envelope: { success, data, message, errors }.

/**
 * Return a user-friendly message for any thrown error.
 * Network errors (`!err.response`) get a generic fallback;
 * otherwise prefer the backend-provided `message`.
 */
export function getErrorMessage(err) {
  if (!err.response) return 'Network error — check your connection';
  return (
    err.response.data?.message ?? 'Something went wrong. Please try again.'
  );
}

/**
 * Apply a backend `errors` map (from a 422) onto a React Hook Form instance.
 * Each `{ fieldName: message }` is attached to the form as a server-side error.
 */
export function applyServerErrors(form, errors) {
  if (!errors) return;
  Object.entries(errors).forEach(([field, message]) => {
    form.setError(field, { type: 'server', message });
  });
}