import { describe, expect, it } from 'vitest';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { Game, PreferenceChangeLogEntry } from './saved-game-types';
import { toReviewData } from './to-review-data';

function buildGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'local-1',
    date: '2026-07-02',
    moves: ['e4', 'e5'],
    playerColor: 'white',
    engineConfig: { kind: 'stockfish', skillLevel: 5 },
    status: 'win',
    ...overrides,
  } as Game;
}

const fullPrefs: PerGamePreferences = {
  boardVisibility: 'never',
  showOwnPieces: true,
  showOpponentPieces: false,
  pieceShapeMode: 'unified',
  pieceColors: 'monochrome',
  pawnHideMode: 'own',
  // Non-display keys that must NOT leak into playSettings.
  highlightLastMove: true,
  showPieceDestinations: true,
  moveInputMode: 'text',
} as unknown as PerGamePreferences;

describe('toReviewData', () => {
  it('carries the immutable snapshot through unchanged', () => {
    const game = buildGame({ moves: ['d4', 'd5', 'c4'], startingFen: 'fen', playerColor: 'black' });
    const data = toReviewData(game);
    expect(data.moves).toEqual(['d4', 'd5', 'c4']);
    expect(data.startingFen).toBe('fen');
    expect(data.playerColor).toBe('black');
    expect(data.engineConfig).toEqual({ kind: 'stockfish', skillLevel: 5 });
  });

  it('defaults absent optionals to null (legacy game)', () => {
    const data = toReviewData(buildGame());
    expect(data.startingFen).toBeNull();
    expect(data.operationLogs).toBeNull();
    expect(data.playSettings).toBeNull();
    expect(data.playSettingsLog).toBeNull();
  });

  it('projects gamePreferences onto the display-only playSettings subset', () => {
    const data = toReviewData(buildGame({ gamePreferences: fullPrefs }));
    expect(data.playSettings).toEqual({
      boardVisibility: 'never',
      showOwnPieces: true,
      showOpponentPieces: false,
      pieceShapeMode: 'unified',
      pieceColors: 'monochrome',
      pawnHideMode: 'own',
    });
    // Non-display keys are dropped.
    expect(data.playSettings).not.toHaveProperty('highlightLastMove');
    expect(data.playSettings).not.toHaveProperty('moveInputMode');
  });

  it("defaults a missing pawnHideMode to 'none'", () => {
    const { pawnHideMode: _omit, ...noPawnHide } = fullPrefs;
    const data = toReviewData(
      buildGame({ gamePreferences: noPawnHide as unknown as PerGamePreferences })
    );
    expect(data.playSettings?.pawnHideMode).toBe('none');
  });

  it('narrows the change log to display keys, to-only', () => {
    const log: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 2, key: 'boardVisibility', from: 'never', to: 'always' },
      { atMoveIndex: 4, key: 'showOwnPieces', from: false, to: true },
      // Non-display keys must be filtered out.
      { atMoveIndex: 6, key: 'highlightLastMove', from: false, to: true },
      { atMoveIndex: 8, key: 'moveInputMode', from: 'text', to: 'select' },
    ] as unknown as PreferenceChangeLogEntry[];
    const data = toReviewData(buildGame({ preferenceChangeLog: log }));
    expect(data.playSettingsLog).toEqual([
      { atMoveIndex: 2, key: 'boardVisibility', to: 'always' },
      { atMoveIndex: 4, key: 'showOwnPieces', to: true },
    ]);
  });
});
