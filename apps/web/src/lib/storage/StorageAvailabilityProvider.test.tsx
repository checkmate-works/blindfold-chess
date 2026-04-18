import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  StorageAvailabilityProvider,
  useStorageAvailabilityContext,
} from './StorageAvailabilityProvider';
import * as detectModule from './storage-availability';

/**
 * Tests for the context provider that fans out a single storage-availability
 * probe to the whole tree.
 *
 * The critical invariant — and the reason the provider exists at all — is
 * that the probe runs **exactly once per page load**, no matter how many
 * consumers read the context. If a consumer accidentally calls the raw
 * `useStorageAvailability` hook instead of `useStorageAvailabilityContext`,
 * we would silently multiply probe work by the number of consumers. The
 * "single probe" test below is the regression guard for that.
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

describe('StorageAvailabilityProvider', () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalIndexedDB = Object.getOwnPropertyDescriptor(window, 'indexedDB');

  beforeEach(() => {
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

  it('renders its children', () => {
    render(
      <StorageAvailabilityProvider>
        <div data-testid="child">hello</div>
      </StorageAvailabilityProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('exposes the availability value through the context hook', () => {
    function Consumer() {
      const availability = useStorageAvailabilityContext();
      return (
        <div data-testid="consumer">
          {availability ? `all=${String(availability.all)}` : 'null'}
        </div>
      );
    }

    render(
      <StorageAvailabilityProvider>
        <Consumer />
      </StorageAvailabilityProvider>
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent('all=true');
  });

  it('returns null outside a Provider (no Provider default sentinel, no throw)', () => {
    // Contract: the context's default is `null`, which callers treat the
    // same as "probe not finished" and "storage unavailable" — render
    // nothing. We must NOT throw because the Provider is intentionally
    // optional in some test/utility contexts.
    const { result } = renderHook(() => useStorageAvailabilityContext());

    expect(result.current).toBeNull();
  });

  it('runs the storage probe exactly once even with many consumers (critical)', () => {
    // This is the whole point of the Provider: one probe per tree, not one
    // per consumer. We spy on `detectStorageAvailability` and verify the
    // call count is 1 — plus at most 1 for React 19 StrictMode double-fire
    // (which is not in use here, so we expect exactly 1).
    const detectSpy = vi.spyOn(detectModule, 'detectStorageAvailability');

    function Consumer() {
      useStorageAvailabilityContext();
      return null;
    }

    render(
      <StorageAvailabilityProvider>
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
      </StorageAvailabilityProvider>
    );

    // Exactly one probe — the provider owns the hook, consumers only
    // subscribe to the resulting context.
    expect(detectSpy).toHaveBeenCalledTimes(1);
  });

  it('propagates the same availability object to all consumers', () => {
    // If two consumers rendered different availability values that would mean
    // each is running its own probe and diverging — which is exactly the bug
    // we are guarding against.
    //
    // The provider renders twice per mount: once with the initial `null`
    // context value (before the probe effect runs), and once after
    // `setAvailability` fires. All consumers must share the same value on
    // each of those renders, so we slice the capture array per consumer
    // instance by index and verify consistency.
    const captured: Array<unknown> = [];
    function Consumer() {
      const availability = useStorageAvailabilityContext();
      captured.push(availability);
      return null;
    }

    render(
      <StorageAvailabilityProvider>
        <Consumer />
        <Consumer />
        <Consumer />
      </StorageAvailabilityProvider>
    );

    // 3 consumers × 2 renders (pre- and post-probe) = 6 captures.
    expect(captured.length).toBe(6);
    // The pre-probe pass (first 3 captures) sees `null` — all equal.
    expect(captured[0]).toBeNull();
    expect(captured[1]).toBeNull();
    expect(captured[2]).toBeNull();
    // The post-probe pass (next 3 captures) sees the same object on every
    // consumer — this is the real invariant the test enforces.
    expect(captured[3]).toBe(captured[4]);
    expect(captured[4]).toBe(captured[5]);
    expect(captured[3]).not.toBeNull();
  });

  it('reports all=false when the underlying probe says storage is blocked', () => {
    // Swap the probe to simulate a blocked-storage environment and confirm
    // the provider faithfully forwards that result.
    vi.spyOn(detectModule, 'detectStorageAvailability').mockReturnValue({
      localStorage: false,
      indexedDB: true,
      cookies: true,
      all: false,
    });

    function Consumer() {
      const availability = useStorageAvailabilityContext();
      return <div data-testid="consumer">{availability ? String(availability.all) : 'null'}</div>;
    }

    render(
      <StorageAvailabilityProvider>
        <Consumer />
      </StorageAvailabilityProvider>
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent('false');
  });
});
