import { describe, expect, it } from 'vitest';

import type { GameFrameSource } from './build-game-frames';
import { buildGameFrames } from './build-game-frames';
import { PREVIEW_MAX_FRAMES, buildGamePreviewFrames, hasPlayedGifVariant } from './preview-frames';

function buildGame(overrides: Partial<GameFrameSource> = {}): GameFrameSource {
  return {
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    startingFen: null,
    setupPlies: null,
    playerColor: 'white',
    result: 'draw',
    playSettings: null,
    playSettingsLog: null,
    operationLogs: null,
    undoneLogs: null,
    ...overrides,
  };
}

/** A repeatable 4-half-move cycle (both knights out and home) — legal any number of times. */
const KNIGHT_SHUFFLE = ['Nc3', 'Nc6', 'Nb1', 'Nb8'];

const BLIND_SETTINGS: NonNullable<GameFrameSource['playSettings']> = {
  boardVisibility: 'never',
  showOwnPieces: false,
  showOpponentPieces: false,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

describe('buildGamePreviewFrames', () => {
  it('is the leading slice of the real GIF sequence — same frames, same delays', () => {
    const game = buildGame({ moves: Array.from({ length: 40 }, (_, i) => KNIGHT_SHUFFLE[i % 4]) });
    const full = buildGameFrames(game, 'plain');
    const preview = buildGamePreviewFrames(game, 'plain');

    expect(full.length).toBeGreaterThan(PREVIEW_MAX_FRAMES);
    expect(preview).toHaveLength(PREVIEW_MAX_FRAMES);
    // The pitch is "this is your GIF" — a preview frame that drifted from the
    // file's would make that a lie.
    expect(preview).toEqual(full.slice(0, PREVIEW_MAX_FRAMES));
  });

  it('returns a short game whole, keeping its closing beat and termination mark', () => {
    const game = buildGame({ moves: ['f3', 'e5', 'g4', 'Qh4#'], result: 'loss' });
    const preview = buildGamePreviewFrames(game, 'plain');

    expect(preview).toHaveLength(5);
    expect(preview[preview.length - 1].delayMs).toBe(4000);
    expect(preview[preview.length - 1].terminationMark).not.toBeNull();
  });

  it('carries the played variant’s annotations when they land in the previewed prefix', () => {
    const game = buildGame({
      playSettings: BLIND_SETTINGS,
      operationLogs: [
        { inputMethod: 'board', peekCount: 1, undoCount: 0, movePeekCount: 0 },
        { inputMethod: 'board', peekCount: 0, undoCount: 0, movePeekCount: 0 },
      ],
    });
    const preview = buildGamePreviewFrames(game, 'played');

    expect(preview.some((f) => f.overlay?.kind === 'peek')).toBe(true);
  });
});

describe('hasPlayedGifVariant', () => {
  it('is false for a fully-sighted game with no annotatable operations', () => {
    expect(hasPlayedGifVariant(buildGame())).toBe(false);
  });

  it('is true when the blindfold settings themselves did something', () => {
    expect(hasPlayedGifVariant(buildGame({ playSettings: BLIND_SETTINGS }))).toBe(true);
  });

  it('is true for a sighted game that still left a trace (a peek, undo, or typo)', () => {
    expect(
      hasPlayedGifVariant(
        buildGame({
          operationLogs: [
            { inputMethod: 'board', peekCount: 0, undoCount: 0, movePeekCount: 0, invalidCount: 2 },
          ],
        })
      )
    ).toBe(true);
  });
});
