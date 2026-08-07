"use client";

import { useInsertionEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Keep a ref pointing at the latest `value` without writing it during render.
 *
 * This is the "latest ref" pattern for reading fresh callbacks/config from
 * stable callbacks and effects, minus its usual sin: assigning `ref.current`
 * in the component body mutates shared state during render, which React
 * forbids because a concurrent render may be thrown away after the write
 * (and StrictMode double-renders would write twice). The write happens in
 * `useInsertionEffect` instead — the earliest effect phase, flushed before
 * every layout effect of the same commit — so any code that can legitimately
 * read the ref (event handlers, effects, timer callbacks) already sees the
 * committed value.
 *
 * Do NOT read the returned ref during render; that is the other half of the
 * same rule, and this hook cannot make it safe.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
}
