import { describe, expect, it } from 'vitest';

import {
  gameUsedNotablePlaySettings,
  normalizePlaySettingsLog,
  playSettingsAreNotable,
  playSettingsAtHalfMove,
} from './play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from './saved-game-types';

const DEFAULT_SETTINGS: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
};

describe('normalizePlaySettingsLog', () => {
  it('returns null for non-array / empty input', () => {
    expect(normalizePlaySettingsLog(undefined, 10)).toBeNull();
    expect(normalizePlaySettingsLog(null, 10)).toBeNull();
    expect(normalizePlaySettingsLog('nope', 10)).toBeNull();
    expect(normalizePlaySettingsLog([], 10)).toBeNull();
  });

  it('keeps only display keys with valid values and in-range integer anchors', () => {
    const result = normalizePlaySettingsLog(
      [
        { atMoveIndex: 0, key: 'boardVisibility', from: 'always', to: 'peek' },
        { atMoveIndex: 4, key: 'showOwnPieces', from: true, to: false },
        { atMoveIndex: 10, key: 'pieceColors', from: 'normal', to: 'white-only' },
        { atMoveIndex: 11, key: 'boardVisibility', to: 'never' }, // out of range
        { atMoveIndex: 2, key: 'moveInputMode', to: 'button' }, // non-display key
        { atMoveIndex: 2, key: 'boardVisibility', to: 'upside-down' }, // bad value
      ],
      10
    );
    expect(result).toEqual([
      { atMoveIndex: 0, key: 'boardVisibility', to: 'peek' },
      { atMoveIndex: 4, key: 'showOwnPieces', to: false },
      { atMoveIndex: 10, key: 'pieceColors', to: 'white-only' },
    ]);
  });
});

describe('playSettingsAtHalfMove', () => {
  const log: PlaySettingsChangeEntry[] = [
    { atMoveIndex: 0, key: 'boardVisibility', to: 'peek' },
    { atMoveIndex: 6, key: 'showOpponentPieces', to: false },
    { atMoveIndex: 6, key: 'boardVisibility', to: 'never' },
  ];

  it('returns a copy of the snapshot when the log is empty / missing', () => {
    const at = playSettingsAtHalfMove(DEFAULT_SETTINGS, null, 5);
    expect(at).toEqual(DEFAULT_SETTINGS);
    expect(at).not.toBe(DEFAULT_SETTINGS);
  });

  it('applies only entries at or before the displayed half-move', () => {
    // At the opening board (0 half-moves) only the atMoveIndex:0 change applies.
    expect(playSettingsAtHalfMove(DEFAULT_SETTINGS, log, 0)).toMatchObject({
      boardVisibility: 'peek',
      showOpponentPieces: true,
    });
    // Before move 6, the opponent-hide and the never-show changes are not yet active.
    expect(playSettingsAtHalfMove(DEFAULT_SETTINGS, log, 5)).toMatchObject({
      boardVisibility: 'peek',
      showOpponentPieces: true,
    });
    // From half-move 6 on, both apply (later entry wins for boardVisibility).
    expect(playSettingsAtHalfMove(DEFAULT_SETTINGS, log, 6)).toMatchObject({
      boardVisibility: 'never',
      showOpponentPieces: false,
    });
  });
});

describe('playSettingsAreNotable / gameUsedNotablePlaySettings', () => {
  it('treats a fully-sighted standard snapshot as not notable', () => {
    expect(playSettingsAreNotable(DEFAULT_SETTINGS)).toBe(false);
  });

  it('treats any deviation as notable', () => {
    expect(playSettingsAreNotable({ ...DEFAULT_SETTINGS, boardVisibility: 'never' })).toBe(true);
    expect(playSettingsAreNotable({ ...DEFAULT_SETTINGS, showOwnPieces: false })).toBe(true);
    expect(playSettingsAreNotable({ ...DEFAULT_SETTINGS, pieceShapeMode: 'circles-all' })).toBe(
      true
    );
  });

  it('flags a game that started sighted but changed settings mid-game', () => {
    expect(gameUsedNotablePlaySettings(DEFAULT_SETTINGS, null)).toBe(false);
    expect(
      gameUsedNotablePlaySettings(DEFAULT_SETTINGS, [
        { atMoveIndex: 4, key: 'boardVisibility', to: 'never' },
      ])
    ).toBe(true);
  });
});
