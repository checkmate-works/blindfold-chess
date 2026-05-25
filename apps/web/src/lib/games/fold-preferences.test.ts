import { describe, expect, it } from 'vitest';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { foldPreferences } from './fold-preferences';
import type { PreferenceChangeLogEntry } from './saved-game-types';

const initial: PerGamePreferences = {
  showBoardButtonInGame: true,
  highlightLastMove: true,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  peekMode: 'modal',
};

describe('foldPreferences', () => {
  it('returns a structural copy of the initial snapshot when the log is undefined', () => {
    const result = foldPreferences(initial, undefined);
    expect(result).toEqual(initial);
    expect(result).not.toBe(initial);
  });

  it('returns a structural copy of the initial snapshot when the log is empty', () => {
    const result = foldPreferences(initial, []);
    expect(result).toEqual(initial);
    expect(result).not.toBe(initial);
  });

  it('applies a single boolean change', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 4, key: 'highlightLastMove', from: true, to: false },
    ];
    expect(foldPreferences(initial, log)).toEqual({ ...initial, highlightLastMove: false });
  });

  it('applies a single enum change', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 2, key: 'pieceColors', from: 'normal', to: 'white-only' },
    ];
    expect(foldPreferences(initial, log)).toEqual({ ...initial, pieceColors: 'white-only' });
  });

  it('composes changes across multiple keys', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 1, key: 'showOwnPieces', from: true, to: false },
      { atMoveIndex: 3, key: 'pieceShapeMode', from: 'normal', to: 'circles-all' },
    ];
    expect(foldPreferences(initial, log)).toEqual({
      ...initial,
      showOwnPieces: false,
      pieceShapeMode: 'circles-all',
    });
  });

  it('lets the last entry win when the same key is changed multiple times', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 1, key: 'pieceColors', from: 'normal', to: 'white-only' },
      { atMoveIndex: 4, key: 'pieceColors', from: 'white-only', to: 'black-only' },
    ];
    expect(foldPreferences(initial, log).pieceColors).toBe('black-only');
  });

  it('returns the initial value when a key is toggled back to its original', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 1, key: 'showOpponentPieces', from: true, to: false },
      { atMoveIndex: 5, key: 'showOpponentPieces', from: false, to: true },
    ];
    expect(foldPreferences(initial, log).showOpponentPieces).toBe(true);
  });

  it('applies a peekMode change', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 3, key: 'peekMode', from: 'modal', to: 'inline' },
    ];
    expect(foldPreferences(initial, log).peekMode).toBe('inline');
  });

  it('does not mutate the initial snapshot', () => {
    const snapshot = { ...initial };
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 2, key: 'highlightLastMove', from: true, to: false },
    ];
    foldPreferences(initial, log);
    expect(initial).toEqual(snapshot);
  });
});
