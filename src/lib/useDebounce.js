// src/lib/useDebounce.js
// Debounce any value for `delay` ms after it last changed. Used by the
// Products search box (250ms, per docs/FRONTEND_API_INTEGRATION_GUIDE.md
// §6.5) so typing doesn't spam the network or the URL history stack.

import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
