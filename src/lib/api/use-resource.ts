"use client";
import { useEffect, useState } from "react";

// ============================================================
// useScreenState — collapses a TanStack Query result into the four render
// states the screens switch on, with a dev-only ?state= override to preview
// loading / empty / error without touching the backend.
// ============================================================

export type DataState = "ready" | "loading" | "empty" | "error";

// Structural shape shared by useQuery and useInfiniteQuery results — enough for
// the state mapping below, so either kind of query can be passed in.
interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
}

interface Options<T> {
  isEmpty?: (data: T) => boolean;
}

function readOverride(): DataState | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("state");
  return value === "loading" || value === "empty" || value === "error"
    ? value
    : null;
}

export function useScreenState<T>(
  query: QueryLike<T>,
  opts: Options<T> = {},
) {
  const [override, setOverride] = useState<DataState | null>(null);
  useEffect(() => {
    // One-shot read of the dev ?state= override after mount (client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverride(readOverride());
  }, []);

  let state: DataState;
  if (override) {
    state = override;
  } else if (query.isPending || query.isLoading) {
    state = "loading";
  } else if (query.isError) {
    state = "error";
  } else {
    state = opts.isEmpty?.(query.data as T) ? "empty" : "ready";
  }

  const retry = () => {
    setOverride(null);
    void query.refetch();
  };

  return { state, data: query.data ?? null, retry };
}
