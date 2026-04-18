import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectStorageAvailability } from './storage-availability';

/**
 * Supplementary edge-case tests for `detectStorageAvailability()`.
 *
 * The Coder's primary test file exercises one-at-a-time probe failures.
 * This file fills in the multi-probe combinations and determinism checks
 * that complement it:
 *   - All three probes fail simultaneously.
 *   - Two probes pass, one fails.
 *   - Idempotence: calling the function multiple times returns equivalent
 *     results (no global state contamination).
 *   - Partial-mock window: some properties are present, others are stripped.
 */

type StorageMock = Pick<Storage, 'setItem' | 'removeItem' | 'getItem'>;

function installLocalStorage(mock: StorageMock | null): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: mock,
  });
}

function installIndexedDB(value: unknown): void {
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value,
  });
}

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

function makeThrowingLocalStorage(error: Error): StorageMock {
  return {
    getItem: () => null,
    setItem: () => {
      throw error;
    },
    removeItem: () => {
      throw error;
    },
  };
}

function withBlockedCookie(fn: () => void): void {
  // Overrides document.cookie so writes are silently dropped (getter always
  // returns '' => probe value never round-trips => cookies=false).
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => '',
    set: () => {},
  });
  try {
    fn();
  } finally {
    delete (document as unknown as { cookie?: unknown }).cookie;
  }
}

describe('detectStorageAvailability — combined failure modes', () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalIndexedDB = Object.getOwnPropertyDescriptor(window, 'indexedDB');

  beforeEach(() => {
    document.cookie.split(';').forEach((entry) => {
      const [name] = entry.trim().split('=');
      if (name) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    if (originalIndexedDB) {
      Object.defineProperty(window, 'indexedDB', originalIndexedDB);
    }
    vi.restoreAllMocks();
  });

  it('returns all-false when every probe fails simultaneously', () => {
    installLocalStorage(makeThrowingLocalStorage(new Error('SecurityError')));
    installIndexedDB(undefined);

    withBlockedCookie(() => {
      const result = detectStorageAvailability();
      expect(result.localStorage).toBe(false);
      expect(result.indexedDB).toBe(false);
      expect(result.cookies).toBe(false);
      expect(result.all).toBe(false);
    });
  });

  it('returns all=false when two probes pass but the third fails (cookies blocked)', () => {
    installLocalStorage(makeWorkingLocalStorage());
    installIndexedDB({});

    withBlockedCookie(() => {
      const result = detectStorageAvailability();
      expect(result.localStorage).toBe(true);
      expect(result.indexedDB).toBe(true);
      expect(result.cookies).toBe(false);
      expect(result.all).toBe(false);
    });
  });

  it('returns all=false when two probes pass but the third fails (localStorage blocked)', () => {
    installLocalStorage(makeThrowingLocalStorage(new Error('SecurityError')));
    installIndexedDB({});

    const result = detectStorageAvailability();
    expect(result.localStorage).toBe(false);
    expect(result.indexedDB).toBe(true);
    expect(result.cookies).toBe(true);
    expect(result.all).toBe(false);
  });

  it('returns all=false when two probes pass but the third fails (indexedDB blocked)', () => {
    installLocalStorage(makeWorkingLocalStorage());
    installIndexedDB(null);

    const result = detectStorageAvailability();
    expect(result.localStorage).toBe(true);
    expect(result.indexedDB).toBe(false);
    expect(result.cookies).toBe(true);
    expect(result.all).toBe(false);
  });

  it('is idempotent — multiple calls return equivalent results', () => {
    installLocalStorage(makeWorkingLocalStorage());
    installIndexedDB({});

    const first = detectStorageAvailability();
    const second = detectStorageAvailability();
    const third = detectStorageAvailability();

    // The probe writes a cookie + sets a localStorage key and then cleans
    // them up, so the second and third calls should operate on a pristine
    // state and produce the same result. Cross-check every field.
    expect(second.localStorage).toBe(first.localStorage);
    expect(second.indexedDB).toBe(first.indexedDB);
    expect(second.cookies).toBe(first.cookies);
    expect(second.all).toBe(first.all);
    expect(third).toEqual(first);
  });

  it('cleans up after itself — no probe key leaks into localStorage or cookies', () => {
    const localStorage = makeWorkingLocalStorage();
    installLocalStorage(localStorage);
    installIndexedDB({});

    detectStorageAvailability();

    // localStorage: the setItem/removeItem pair should leave no trace.
    expect(localStorage.getItem('__bfc_storage_probe__')).toBeNull();

    // cookies: the cleanup uses Max-Age=0 so the probe key should not
    // appear in document.cookie after the call.
    expect(document.cookie).not.toContain('__bfc_storage_probe__=1');
  });

  it('handles a partial window mock where localStorage.setItem is missing (TypeError on call)', () => {
    // An adblocker / extension sometimes stubs localStorage with an object
    // that has some methods but not others. Accessing a missing method
    // throws TypeError when invoked — the probe must swallow it.
    const partialStorage = {
      getItem: () => null,
      // setItem intentionally missing — `storage.setItem(...)` throws
      // TypeError.
    } as unknown as StorageMock;
    installLocalStorage(partialStorage);
    installIndexedDB({});

    const result = detectStorageAvailability();
    expect(result.localStorage).toBe(false);
    expect(result.all).toBe(false);
  });

  it('treats `all` as the strict AND of the three booleans', () => {
    // Exhaustive truth table check that `all` is NOT a short-circuit evaluation
    // bug — e.g., `localStorage && cookies` accidentally, skipping indexedDB.
    installLocalStorage(makeWorkingLocalStorage());
    installIndexedDB({});

    const allTrue = detectStorageAvailability();
    expect(allTrue.all).toBe(true);

    // Flip indexedDB only and assert `all` drops even though localStorage
    // and cookies are still true.
    installIndexedDB(undefined);
    const withoutIdb = detectStorageAvailability();
    expect(withoutIdb.localStorage).toBe(true);
    expect(withoutIdb.cookies).toBe(true);
    expect(withoutIdb.indexedDB).toBe(false);
    expect(withoutIdb.all).toBe(false);
  });
});
