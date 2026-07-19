import { describe, expect, it } from 'vitest';

import { isConstrainedPlaySettings, maintainedHiddenBoard } from './play-settings-constraint';
import type { GamePlaySettings, PlaySettingsChangeEntry } from './saved-game-types';

const SIGHTED: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

describe('isConstrainedPlaySettings', () => {
  it('rejects a fully sighted game — the one case that is not a constraint', () => {
    expect(isConstrainedPlaySettings(SIGHTED)).toBe(false);
  });

  it.each([
    ['board on peek (the app default)', { boardVisibility: 'peek' }],
    ['board never shown', { boardVisibility: 'never' }],
    ['own pieces hidden', { showOwnPieces: false }],
    ['opponent pieces hidden', { showOpponentPieces: false }],
    ['pawns hidden', { pawnHideMode: 'all' }],
    ['only own pawns hidden', { pawnHideMode: 'own' }],
    ['pieces drawn as circles', { pieceShapeMode: 'circles-all' }],
    ['piece colours flattened', { pieceColors: 'white-only' }],
  ] as [string, Partial<GamePlaySettings>][])('counts %s as a constraint', (_label, override) => {
    expect(isConstrainedPlaySettings({ ...SIGHTED, ...override })).toBe(true);
  });

  it('counts the untouched defaults as a constraint', () => {
    // The bar is low by design: `boardVisibility` defaults to 'peek', so a
    // player who changes nothing already qualifies. Pinned so that a future
    // change to the defaults surfaces here rather than silently making 1kyu
    // unreachable (or trivially reachable).
    expect(isConstrainedPlaySettings({ ...SIGHTED, boardVisibility: 'peek' })).toBe(true);
  });

  it('treats missing settings as unconstrained', () => {
    // null covers legacy rows, games published before the column existed, and
    // blobs that failed validation at publish time — indistinguishable, so an
    // unknown game must not earn the rank.
    expect(isConstrainedPlaySettings(null)).toBe(false);
    expect(isConstrainedPlaySettings(undefined)).toBe(false);
  });
});

describe('maintainedHiddenBoard', () => {
  it('rejects a game that started fully sighted', () => {
    expect(maintainedHiddenBoard(SIGHTED, null)).toBe(false);
  });

  it.each(['peek', 'never'] as const)(
    'accepts a game that started and stayed on "%s" with no log',
    (boardVisibility) => {
      expect(maintainedHiddenBoard({ ...SIGHTED, boardVisibility }, null)).toBe(true);
    }
  );

  it('accepts a game whose log only touches unrelated keys', () => {
    const log: PlaySettingsChangeEntry[] = [{ atMoveIndex: 3, key: 'pieceColors', to: 'normal' }];
    expect(maintainedHiddenBoard({ ...SIGHTED, boardVisibility: 'never' }, log)).toBe(true);
  });

  it('accepts a game whose board visibility changed but never back to "always"', () => {
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 2, key: 'boardVisibility', to: 'peek' },
      { atMoveIndex: 6, key: 'boardVisibility', to: 'never' },
    ];
    expect(maintainedHiddenBoard({ ...SIGHTED, boardVisibility: 'peek' }, log)).toBe(true);
  });

  it('rejects a game that started hidden but was revealed mid-game', () => {
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 5, key: 'boardVisibility', to: 'always' },
    ];
    expect(maintainedHiddenBoard({ ...SIGHTED, boardVisibility: 'peek' }, log)).toBe(false);
  });

  it('rejects a game revealed mid-game even if hidden again afterward', () => {
    const log: PlaySettingsChangeEntry[] = [
      { atMoveIndex: 3, key: 'boardVisibility', to: 'always' },
      { atMoveIndex: 8, key: 'boardVisibility', to: 'never' },
    ];
    expect(maintainedHiddenBoard({ ...SIGHTED, boardVisibility: 'peek' }, log)).toBe(false);
  });

  it('treats missing settings as not eligible', () => {
    expect(maintainedHiddenBoard(null, null)).toBe(false);
    expect(maintainedHiddenBoard(undefined, null)).toBe(false);
  });
});
