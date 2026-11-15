// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_INCLUDE_MOVES,
  readIncludeMoves,
  resetIncludeMovesForTests,
  subscribeIncludeMoves,
  writeIncludeMoves,
} from './lichess-include-moves-store';

const KEY = 'blindfold-chess-lichess-include-moves';

beforeEach(() => {
  window.localStorage.clear();
  resetIncludeMovesForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('lichess-include-moves-store', () => {
  it('defaults to including the moves', () => {
    expect(readIncludeMoves()).toBe(DEFAULT_INCLUDE_MOVES);
    expect(DEFAULT_INCLUDE_MOVES).toBe(true);
  });

  it('reads the stored choice once, then serves it from memory', () => {
    window.localStorage.setItem(KEY, '0');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    expect(readIncludeMoves()).toBe(false);
    expect(readIncludeMoves()).toBe(false);
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('keeps a written choice even when storage refuses it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    writeIncludeMoves(false);
    expect(readIncludeMoves()).toBe(false);
  });

  it('falls back to the default when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readIncludeMoves()).toBe(DEFAULT_INCLUDE_MOVES);
  });

  it("picks up another tab's change and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeIncludeMoves(listener);
    expect(readIncludeMoves()).toBe(true);

    window.localStorage.setItem(KEY, '0');
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(readIncludeMoves()).toBe(false);
    unsubscribe();
  });
});
