import React from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useRecallPreferences } from './use-recall-preferences';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(GamePreferencesProvider, null, children);
}

function setup(currentMoveIndex = 0) {
  return renderHook(
    ({ idx }) => useRecallPreferences({ gameId: undefined, currentMoveIndex: idx }),
    { wrapper, initialProps: { idx: currentMoveIndex } }
  );
}

describe('useRecallPreferences change log', () => {
  it('seeds the initial play-settings snapshot once hydrated', () => {
    const { result } = setup();

    // No gameId → seeded straight from the global defaults.
    expect(result.current.initialPlaySettings).toMatchObject({
      boardVisibility: 'peek',
      showOwnPieces: true,
      showOpponentPieces: true,
    });
    expect(result.current.preferenceChangeLog).toEqual([]);
  });

  it('records a display-setting edit with the current half-move as anchor', () => {
    const { result, rerender } = setup(0);
    rerender({ idx: 3 });

    act(() => result.current.handlePerGamePrefChange('boardVisibility', 'never'));

    expect(result.current.preferences.boardVisibility).toBe('never');
    expect(result.current.preferenceChangeLog).toEqual([
      { atMoveIndex: 3, key: 'boardVisibility', to: 'never' },
    ]);
  });

  it('skips a write that does not change the value', () => {
    const { result } = setup();

    act(() => result.current.handlePerGamePrefChange('boardVisibility', 'peek'));

    expect(result.current.preferenceChangeLog).toEqual([]);
  });

  it('does not log non-display keys, but still applies them', () => {
    const { result } = setup();

    act(() => result.current.handlePerGamePrefChange('highlightLastMove', false));

    expect(result.current.preferences.highlightLastMove).toBe(false);
    expect(result.current.preferenceChangeLog).toEqual([]);
  });

  it('accumulates successive edits in order', () => {
    const { result, rerender } = setup(0);

    act(() => result.current.handlePerGamePrefChange('showOwnPieces', false));
    rerender({ idx: 2 });
    act(() => result.current.handlePerGamePrefChange('showOwnPieces', true));

    expect(result.current.preferenceChangeLog).toEqual([
      { atMoveIndex: 0, key: 'showOwnPieces', to: false },
      { atMoveIndex: 2, key: 'showOwnPieces', to: true },
    ]);
  });
});
