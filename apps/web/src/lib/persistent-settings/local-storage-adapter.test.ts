import { afterEach, describe, expect, it } from 'vitest';

import {
  installLocalStorage,
  makeThrowingLocalStorage,
  makeUnreadableLocalStorage,
  makeWorkingLocalStorage,
} from '@/lib/storage/__test-support__/storage-mocks';

import { localStorageAdapter, readJson, writeJson } from './local-storage-adapter';

/**
 * The three ways a browser refuses to store, exercised against the one entry
 * point every `localStorage` caller in the app now goes through.
 *
 * The contract under test is narrow but load-bearing: a read always produces
 * the fallback instead of throwing, and a write reports whether it landed
 * instead of either throwing or lying. The saved-game repository depends on
 * the second half to decide whether it may advance its in-memory cache.
 */
describe('local-storage-adapter', () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
  });

  describe('when localStorage works', () => {
    it('round-trips a JSON value', () => {
      installLocalStorage(makeWorkingLocalStorage());

      const written = writeJson('key', { a: 1 });

      expect(written.ok).toBe(true);
      expect(readJson('key', null)).toEqual({ a: 1 });
    });

    it('falls back when the key was never written', () => {
      installLocalStorage(makeWorkingLocalStorage());

      expect(readJson('absent', 'fallback')).toBe('fallback');
    });

    it('falls back when the stored payload will not parse', () => {
      const storage = makeWorkingLocalStorage();
      storage.setItem('key', '{not json');
      installLocalStorage(storage);

      expect(readJson('key', 'fallback')).toBe('fallback');
    });
  });

  describe('when localStorage is absent', () => {
    it('reads the fallback rather than throwing on the missing object', () => {
      installLocalStorage(null);

      expect(readJson('key', 'fallback')).toBe('fallback');
      expect(localStorageAdapter.get('key')).toBeNull();
    });

    it('reports the write as failed', () => {
      installLocalStorage(null);

      expect(writeJson('key', { a: 1 }).ok).toBe(false);
    });

    it('leaves the void adapter `set` inert', () => {
      installLocalStorage(null);

      expect(() => localStorageAdapter.set('key', 'value')).not.toThrow();
    });
  });

  describe('when localStorage throws on access (private browsing / ETP)', () => {
    const securityError = new Error('SecurityError');

    it('reads the fallback', () => {
      installLocalStorage(makeUnreadableLocalStorage(securityError));

      expect(readJson('key', 'fallback')).toBe('fallback');
    });

    it('reports the write as failed and hands back what the browser threw', () => {
      installLocalStorage(makeUnreadableLocalStorage(securityError));

      const written = writeJson('key', { a: 1 });

      expect(written.ok).toBe(false);
      if (!written.ok) expect(written.error).toBe(securityError);
    });
  });

  describe('when localStorage throws only on write (quota exceeded)', () => {
    const quotaError = new Error('QuotaExceededError');

    it('reports the write as failed and hands back what the browser threw', () => {
      installLocalStorage(makeThrowingLocalStorage(quotaError));

      const written = writeJson('key', { a: 1 });

      expect(written.ok).toBe(false);
      if (!written.ok) expect(written.error).toBe(quotaError);
    });

    it('still reads', () => {
      installLocalStorage(makeThrowingLocalStorage(quotaError));

      // `makeThrowingLocalStorage` keeps `getItem` working, which is the point:
      // at quota a browser serves what it already holds.
      expect(readJson('key', 'fallback')).toBe('fallback');
    });
  });

  it('reports a value that cannot be serialized as a failed write, not a throw', () => {
    installLocalStorage(makeWorkingLocalStorage());
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const written = writeJson('key', circular);

    expect(written.ok).toBe(false);
  });
});
