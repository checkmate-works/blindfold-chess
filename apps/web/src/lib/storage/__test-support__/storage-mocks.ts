export type StorageMock = Pick<Storage, 'setItem' | 'removeItem' | 'getItem'>;

export function installLocalStorage(mock: StorageMock | null): void {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: mock });
}

export function installIndexedDB(value: unknown): void {
  Object.defineProperty(window, 'indexedDB', { configurable: true, value });
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
