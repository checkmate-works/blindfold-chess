import { replayMoves } from '@blindfold-chess/features/chess-core';
import { describe, expect, it } from 'vitest';

import type { GameFrameSource } from './build-game-frames';
import { MAX_FRAMES, buildGameFrames, hasAnnotatableOps } from './build-game-frames';

function buildGame(overrides: Partial<GameFrameSource> = {}): GameFrameSource {
  return {
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    startingFen: null,
    setupPlies: null,
    playerColor: 'white',
    playSettings: null,
    playSettingsLog: null,
    operationLogs: null,
    undoneLogs: null,
    ...overrides,
  };
}

/** A repeatable 4-half-move cycle (both knights out and home) — legal any number of times. */
const KNIGHT_SHUFFLE = ['Nc3', 'Nc6', 'Nb1', 'Nb8'];

describe('buildGameFrames', () => {
  describe('plain', () => {
    it('renders one frame per replayed position with the classic delay schedule and no overlays', () => {
      const game = buildGame();
      const frames = buildGameFrames(game, 'plain');
      expect(frames).toHaveLength(game.moves.length + 1);
      expect(frames.map((f) => f.delayMs)).toEqual([1000, 800, 800, 800, 4000]);
      expect(frames.every((f) => f.overlay === undefined)).toBe(true);
      expect(frames.every((f) => f.displaySettings === null)).toBe(true);
    });

    it('ignores operationLogs and playSettings entirely', () => {
      const game = buildGame({
        playSettings: {
          boardVisibility: 'never',
          showOwnPieces: false,
          showOpponentPieces: false,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          pawnHideMode: 'none',
        },
        operationLogs: [
          { inputMethod: 'board', peekCount: 3, undoCount: 0, movePeekCount: 0 },
          { inputMethod: 'board', peekCount: 0, undoCount: 0, movePeekCount: 0 },
        ],
      });
      const frames = buildGameFrames(game, 'plain');
      expect(frames.every((f) => f.overlay === undefined && f.displaySettings === null)).toBe(true);
    });
  });

  describe('played — peek flash', () => {
    it('inserts a single peek frame right before the move it precedes, at the pre-move position', () => {
      const game = buildGame({
        playSettings: {
          boardVisibility: 'never',
          showOwnPieces: true,
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          pawnHideMode: 'none',
        },
        operationLogs: [{ inputMethod: 'board', peekCount: 1, undoCount: 0, movePeekCount: 0 }],
      });
      const frames = buildGameFrames(game, 'played');
      const allPositions = replayMoves(game.moves);

      // [initial, peek, after-e4, after-e5, after-Nf3, after-Nc6]
      expect(frames).toHaveLength(game.moves.length + 1 + 1);
      expect(frames[1].overlay).toEqual({ kind: 'peek' });
      expect(frames[1].fen).toBe(allPositions[0].fen);
      expect(frames[1].delayMs).toBe(800);
      // boardVisibility: 'never' folds both sides to hidden everywhere...
      expect(frames[0].displaySettings).toMatchObject({
        showOwnPieces: false,
        showOpponentPieces: false,
      });
      // ...except the peek frame, which forces boardVisibility to 'always' and
      // lets the (here, unrestricted) per-piece settings show through.
      expect(frames[1].displaySettings).toMatchObject({
        showOwnPieces: true,
        showOpponentPieces: true,
      });
      // The frame right after (the real move) goes back to hidden.
      expect(frames[2].displaySettings).toMatchObject({
        showOwnPieces: false,
        showOpponentPieces: false,
      });
    });

    it('keeps a per-piece side-hide through the peek — only whole-board visibility lifts', () => {
      const game = buildGame({
        playSettings: {
          boardVisibility: 'never',
          showOwnPieces: false, // a difficulty setting distinct from boardVisibility
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          pawnHideMode: 'none',
        },
        operationLogs: [{ inputMethod: 'board', peekCount: 1, undoCount: 0, movePeekCount: 0 }],
      });
      const frames = buildGameFrames(game, 'played');
      const peekFrame = frames.find((f) => f.overlay?.kind === 'peek');
      expect(peekFrame?.displaySettings).toMatchObject({
        showOwnPieces: false,
        showOpponentPieces: true,
      });
    });

    it('rounds any peek count to a single frame', () => {
      const game = buildGame({
        moves: ['e4'],
        operationLogs: [{ inputMethod: 'board', peekCount: 3, undoCount: 0, movePeekCount: 0 }],
      });
      const frames = buildGameFrames(game, 'played');
      const peekFrames = frames.filter((f) => f.overlay?.kind === 'peek');
      expect(peekFrames).toHaveLength(1);
    });

    it('aligns correctly for a black-side player with a setup prefix', () => {
      // setupPlies=2: e4/e5 were pre-played; black's logged move is Nc6 (moves index 3).
      const game = buildGame({
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
        setupPlies: 2,
        playerColor: 'black',
        operationLogs: [{ inputMethod: 'board', peekCount: 1, undoCount: 0, movePeekCount: 0 }],
      });
      const frames = buildGameFrames(game, 'played');
      const allPositions = replayMoves(game.moves);

      const peekIdx = frames.findIndex((f) => f.overlay?.kind === 'peek');
      expect(peekIdx).toBeGreaterThan(-1);
      expect(frames[peekIdx].fen).toBe(allPositions[3].fen);
      // The frame right after the peek is the real position after Nc6 (halfMoveIndex 4).
      expect(frames[peekIdx + 1].fen).toBe(allPositions[4].fen);
    });

    it('produces zero annotations for legacy games with no operationLogs', () => {
      const game = buildGame({ operationLogs: null });
      const frames = buildGameFrames(game, 'played');
      expect(frames).toHaveLength(game.moves.length + 1);
      expect(frames.every((f) => f.overlay === undefined)).toBe(true);
    });
  });

  describe('frame budget', () => {
    it('never truncates real positions to make room for annotations, and drops only the later slots', () => {
      const moveCount = 200;
      const moves = Array.from({ length: moveCount }, (_, i) => KNIGHT_SHUFFLE[i % 4]);
      const playerMoveCount = moveCount / 2; // white moves at every even half-move index

      const game = buildGame({
        moves,
        operationLogs: Array.from({ length: playerMoveCount }, () => ({
          inputMethod: 'board' as const,
          peekCount: 1,
          undoCount: 0,
          movePeekCount: 0,
        })),
      });

      const frames = buildGameFrames(game, 'played');
      const realFrameCount = moveCount + 1; // 201, under MAX_FRAMES on its own
      const expectedAnnotations = MAX_FRAMES - realFrameCount; // budget-limited, not playerMoveCount

      expect(frames).toHaveLength(MAX_FRAMES);
      expect(frames.filter((f) => f.overlay?.kind === 'peek')).toHaveLength(expectedAnnotations);

      // Every real position frame (no overlay) must still be present — none sacrificed for budget.
      const realFramesInOutput = frames.filter((f) => f.overlay === undefined);
      expect(realFramesInOutput).toHaveLength(realFrameCount);
    });
  });
});

describe('hasAnnotatableOps', () => {
  it('is false for null/empty logs', () => {
    expect(hasAnnotatableOps(null)).toBe(false);
    expect(hasAnnotatableOps(undefined)).toBe(false);
    expect(hasAnnotatableOps([])).toBe(false);
  });

  it('is true when any log has a peek, undo, or invalid attempt', () => {
    expect(
      hasAnnotatableOps([{ inputMethod: 'board', peekCount: 1, undoCount: 0, movePeekCount: 0 }])
    ).toBe(true);
    expect(
      hasAnnotatableOps([{ inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 }])
    ).toBe(true);
    expect(
      hasAnnotatableOps([
        { inputMethod: 'board', peekCount: 0, undoCount: 0, movePeekCount: 0, invalidCount: 1 },
      ])
    ).toBe(true);
  });

  it('ignores movePeekCount (legal-move hints are not drawn)', () => {
    expect(
      hasAnnotatableOps([{ inputMethod: 'board', peekCount: 0, undoCount: 0, movePeekCount: 5 }])
    ).toBe(false);
  });
});
