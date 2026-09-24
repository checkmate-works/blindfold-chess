// @vitest-environment jsdom
import React from 'react';

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  GamePreferencesProvider,
  useGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  type DifficultyPresetSettings,
  matchDifficultyPreset,
} from './difficulty-presets';
import { getAvailableShapeOptions } from './piece-appearance-model';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('DIFFICULTY_PRESETS', () => {
  it('matches every rung back to itself', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(matchDifficultyPreset(DIFFICULTY_PRESETS[level])).toBe(level);
    }
  });

  it('keeps stones and single colour off on every rung', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(DIFFICULTY_PRESETS[level].pieceShapeMode).toBe('normal');
      expect(DIFFICULTY_PRESETS[level].pieceColors).toBe('normal');
    }
  });

  it('never leaves both sides hidden (a state the piece-visibility radio cannot show)', () => {
    for (const level of DIFFICULTY_LEVELS) {
      const preset = DIFFICULTY_PRESETS[level];
      expect(preset.showOwnPieces || preset.showOpponentPieces).toBe(true);
      // And the shape it writes is valid for the visibility it writes, so the
      // settings panel's stones realignment never fires right after applying.
      expect(getAvailableShapeOptions(preset)).toContain(preset.pieceShapeMode);
    }
  });

  it('climbs from level 3 to level 4 via the "Hide pawns" toggle value', () => {
    expect(matchDifficultyPreset({ ...DIFFICULTY_PRESETS[3], pawnHideMode: 'all' })).toBe(4);
  });
});

describe('matchDifficultyPreset', () => {
  const level2 = DIFFICULTY_PRESETS[2];

  it.each<[string, Partial<DifficultyPresetSettings>]>([
    ['stones on', { pieceShapeMode: 'circles-all' }],
    ['single colour', { pieceColors: 'white-only' }],
    ['own pieces hidden', { showOwnPieces: false }],
    ['own pawns hidden only', { pawnHideMode: 'own' }],
  ])('reads as Custom when a peek board has %s', (_label, override) => {
    expect(matchDifficultyPreset({ ...level2, ...override })).toBeNull();
  });

  it('reads as Custom for an always-visible board with hidden pawns', () => {
    expect(matchDifficultyPreset({ ...DIFFICULTY_PRESETS[1], pawnHideMode: 'all' })).toBeNull();
  });

  it('ignores piece-appearance fields once the board is never shown', () => {
    expect(
      matchDifficultyPreset({
        boardVisibility: 'never',
        showOwnPieces: true,
        showOpponentPieces: false,
        pieceShapeMode: 'circles-own',
        pieceColors: 'black-only',
        pawnHideMode: 'all',
      })
    ).toBe(5);
  });

  it('ignores fields that are not part of a preset', () => {
    expect(
      matchDifficultyPreset({
        ...DIFFICULTY_PRESETS[3],
        highlightLastMove: false,
        showPieceDestinations: false,
      } as DifficultyPresetSettings)
    ).toBe(3);
  });
});

describe('first-time player defaults', () => {
  it('sit on level 2 (peek on demand)', () => {
    const { result } = renderHook(() => useGamePreferences(), {
      wrapper: ({ children }) => React.createElement(GamePreferencesProvider, null, children),
    });
    expect(matchDifficultyPreset(result.current.preferences)).toBe(2);
  });
});
