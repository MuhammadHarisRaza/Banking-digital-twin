import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * A small shared cache for API reads (enough for this app, without adding a query library):
 * one entry per key, requests de-duplicated while in flight, data reused while fresh, and every
 * component reading the same key re-rendered when it lands.
 */

interface Entry {
  data?: unknown;
  error?: Error;
  at: number;
  promise?: Promise<void>;
}

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();
const EMPTY: Entry = { at: 0 };

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function load(key: string, fetcher: () => Promise<unknown>) {
  const prev = cache.get(key);
  if (prev?.promise) return prev.promise;
  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
    })
    .catch((error: Error) => {
      cache.set(key, { data: prev?.data, error, at: Date.now() });
    })
    .finally(() => notify(key));
  cache.set(key, { ...(prev ?? EMPTY), promise });
  notify(key);
  return promise;
}

/** Drops cached entries whose key starts with `prefix` (all when omitted), e.g. after changing the API URL. */
export function invalidate(prefix = "") {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
  for (const key of listeners.keys()) if (key.startsWith(prefix)) notify(key);
}

export interface QueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refetch: () => void;
}

/** Reads `key` through the cache; pass null to skip (disabled). */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, staleMs = 120_000): QueryResult<T> {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => undefined;
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(cb);
      return () => set!.delete(cb);
    },
    [key],
  );
  const entry = useSyncExternalStore(subscribe, () => (key ? (cache.get(key) ?? EMPTY) : EMPTY));

  useEffect(() => {
    if (!key) return;
    const e = cache.get(key);
    if (!e || (!e.promise && Date.now() - e.at > staleMs)) void load(key, fetcher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs, entry]);

  return {
    data: entry.data as T | undefined,
    error: entry.error,
    loading: !!key && (!!entry.promise || (entry.at === 0 && !entry.error)),
    refetch: () => key && void load(key, fetcher),
  };
}
