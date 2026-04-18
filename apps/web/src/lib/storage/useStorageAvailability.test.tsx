import { StrictMode } from 'react';

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStorageAvailability } from './useStorageAvailability';

/**
 * Tests for the `useStorageAvailability` hook.
 *
 * The hook's contract:
 *   - Returns `null` on the very first render (SSR-equivalent in jsdom, before
 *     useEffect fires).
 *   - After the post-mount effect runs, returns a concrete
 *     `StorageAvailability` value.
 *   - Re-rendering the consumer does not re-probe storage (the effect has an
 *     empty dep array, so it must fire exactly once).
 *   - Under `StrictMode`, React intentionally double-invokes effects. The hook
 *     must still end up with a valid availability value.
 */

type StorageMock = Pick<Storage, 'setItem' | 'removeItem' | 'getItem'>;

function makeWorkingLocalStorage(): StorageMock {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe('useStorageAvailability', () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalIndexedDB = Object.getOwnPropertyDescriptor(window, 'indexedDB');

  beforeEach(() => {
    // Install a working storage environment for every test. jsdom's defaults
    // already pass, but we want deterministic control.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: makeWorkingLocalStorage(),
    });
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    cleanup();
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    if (originalIndexedDB) {
      Object.defineProperty(window, 'indexedDB', originalIndexedDB);
    }
    vi.restoreAllMocks();
  });

  it('returns the availability object after the post-mount effect runs', () => {
    const { result } = renderHook(() => useStorageAvailability());

    // `renderHook` flushes effects synchronously in React 19 + RTL 16, so by
    // the time we read `result.current` the effect has already set state.
    expect(result.current).not.toBeNull();
    expect(result.current?.localStorage).toBe(true);
    expect(result.current?.indexedDB).toBe(true);
    expect(result.current?.cookies).toBe(true);
    expect(result.current?.all).toBe(true);
  });

  it('keeps a stable reference across re-renders (no repeated probe on every render)', () => {
    const { result, rerender } = renderHook(() => useStorageAvailability());

    const first = result.current;
    expect(first).not.toBeNull();

    rerender();
    rerender();
    rerender();

    // Because the effect has `[]` dep array, state must never change on
    // re-render. Reference equality is the strongest signal that no new
    // `setAvailability` call happened.
    expect(result.current).toBe(first);
  });

  it('reflects storage blockage — returns all=false when localStorage setItem throws', () => {
    const throwing: StorageMock = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      removeItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: throwing,
    });

    const { result } = renderHook(() => useStorageAvailability());

    expect(result.current).not.toBeNull();
    expect(result.current?.localStorage).toBe(false);
    expect(result.current?.all).toBe(false);
  });

  it('does not loop forever — only runs the effect once even with multiple rerenders', () => {
    // Spy on setItem so we can count how many times the probe actually runs.
    const setItemSpy = vi.fn();
    const spiedStorage: StorageMock = {
      getItem: () => null,
      setItem: setItemSpy,
      removeItem: () => {},
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: spiedStorage,
    });

    const { rerender } = renderHook(() => useStorageAvailability());

    const initialCalls = setItemSpy.mock.calls.length;
    rerender();
    rerender();
    rerender();

    // The probe fires in useEffect with `[]` deps, so after the initial mount
    // it must not fire again on subsequent renders. We allow `initialCalls` to
    // be 1 in a normal run; the contract is "no additional calls on rerender".
    expect(setItemSpy.mock.calls.length).toBe(initialCalls);
  });

  it('tolerates StrictMode double-invocation of the effect', () => {
    // StrictMode intentionally mounts → unmounts → remounts the component in
    // development to surface effect cleanup bugs. The probe is idempotent and
    // should produce the same result both times.
    const { result } = renderHook(() => useStorageAvailability(), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.all).toBe(true);
  });

  it('can be invoked via act() without warnings', () => {
    // Defensive: guards against a future refactor that uses a synchronous
    // state setter outside an effect and would trigger the "update to X
    // inside a test was not wrapped in act(...)" warning.
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      renderHook(() => useStorageAvailability());
    });

    // Filter out unrelated React noise by checking the act() warning
    // substring specifically.
    const actWarnings = warn.mock.calls
      .map((args) => String(args[0] ?? ''))
      .filter((msg) => msg.includes('not wrapped in act'));
    expect(actWarnings).toEqual([]);

    warn.mockRestore();
  });
});
