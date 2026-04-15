'use client';

import { useCallback, useMemo } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Parser: converts the raw URL query value into a typed application value.
 * Receives `null` when the key is absent from the URL.
 */
export type SearchParamParser<T> = (raw: string | null) => T;

/**
 * Serializer: converts a typed application value into a URL query value.
 * Return `null` to remove the key from the URL entirely.
 *
 * When omitted, `useSearchParamState` falls back to `String(value)` for
 * non-nullish values and removes the key for `null`/`undefined`.
 */
export type SearchParamSerializer<T> = (value: T) => string | null;

const defaultSerializer = <T>(value: T): string | null => {
  if (value === null || value === undefined) return null;
  return String(value);
};

/**
 * Shared hook for deriving a piece of state from a single URL search param.
 *
 * Reads the current value from `useSearchParams()` via the supplied `parser`,
 * and exposes a setter that updates the URL via `router.replace` (with
 * `scroll: false`). The returned value is always recomputed from the URL, so
 * external URL changes stay in sync without a `useEffect`-based mirror.
 *
 * @param key         Query-param key to read/write (e.g. `"page"`).
 * @param parser      Converts the raw string (or `null` when absent) into `T`.
 * @param serializer  Optional inverse of `parser`. Return `null` to remove the
 *                    key from the URL. Defaults to `String(value)` with
 *                    `null`/`undefined` removing the key.
 */
export function useSearchParamState<T>(
  key: string,
  parser: SearchParamParser<T>,
  serializer: SearchParamSerializer<T> = defaultSerializer
): [T, (next: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = useMemo(() => parser(searchParams.get(key)), [parser, searchParams, key]);

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      const serialized = serializer(next);
      if (serialized === null) {
        params.delete(key);
      } else {
        params.set(key, serialized);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, serializer, key]
  );

  return [value, setValue];
}
