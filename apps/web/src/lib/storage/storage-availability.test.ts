import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectStorageAvailability } from './storage-availability';

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

describe('detectStorageAvailability', () => {
  // jsdom gives us a working localStorage / indexedDB / document.cookie by
  // default. Each test installs its own overrides via Object.defineProperty
  // and restores them in afterEach.
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalIndexedDB = Object.getOwnPropertyDescriptor(window, 'indexedDB');

  beforeEach(() => {
    // Reset cookies between tests so leftover probe values don't bleed across
    // assertions.
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

  describe('happy path', () => {
    it('returns all=true when every probe succeeds', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB({}); // truthy presence is enough — we do not open()

      const result = detectStorageAvailability();

      expect(result.localStorage).toBe(true);
      expect(result.indexedDB).toBe(true);
      expect(result.cookies).toBe(true);
      expect(result.all).toBe(true);
    });
  });

  describe('localStorage gating', () => {
    it('returns localStorage=false and all=false when setItem throws SecurityError (Firefox ETP / private mode)', () => {
      const securityError = new DOMException('access denied', 'SecurityError');
      installLocalStorage(makeThrowingLocalStorage(securityError));
      installIndexedDB({});

      const result = detectStorageAvailability();

      expect(result.localStorage).toBe(false);
      expect(result.all).toBe(false);
    });

    it('returns localStorage=false when setItem throws QuotaExceededError', () => {
      const quotaError = new DOMException('quota exceeded', 'QuotaExceededError');
      installLocalStorage(makeThrowingLocalStorage(quotaError));
      installIndexedDB({});

      const result = detectStorageAvailability();

      expect(result.localStorage).toBe(false);
      expect(result.all).toBe(false);
    });

    it('returns localStorage=false when window.localStorage is null (adblocker null-out)', () => {
      installLocalStorage(null);
      installIndexedDB({});

      const result = detectStorageAvailability();

      expect(result.localStorage).toBe(false);
      expect(result.all).toBe(false);
    });

    it('returns localStorage=false when accessing the property itself throws', () => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('access denied', 'SecurityError');
        },
      });
      installIndexedDB({});

      const result = detectStorageAvailability();

      expect(result.localStorage).toBe(false);
      expect(result.all).toBe(false);
    });
  });

  describe('indexedDB gating', () => {
    it('returns indexedDB=false when window.indexedDB is undefined', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB(undefined);

      const result = detectStorageAvailability();

      expect(result.indexedDB).toBe(false);
      expect(result.all).toBe(false);
    });

    it('returns indexedDB=false when window.indexedDB is null', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB(null);

      const result = detectStorageAvailability();

      expect(result.indexedDB).toBe(false);
      expect(result.all).toBe(false);
    });

    it('returns indexedDB=false when accessing the property throws', () => {
      installLocalStorage(makeWorkingLocalStorage());
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        get() {
          throw new Error('blocked');
        },
      });

      const result = detectStorageAvailability();

      expect(result.indexedDB).toBe(false);
      expect(result.all).toBe(false);
    });
  });

  describe('cookies gating', () => {
    // jsdom inherits `cookie` from `Document.prototype`. We override the
    // instance, then `delete document.cookie` in the finally block so the
    // prototype's accessor takes over again. Saving the original prototype
    // descriptor and reinstalling it would also work, but the delete is
    // simpler and avoids leaking state when tests run in unpredictable order.
    function withStubbedCookie(
      stub: { get?: () => string; set?: (v: string) => void },
      fn: () => void
    ): void {
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: stub.get ?? (() => ''),
        set: stub.set ?? (() => {}),
      });
      try {
        fn();
      } finally {
        // Remove the instance-level shadow so the inherited Document.prototype
        // accessor (the real jsdom implementation) becomes visible again.
        delete (document as unknown as { cookie?: unknown }).cookie;
      }
    }

    it('returns cookies=false when document.cookie writes do not stick', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB({});

      withStubbedCookie(
        {
          // no-op setter — writes are silently dropped (simulates blocked
          // third-party cookies + ITP-style swallowed writes).
        },
        () => {
          const result = detectStorageAvailability();

          expect(result.cookies).toBe(false);
          expect(result.all).toBe(false);
        }
      );
    });

    it('returns cookies=false when assigning document.cookie throws', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB({});

      withStubbedCookie(
        {
          set: () => {
            throw new DOMException('blocked', 'SecurityError');
          },
        },
        () => {
          const result = detectStorageAvailability();

          expect(result.cookies).toBe(false);
          expect(result.all).toBe(false);
        }
      );
    });
  });

  describe('combined flags', () => {
    it('all=true requires every probe to pass', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB({});

      const result = detectStorageAvailability();

      expect(result.all).toBe(result.localStorage && result.indexedDB && result.cookies);
      expect(result.all).toBe(true);
    });

    it('all=false when only one probe fails', () => {
      installLocalStorage(makeWorkingLocalStorage());
      installIndexedDB(undefined);

      const result = detectStorageAvailability();

      expect(result.localStorage).toBe(true);
      expect(result.indexedDB).toBe(false);
      expect(result.all).toBe(false);
    });
  });
});
