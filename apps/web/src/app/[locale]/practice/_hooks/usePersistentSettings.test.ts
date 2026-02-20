import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePersistentSettings } from './usePersistentSettings';

describe('usePersistentSettings', () => {
  const storageKey = 'test_settings';
  const defaults = { timeLimit: 60, mode: 'timed' as const };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentSettings(storageKey, defaults));
    expect(result.current.settings).toEqual(defaults);
    expect(result.current.isLoaded).toBe(true);
  });

  it('loads saved settings from localStorage', () => {
    localStorage.setItem(storageKey, JSON.stringify({ timeLimit: 30 }));

    const { result } = renderHook(() => usePersistentSettings(storageKey, defaults));
    expect(result.current.settings.timeLimit).toBe(30);
    expect(result.current.settings.mode).toBe('timed');
  });

  it('updates settings and saves to localStorage', () => {
    const { result } = renderHook(() => usePersistentSettings(storageKey, defaults));

    act(() => {
      result.current.updateSettings({ timeLimit: 120 });
    });

    expect(result.current.settings.timeLimit).toBe(120);
    expect(result.current.settings.mode).toBe('timed');

    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    expect(stored.timeLimit).toBe(120);
  });

  it('ignores invalid JSON in localStorage', () => {
    localStorage.setItem(storageKey, 'not-json');

    const { result } = renderHook(() => usePersistentSettings(storageKey, defaults));
    expect(result.current.settings).toEqual(defaults);
  });
});
