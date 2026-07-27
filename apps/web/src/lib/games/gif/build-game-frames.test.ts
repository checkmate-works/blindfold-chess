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

  describe('played — illegal-attempt red frames', () => {
    it('inserts an illegal + revert frame pair per recoverable attempt, keeping the as-played hide (no reveal)', () => {
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
          {
            inputMethod: 'text',
            peekCount: 0,
            undoCount: 0,
            movePeekCount: 0,
            invalidCount: 1,
            invalidAttempts: ['Nf3'],
          },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      const allPositions = replayMoves(game.moves);

      // [initial, illegal, revert, after-e4, ...]
      expect(frames).toHaveLength(game.moves.length + 1 + 2);
      expect(frames[1].overlay).toEqual({ kind: 'illegal', to: 'f3', from: undefined });
      expect(frames[1].fen).toBe(allPositions[0].fen);
      expect(frames[1].delayMs).toBe(500);
      expect(frames[1].displaySettings).toMatchObject({
        showOwnPieces: false,
        showOpponentPieces: false,
      });
      expect(frames[2].overlay).toBeUndefined();
      expect(frames[2].fen).toBe(allPositions[0].fen);
      expect(frames[2].delayMs).toBe(250);
      expect(frames[2].displaySettings).toMatchObject({
        showOwnPieces: false,
        showOpponentPieces: false,
      });
    });

    it('recovers the origin square for a board coordinate-long-form attempt', () => {
      const game = buildGame({
        operationLogs: [
          {
            inputMethod: 'board',
            peekCount: 0,
            undoCount: 0,
            movePeekCount: 0,
            invalidCount: 1,
            invalidAttempts: ['e2-e4'],
          },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      const illegal = frames.find((f) => f.overlay?.kind === 'illegal');
      expect(illegal?.overlay).toEqual({ kind: 'illegal', to: 'e4', from: 'e2' });
    });

    it('draws only the first 3 recoverable attempts, front to back', () => {
      const game = buildGame({
        operationLogs: [
          {
            inputMethod: 'text',
            peekCount: 0,
            undoCount: 0,
            movePeekCount: 0,
            invalidCount: 4,
            invalidAttempts: ['Nf3', 'Nc3', 'Bb5', 'Qh5'],
          },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      const illegalTargets = frames
        .filter((f) => f.overlay?.kind === 'illegal')
        .map((f) => (f.overlay as { to?: string }).to);
      expect(illegalTargets).toEqual(['f3', 'c3', 'b5']);
    });

    it('silently skips attempts that cannot be parsed into a square', () => {
      const game = buildGame({
        operationLogs: [
          {
            inputMethod: 'text',
            peekCount: 0,
            undoCount: 0,
            movePeekCount: 0,
            invalidCount: 1,
            invalidAttempts: ['not a move'],
          },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.some((f) => f.overlay?.kind === 'illegal')).toBe(false);
      expect(frames).toHaveLength(game.moves.length + 1);
    });

    it('draws nothing for legacy invalidCount-only entries with no attempts text', () => {
      const game = buildGame({
        operationLogs: [
          { inputMethod: 'board', peekCount: 0, undoCount: 0, movePeekCount: 0, invalidCount: 2 },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.some((f) => f.overlay?.kind === 'illegal')).toBe(false);
      expect(frames).toHaveLength(game.moves.length + 1);
    });

    it('orders peek before illegal attempts within the same slot', () => {
      const game = buildGame({
        operationLogs: [
          {
            inputMethod: 'text',
            peekCount: 1,
            undoCount: 0,
            movePeekCount: 0,
            invalidCount: 1,
            invalidAttempts: ['Nf3'],
          },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      const kinds = frames.map((f) => f.overlay?.kind ?? 'real');
      // [real(initial), peek, illegal, real(no overlay, the revert frame), real(after e4), ...]
      expect(kinds.slice(0, 4)).toEqual(['real', 'peek', 'illegal', 'real']);
    });
  });

  describe('played — undo badge', () => {
    it('inserts a single undo-badge frame at the pre-move position, keeping the as-played hide', () => {
      const game = buildGame({
        playSettings: {
          boardVisibility: 'never',
          showOwnPieces: false,
          showOpponentPieces: false,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          pawnHideMode: 'none',
        },
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 }],
      });
      const frames = buildGameFrames(game, 'played');
      const allPositions = replayMoves(game.moves);

      expect(frames).toHaveLength(game.moves.length + 1 + 1);
      expect(frames[1].overlay).toEqual({ kind: 'undo' });
      expect(frames[1].fen).toBe(allPositions[0].fen);
      expect(frames[1].delayMs).toBe(600);
      expect(frames[1].displaySettings).toMatchObject({
        showOwnPieces: false,
        showOpponentPieces: false,
      });
    });

    it('rounds any undo count to a single frame', () => {
      const game = buildGame({
        moves: ['e4'],
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 2, movePeekCount: 0 }],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.filter((f) => f.overlay?.kind === 'undo')).toHaveLength(1);
    });

    it('orders undo before peek and illegal attempts within the same slot', () => {
      const game = buildGame({
        operationLogs: [
          {
            inputMethod: 'text',
            peekCount: 1,
            undoCount: 1,
            movePeekCount: 0,
            invalidCount: 1,
            invalidAttempts: ['Nf3'],
          },
        ],
      });
      const frames = buildGameFrames(game, 'played');
      const kinds = frames.map((f) => f.overlay?.kind ?? 'real');
      // [real(initial), undo, peek, illegal, real(revert), real(after e4), ...]
      expect(kinds.slice(0, 5)).toEqual(['real', 'undo', 'peek', 'illegal', 'real']);
    });
  });

  describe('played — undo reenactment', () => {
    const minimalLog = {
      inputMethod: 'board' as const,
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
    };

    it('reenacts a retracted move whose SAN survived, then snaps back with the undo badge', () => {
      const game = buildGame({
        moves: ['e4', 'e5'],
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 }],
        undoneLogs: [{ index: 0, log: minimalLog, sans: ['Nf3', 'Nc6'] }],
      });
      const frames = buildGameFrames(game, 'played');
      const allPositions = replayMoves(game.moves);

      // [initial, reenact-Nf3, revert(undo badge), after-e4, after-e5]
      expect(frames).toHaveLength(game.moves.length + 1 + 2);
      expect(frames[1].overlay).toBeUndefined();
      expect(frames[1].lastMove).toEqual({ from: 'g1', to: 'f3' });
      expect(frames[1].delayMs).toBe(700);
      expect(frames[2].overlay).toEqual({ kind: 'undo' });
      expect(frames[2].fen).toBe(allPositions[0].fen);
      expect(frames[2].delayMs).toBe(600);
    });

    it('never reenacts the AI reply (sans[1]) — only the retracted player move', () => {
      const game = buildGame({
        moves: ['e4', 'e5'],
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 }],
        undoneLogs: [{ index: 0, log: minimalLog, sans: ['Nf3', 'Nc6'] }],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.filter((f) => f.delayMs === 700)).toHaveLength(1);
    });

    it('falls back to a plain badge for a legacy entry with no sans', () => {
      const game = buildGame({
        moves: ['e4'],
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 }],
        undoneLogs: [{ index: 0, log: minimalLog }],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.some((f) => f.delayMs === 700)).toBe(false);
      expect(frames.filter((f) => f.overlay?.kind === 'undo')).toHaveLength(1);
    });

    it('falls back to a plain badge when the retracted SAN is illegal against the pre-move position', () => {
      const game = buildGame({
        moves: ['e4'],
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 }],
        // Qxh8 is not a legal move from the starting position.
        undoneLogs: [{ index: 0, log: minimalLog, sans: ['Qxh8'] }],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.some((f) => f.delayMs === 700)).toBe(false);
      expect(frames.filter((f) => f.overlay?.kind === 'undo')).toHaveLength(1);
    });

    it('reenacts every archived undo for the same slot, up to 2', () => {
      const game = buildGame({
        moves: ['e4'],
        operationLogs: [{ inputMethod: 'board', peekCount: 0, undoCount: 2, movePeekCount: 0 }],
        undoneLogs: [
          { index: 0, log: minimalLog, sans: ['Nf3', 'Nc6'] },
          { index: 0, log: minimalLog, sans: ['Nc3', 'Nc6'] },
          { index: 0, log: minimalLog, sans: ['Nh3', 'Nc6'] }, // 3rd — beyond the cap
        ],
      });
      const frames = buildGameFrames(game, 'played');
      expect(frames.filter((f) => f.delayMs === 700)).toHaveLength(2);
      expect(frames.filter((f) => f.overlay?.kind === 'undo')).toHaveLength(2);
    });

    it('matches archived entries by logIndex, not by slot order — a mismatched entry falls back to a badge', () => {
      const game = buildGame({
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
        operationLogs: [
          // Both slots recorded an undo, but only logIndex 1 has an archived SAN.
          { inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 },
          { inputMethod: 'board', peekCount: 0, undoCount: 1, movePeekCount: 0 },
        ],
        undoneLogs: [{ index: 1, log: minimalLog, sans: ['Nc3', 'Nf6'] }],
      });
      const frames = buildGameFrames(game, 'played');
      const undoBadges = frames.filter((f) => f.overlay?.kind === 'undo');
      const reenacts = frames.filter((f) => f.delayMs === 700);
      expect(undoBadges).toHaveLength(2); // both slots visualize the undo...
      expect(reenacts).toHaveLength(1); // ...but only logIndex 1 reenacts.
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
