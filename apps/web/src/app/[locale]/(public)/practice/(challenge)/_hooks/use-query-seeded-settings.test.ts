// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorageSettings } from '@/lib/persistent-settings/use-local-storage-settings';

import { useQuerySeededSettings } from './use-query-seeded-settings';

type Settings = { piece: string; speed: string };

const STORAGE_KEY = 'querySeededSettingsTest';
const DEFAULTS: Settings = { piece: 'n', speed: 'normal' };

function useSeeded(seed: Partial<Settings> | undefined) {
  return useQuerySeededSettings(useLocalStorageSettings(STORAGE_KEY, DEFAULTS), seed, ['piece']);
}

function stored(): Settings | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Settings) : null;
}

describe('useQuerySeededSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/ja/practice/route-planner/challenge?piece=bishop&x=1#s');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('overrides the stored setting the player last chose', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ piece: 'n', speed: 'fast' }));

    const { result } = renderHook(() => useSeeded({ piece: 'b' }));

    // The seed is shown from the first render, before storage has loaded.
    expect(result.current.settings.piece).toBe('b');

    await waitFor(() => expect(stored()).toEqual({ piece: 'b', speed: 'fast' }));
    expect(result.current.settings).toEqual({ piece: 'b', speed: 'fast' });
  });

  it('strips only the consumed parameters from the URL', async () => {
    renderHook(() => useSeeded({ piece: 'b' }));

    await waitFor(() =>
      expect(window.location.pathname + window.location.search + window.location.hash).toBe(
        '/ja/practice/route-planner/challenge?x=1#s'
      )
    );
  });

  it('lets the player change the setting after the seed is applied', async () => {
    const { result } = renderHook(() => useSeeded({ piece: 'b' }));
    await waitFor(() => expect(stored()?.piece).toBe('b'));

    act(() => result.current.updateSettings({ piece: 'n' }));

    expect(result.current.settings.piece).toBe('n');
    expect(stored()?.piece).toBe('n');
  });

  it('applies the seed only once, even if the caller passes a new one later', async () => {
    const { result, rerender } = renderHook(({ seed }) => useSeeded(seed), {
      initialProps: { seed: { piece: 'b' } as Partial<Settings> | undefined },
    });
    await waitFor(() => expect(stored()?.piece).toBe('b'));

    act(() => result.current.updateSettings({ piece: 'n' }));
    rerender({ seed: { piece: 'b' } });

    expect(result.current.settings.piece).toBe('n');
  });

  it('leaves stored settings and the URL alone without a seed', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ piece: 'b', speed: 'fast' }));

    const { result } = renderHook(() => useSeeded(undefined));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings).toEqual({ piece: 'b', speed: 'fast' });
    expect(window.location.search).toBe('?piece=bishop&x=1');
  });
});
