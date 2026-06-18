"use client";
import { useEffect, useState } from "react";

// ============================================================
// useDebouncedValue — returns `value` after it has stopped changing for
// `delayMs`. Used to throttle server-side search so we don't fire a request on
// every keystroke.
// ============================================================

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
