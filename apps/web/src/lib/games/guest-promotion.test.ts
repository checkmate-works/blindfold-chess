import { describe, expect, it } from 'vitest';

import { classifyGuestPromotionQualification } from './guest-promotion';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
  PreferenceChangeLogEntry,
} from './saved-game-types';

const SIGHTED: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

const HIDDEN: GamePlaySettings = { ...SIGHTED, boardVisibility: 'never' };

function opLog(peekCount: number, undoCount = 0): MoveOperationLog {
  return { inputMethod: 'text', peekCount, undoCount, movePeekCount: 0 };
}

function totals(overrides: Partial<OperationTotals>): OperationTotals {
  return { peeks: 0, movePeeks: 0, undos: 0, invalidMoves: 0, ...overrides };
}

function classify(overrides: Partial<Parameters<typeof classifyGuestPromotionQualification>[0]>) {
  return classifyGuestPromotionQualification({
    result: 'win',
    playSettings: HIDDEN,
    changeLog: undefined,
    operationLogs: [],
    // Absent by default so the log-based cases below exercise the legacy
    // fallback; the totals cases opt in explicitly.
    operationTotals: undefined,
    moveCount: 40,
    startingFen: undefined,
    setupPlies: undefined,
    ...overrides,
  });
}

/** One move from mate for White — the shape of the getting-started example. */
const ENDGAME_FEN = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('classifyGuestPromotionQualification', () => {
  it.each(['loss', 'draw', null] as const)('returns null for a %s result', (result) => {
    expect(classify({ result })).toBeNull();
  });

  it('returns null when the settings snapshot is missing', () => {
    expect(classify({ playSettings: null })).toBeNull();
    expect(classify({ playSettings: undefined })).toBeNull();
  });

  it('returns null for a fully sighted win — no constraint at all', () => {
    expect(classify({ playSettings: SIGHTED })).toBeNull();
  });

  it('returns 1dan for a board-hidden win with no peeks', () => {
    expect(classify({})).toBe('1dan');
  });

  it('returns 1dan when total peeks exactly equal the allowance (5)', () => {
    expect(classify({ operationLogs: [opLog(3), opLog(2)] })).toBe('1dan');
  });

  it('downgrades to 1kyu when peeks exceed the allowance', () => {
    expect(classify({ operationLogs: [opLog(4), opLog(2)] })).toBe('1kyu');
  });

  it('returns 1dan for the default peek mode (board hidden, peekable) within the allowance', () => {
    expect(classify({ playSettings: { ...SIGHTED, boardVisibility: 'peek' } })).toBe('1dan');
  });

  it('downgrades to 1kyu when the board was revealed mid-game', () => {
    const changeLog: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 10, key: 'boardVisibility', from: 'never', to: 'always' },
    ];
    expect(classify({ changeLog })).toBe('1kyu');
  });

  it('stays 1dan when mid-game changes never reveal the board', () => {
    const changeLog: PreferenceChangeLogEntry[] = [
      { atMoveIndex: 10, key: 'boardVisibility', from: 'never', to: 'peek' },
      { atMoveIndex: 20, key: 'pieceColors', from: 'normal', to: 'white-only' },
    ];
    expect(classify({ changeLog })).toBe('1dan');
  });

  it('returns 1kyu for a partially constrained win (board visible, pawns hidden)', () => {
    expect(classify({ playSettings: { ...SIGHTED, pawnHideMode: 'all' } })).toBe('1kyu');
  });

  it('tolerates an undefined change log and operation logs', () => {
    expect(classify({ changeLog: undefined, operationLogs: null })).toBe('1dan');
  });

  describe('standard-start bar (mirrors the server evaluator)', () => {
    it('downgrades a hidden-board win from a custom position to 1kyu', () => {
      expect(classify({ startingFen: ENDGAME_FEN })).toBe('1kyu');
    });

    it('downgrades a hidden-board win seeded with setup plies (opening / PGN start) to 1kyu', () => {
      expect(classify({ setupPlies: 8 })).toBe('1kyu');
    });

    it('keeps 1dan when startingFen is explicitly the standard position', () => {
      expect(classify({ startingFen: STANDARD_FEN, setupPlies: 0 })).toBe('1dan');
    });

    it('treats null on both fields as the standard start', () => {
      expect(classify({ startingFen: null, setupPlies: null })).toBe('1dan');
    });

    it('returns null (not 1kyu) for a fully sighted win from a custom position', () => {
      expect(classify({ playSettings: SIGHTED, startingFen: ENDGAME_FEN })).toBeNull();
    });
  });

  describe('peek total (mirrors the server evaluator)', () => {
    it('reads the monotonic totals, not the per-move log', () => {
      // Undo deletes log entries together with the peeks they recorded, so a
      // player who peeks, undoes and replays leaves a clean log behind. The
      // totals remember, and they are what the server grades after publish —
      // pitching 1dan off the log would promise a rank that is then declined.
      const laundered = { operationLogs: [opLog(0, 4)], operationTotals: totals({ peeks: 9 }) };
      expect(classify(laundered)).toBe('1kyu');
    });

    it('returns 1dan on totals within the allowance whatever the log says', () => {
      expect(
        classify({ operationLogs: [opLog(0)], operationTotals: totals({ peeks: 5, undos: 3 }) })
      ).toBe('1dan');
    });

    it('downgrades to 1kyu on a malformed totals object rather than falling back', () => {
      const malformed = { peeks: 0 } as unknown as OperationTotals;
      expect(classify({ operationTotals: malformed })).toBe('1kyu');
    });

    it('downgrades a legacy game with any recorded undo — its peek total is unverifiable', () => {
      expect(classify({ operationLogs: [opLog(0, 1)], operationTotals: undefined })).toBe('1kyu');
    });
  });
});
