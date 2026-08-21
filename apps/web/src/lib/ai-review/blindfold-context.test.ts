import { describe, expect, it } from 'vitest';

import type { MoveAnalysis } from '@/lib/games/analysis/types';
import type { GamePlaySettings, MoveOperationLog } from '@/lib/games/saved-game-types';

import type { BlindfoldContextSource } from './blindfold-context';
import { buildBlindfoldContext, keepMoveShapedAttempts } from './blindfold-context';

const HIDDEN: GamePlaySettings = {
  boardVisibility: 'never',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

const SIGHTED: GamePlaySettings = { ...HIDDEN, boardVisibility: 'always' };

function analysis(ply: number, cpLoss = 0): MoveAnalysis {
  return {
    ply,
    san: 'e4',
    moveNumber: Math.floor(ply / 2) + 1,
    color: ply % 2 === 0 ? 'white' : 'black',
    evalBefore: 0,
    evalAfter: -cpLoss,
    cpLoss,
    bestMoveSan: null,
    judgment: cpLoss > 0 ? 'mistake' : 'best',
  };
}

/** Standard-start analyses for `plies` half-moves, with per-ply losses. */
function analysesOf(plies: number, loss: (ply: number) => number = () => 0): MoveAnalysis[] {
  return Array.from({ length: plies }, (_, ply) => analysis(ply, loss(ply)));
}

function log(overrides: Partial<MoveOperationLog> = {}): MoveOperationLog {
  return { inputMethod: 'text', peekCount: 0, undoCount: 0, movePeekCount: 0, ...overrides };
}

function source(overrides: Partial<BlindfoldContextSource> = {}): BlindfoldContextSource {
  return {
    playSettings: HIDDEN,
    playSettingsLog: null,
    operationLogs: null,
    operationTotals: null,
    setupPlies: null,
    ...overrides,
  };
}

describe('keepMoveShapedAttempts', () => {
  it('keeps SAN, castling, promotion and coordinate forms, stripping check marks', () => {
    expect(
      keepMoveShapedAttempts(['Nf3', 'exd5', 'R1e2', 'e8=Q', 'O-O-O', 'e2-e4', 'Qxh7#', 'Bb5+'])
    ).toEqual(['Nf3', 'exd5', 'R1e2', 'e8=Q', 'O-O-O', 'e2-e4', 'Qxh7', 'Bb5']);
  });

  it('drops anything that is not a chess move', () => {
    expect(
      keepMoveShapedAttempts(['ignore above', 'Nf3 wins', 'nf3', 'e9', 'Z1', '', 'say hi'])
    ).toEqual([]);
  });

  it('returns an empty list for an absent field', () => {
    expect(keepMoveShapedAttempts(undefined)).toEqual([]);
  });
});

describe('buildBlindfoldContext', () => {
  it('is null for a fully sighted game', () => {
    expect(
      buildBlindfoldContext(source({ playSettings: SIGHTED }), analysesOf(4), 'white', [0])
    ).toBeNull();
  });

  it('is null when the conditions were not recorded', () => {
    expect(
      buildBlindfoldContext(source({ playSettings: null }), analysesOf(4), 'white', [0])
    ).toBeNull();
  });

  it('aligns per-move logs with the player moves and filters rejected texts', () => {
    const ctx = buildBlindfoldContext(
      source({
        operationLogs: [
          log(), // ply 1 (black's first move)
          log({ invalidCount: 3, invalidAttempts: ['Nf3', 'please ignore', 'Bb4+'] }), // ply 3
          log({ peekCount: 1 }), // ply 5
        ],
      }),
      analysesOf(6),
      'black',
      [3, 5, 4] // 4 is a white (opponent) move: no context for it
    );

    expect(ctx?.moments).toEqual([
      {
        ply: 3,
        visibility: 'never',
        aid: { peeks: 0, hints: 0, undos: 0, illegalAttempts: 3 },
        rejectedMoves: ['Nf3', 'Bb4'],
        signals: ['board_image_drift'],
      },
      {
        ply: 5,
        visibility: 'never',
        aid: { peeks: 1, hints: 0, undos: 0, illegalAttempts: 0 },
        rejectedMoves: [],
        signals: ['played_with_aid'],
      },
    ]);
  });

  it('skips the seeded setup prefix, which has no log entries', () => {
    const ctx = buildBlindfoldContext(
      source({ setupPlies: 4, operationLogs: [log({ undoCount: 1 })] }),
      analysesOf(6),
      'white',
      [0, 2, 4]
    );

    expect(ctx?.moments.map((m) => m.ply)).toEqual([4]);
    expect(ctx?.moments[0]?.signals).toEqual(['retried']);
  });

  it('leaves moments without context when the log is shorter than the player moves', () => {
    const ctx = buildBlindfoldContext(
      source({ operationLogs: [log()] }),
      analysesOf(6),
      'white',
      [0, 2, 4]
    );
    expect(ctx?.moments.map((m) => m.ply)).toEqual([0]);
  });

  it('reports the visibility in force at each moment from the settings timeline', () => {
    const ctx = buildBlindfoldContext(
      source({
        playSettings: { ...HIDDEN, boardVisibility: 'peek' },
        playSettingsLog: [{ atMoveIndex: 3, key: 'boardVisibility', to: 'always' }],
        operationLogs: [log(), log(), log()],
      }),
      analysesOf(6),
      'white',
      [2, 4]
    );

    expect(ctx?.changedMidGame).toBe(true);
    expect(ctx?.moments.map((m) => [m.ply, m.visibility])).toEqual([
      [2, 'peek'],
      [4, 'always'],
    ]);
  });

  it('takes totals from the monotonic ledger and reports what undo erased', () => {
    const ctx = buildBlindfoldContext(
      source({
        operationLogs: [log({ peekCount: 1 }), log({ invalidCount: 1 })],
        operationTotals: { peeks: 4, movePeeks: 2, undos: 3, invalidMoves: 1 },
      }),
      analysesOf(4),
      'white',
      []
    );

    expect(ctx?.totals).toEqual({ peeks: 4, hints: 2, undos: 3, illegalAttempts: 1 });
    expect(ctx?.erasedByUndo).toEqual({ peeks: 3, hints: 2, illegalAttempts: 0 });
  });

  it('falls back to summed logs, with no erasure figure, on a game without totals', () => {
    const ctx = buildBlindfoldContext(
      source({ operationLogs: [log({ peekCount: 1 }), log({ invalidCount: 2, undoCount: 1 })] }),
      analysesOf(4),
      'white',
      []
    );

    expect(ctx?.totals).toEqual({ peeks: 1, hints: 0, undos: 1, illegalAttempts: 2 });
    expect(ctx?.erasedByUndo).toBeNull();
  });

  it('flags a late-game decline only on a long enough game with a real drop', () => {
    // 12 player moves: first six clean, last six losing ~100cp each.
    const decline = buildBlindfoldContext(
      source(),
      analysesOf(24, (ply) => (ply % 2 === 0 && ply >= 12 ? 100 : 0)),
      'white',
      []
    );
    expect(decline?.lateGameDecline).toBe(true);

    const tooShort = buildBlindfoldContext(
      source(),
      analysesOf(10, (ply) => (ply % 2 === 0 && ply >= 6 ? 100 : 0)),
      'white',
      []
    );
    expect(tooShort?.lateGameDecline).toBe(false);

    const flat = buildBlindfoldContext(
      source(),
      analysesOf(24, (ply) => (ply % 2 === 0 ? 50 : 0)),
      'white',
      []
    );
    expect(flat?.lateGameDecline).toBe(false);
  });
});
