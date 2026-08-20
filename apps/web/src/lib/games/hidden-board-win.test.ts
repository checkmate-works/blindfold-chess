import { describe, expect, it } from 'vitest';

import type { HiddenBoardWinRow } from './hidden-board-win';
import { qualifiesAsHiddenBoardWin } from './hidden-board-win';

/** A hidden-board win with nothing disqualifying: standard start, no peeks. */
const baseRow: HiddenBoardWinRow = {
  playSettings: {
    boardVisibility: 'never',
    showOwnPieces: false,
    showOpponentPieces: false,
    pieceShapeMode: 'normal',
    pieceColors: 'normal',
    pawnHideMode: 'none',
  },
  playSettingsLog: [],
  operationLogs: null,
  operationTotals: { peeks: 0, movePeeks: 0, undos: 0, invalidMoves: 0 },
  startingFen: null,
  setupPlies: null,
};

const row = (overrides: Partial<HiddenBoardWinRow>): HiddenBoardWinRow => ({
  ...baseRow,
  ...overrides,
});

describe('qualifiesAsHiddenBoardWin', () => {
  it('accepts a standard-start game played with the board hidden and no peeks', () => {
    expect(qualifiesAsHiddenBoardWin(baseRow, 5)).toBe(true);
  });

  describe('standard-start requirement', () => {
    it('rejects a game started from a custom position', () => {
      const custom = row({ startingFen: '8/8/8/8/8/8/6k1/6KQ w - - 0 1' });
      expect(qualifiesAsHiddenBoardWin(custom, 5)).toBe(false);
    });

    it('rejects a game seeded with pre-played setup moves', () => {
      expect(qualifiesAsHiddenBoardWin(row({ setupPlies: 6 }), 5)).toBe(false);
    });
  });

  describe('hidden-board requirement', () => {
    it('rejects a game whose settings never hid the board', () => {
      const visible = row({
        playSettings: { ...baseRow.playSettings!, boardVisibility: 'always' },
      });
      expect(qualifiesAsHiddenBoardWin(visible, 5)).toBe(false);
    });

    it('rejects a game that revealed the board mid-play via the settings log', () => {
      const revealed = row({
        playSettingsLog: [{ atMoveIndex: 4, key: 'boardVisibility', to: 'always' }],
      });
      expect(qualifiesAsHiddenBoardWin(revealed, 5)).toBe(false);
    });

    it('rejects a game with no recorded settings at all', () => {
      expect(qualifiesAsHiddenBoardWin(row({ playSettings: null }), 5)).toBe(false);
    });
  });

  describe('peek budget from the monotonic totals', () => {
    it('accepts peeks up to the limit and rejects one over', () => {
      const withPeeks = (peeks: number) =>
        row({ operationTotals: { peeks, movePeeks: 0, undos: 0, invalidMoves: 0 } });
      expect(qualifiesAsHiddenBoardWin(withPeeks(5), 5)).toBe(true);
      expect(qualifiesAsHiddenBoardWin(withPeeks(6), 5)).toBe(false);
    });

    it('counts peeks that were undone — totals do not shrink', () => {
      // The issue #95 exploit: peek, undo, replay. `undos` being non-zero is
      // fine here precisely because the peek total survived the rollback.
      const laundered = row({
        operationTotals: { peeks: 9, movePeeks: 0, undos: 4, invalidMoves: 0 },
      });
      expect(qualifiesAsHiddenBoardWin(laundered, 5)).toBe(false);
    });

    it('rejects a malformed totals object rather than falling back to the logs', () => {
      const malformed = row({
        operationTotals: { peeks: 0 } as unknown as HiddenBoardWinRow['operationTotals'],
        operationLogs: [],
      });
      expect(qualifiesAsHiddenBoardWin(malformed, 5)).toBe(false);
    });
  });

  describe('legacy rows without operation totals', () => {
    const legacy = (logs: HiddenBoardWinRow['operationLogs']) =>
      row({ operationTotals: null, operationLogs: logs });

    it('accepts an undo-free log within the peek budget', () => {
      const clean = legacy([
        { inputMethod: 'text', peekCount: 1, undoCount: 0, movePeekCount: 0 },
        { inputMethod: 'text', peekCount: 2, undoCount: 0, movePeekCount: 0 },
      ]);
      expect(qualifiesAsHiddenBoardWin(clean, 5)).toBe(true);
    });

    it('accepts an empty log and a null log as zero peeks', () => {
      expect(qualifiesAsHiddenBoardWin(legacy([]), 5)).toBe(true);
      expect(qualifiesAsHiddenBoardWin(legacy(null), 5)).toBe(true);
    });

    it('rejects any recorded undo — the peek total is unverifiable', () => {
      const undone = legacy([
        { inputMethod: 'text', peekCount: 0, undoCount: 1, movePeekCount: 0 },
      ]);
      expect(qualifiesAsHiddenBoardWin(undone, 5)).toBe(false);
    });

    it('rejects a log whose peek total exceeds the budget', () => {
      const tooMany = legacy([
        { inputMethod: 'text', peekCount: 6, undoCount: 0, movePeekCount: 0 },
      ]);
      expect(qualifiesAsHiddenBoardWin(tooMany, 5)).toBe(false);
    });

    it.each([
      ['a missing peekCount', { inputMethod: 'text', undoCount: 0, movePeekCount: 0 }],
      ['a NaN peekCount', { inputMethod: 'text', peekCount: NaN, undoCount: 0, movePeekCount: 0 }],
      [
        'a non-numeric undoCount',
        { inputMethod: 'text', peekCount: 0, undoCount: '0', movePeekCount: 0 },
      ],
      ['a null entry', null],
    ])('rejects %s in the log', (_label, entry) => {
      const malformed = legacy([entry] as unknown as HiddenBoardWinRow['operationLogs']);
      expect(qualifiesAsHiddenBoardWin(malformed, 5)).toBe(false);
    });
  });
});
