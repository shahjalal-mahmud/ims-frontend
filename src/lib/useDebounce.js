// src/lib/useDebounce.js
// Debounce hook — returns a value that lags `value` by `delay` ms.
//
// WHY debounce?
// On the Products search box, every keystroke would otherwise fire a
// network request (and update the URL) — so typing "cola" would do
// four requests: /products/list.php?search=c, ?search=co, ?search=col,
// ?search=cola. Each one also pushes a new entry onto the browser
// history stack, so the back button would feel broken.
//
// Debouncing waits until the user stops typing for 250ms, then fires
// once. The Products page (src/pages/inventory/ProductsList.jsx) uses
// the debounced search to drive the query key; the Stock-In / Stock-
// Out reports (with 300ms) use it to update the URL. The category /
// supplier <select>s use it directly because a <select> only emits
// one event per change.
//
// See docs/FRONTEND_API_INTEGRATION_GUIDE.md §6.5 for the timing.

import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 250) {
  // Mirror state — initialized to `value` so the first render returns
  // something useful before the debounce timer fires.
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Schedule the update. The cleanup function clears the timer if
    // `value` (or `delay`) changes before it fires, so we only ever
    // commit the LATEST value — older pending values are dropped.
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
