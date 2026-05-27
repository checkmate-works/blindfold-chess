import { useEffect, useRef } from 'react';

/**
 * Mirrors a set of values into refs so that async callbacks and event
 * handlers can read the latest value without being re-created whenever a
 * value changes.
 *
 * The returned ref-bag object has a stable identity across renders; each
 * `.current` is refreshed after every commit. This replaces hand-written
 * "copy props into refs" effects — a single effect carrying a large
 * dependency array — with one declarative call.
 *
 * The set of keys in `values` must be stable across renders (the ref bag is
 * built once from the first render's keys).
 */
export function useLatestRefs<T extends Record<string, unknown>>(
  values: T
): { [K in keyof T]: React.RefObject<T[K]> } {
  type Refs = { [K in keyof T]: React.RefObject<T[K]> };

  const refsRef = useRef<Refs | null>(null);
  refsRef.current ??= Object.fromEntries(
    Object.keys(values).map((key) => [key, { current: values[key] }])
  ) as Refs;
  const refs = refsRef.current;

  // No dependency array: the refs are re-synced after every commit so they
  // always reflect the most recent render's values.
  useEffect(() => {
    for (const key of Object.keys(refs) as (keyof T)[]) {
      refs[key].current = values[key];
    }
  });

  return refs;
}
