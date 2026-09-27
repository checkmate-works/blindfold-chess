export type StorageMock = Pick<Storage, 'setItem' | 'removeItem' | 'getItem'>;

export function installLocalStorage(mock: StorageMock | null): void {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: mock });
}

export function installIndexedDB(value: unknown): void {
  Object.defineProperty(window, 'indexedDB', { configurable: true, value });
}

/**
 * Capture jsdom's own `window.localStorage` / `window.indexedDB` descriptors
 * and return a function that puts them back — call it in `afterEach` so the
 * doubles a suite installs cannot leak into the next suite in the worker.
 */
export function snapshotWindowStorage(): () => void {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
  const originalIndexedDB = Object.getOwnPropertyDescriptor(window, 'indexedDB');
  return () => {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
    if (originalIndexedDB) {
      Object.defineProperty(window, 'indexedDB', originalIndexedDB);
    }
  };
}

export function makeWorkingLocalStorage(): StorageMock {
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

export function makeThrowingLocalStorage(error: Error): StorageMock {
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

/**
 * A storage whose every accessor throws, including `getItem`.
 *
 * `makeThrowingLocalStorage` deliberately keeps reads working, because the
 * availability probe only ever writes. Reproducing a browser that refuses the
 * whole API — Firefox ETP, a sandboxed iframe — needs the read to throw too.
 */
export function makeUnreadableLocalStorage(error: Error): StorageMock {
  const raise = (): never => {
    throw error;
  };
  return { getItem: raise, setItem: raise, removeItem: raise };
}
