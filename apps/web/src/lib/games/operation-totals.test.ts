import { describe, expect, it } from 'vitest';

import { EMPTY_OPERATION_TOTALS, isOperationTotals, sumOperationLogs } from './operation-totals';
import type { MoveOperationLog } from './saved-game-types';

describe('isOperationTotals', () => {
  it('accepts a well-formed totals object', () => {
    expect(isOperationTotals({ peeks: 0, movePeeks: 2, undos: 1, invalidMoves: 3 })).toBe(true);
    expect(isOperationTotals(EMPTY_OPERATION_TOTALS)).toBe(true);
  });

  it('rejects non-objects and missing fields', () => {
    expect(isOperationTotals(null)).toBe(false);
    expect(isOperationTotals(undefined)).toBe(false);
    expect(isOperationTotals(5)).toBe(false);
    expect(isOperationTotals({ peeks: 1, movePeeks: 0, undos: 0 })).toBe(false);
  });

  it('rejects negative, fractional, and non-finite counters', () => {
    expect(isOperationTotals({ peeks: -1, movePeeks: 0, undos: 0, invalidMoves: 0 })).toBe(false);
    expect(isOperationTotals({ peeks: 1.5, movePeeks: 0, undos: 0, invalidMoves: 0 })).toBe(false);
    expect(isOperationTotals({ peeks: NaN, movePeeks: 0, undos: 0, invalidMoves: 0 })).toBe(false);
    expect(isOperationTotals({ peeks: Infinity, movePeeks: 0, undos: 0, invalidMoves: 0 })).toBe(
      false
    );
    expect(isOperationTotals({ peeks: '1', movePeeks: 0, undos: 0, invalidMoves: 0 })).toBe(false);
  });
});

describe('sumOperationLogs', () => {
  it('returns zeros for an empty log', () => {
    expect(sumOperationLogs([])).toEqual(EMPTY_OPERATION_TOTALS);
  });

  it('sums every per-move counter', () => {
    const logs: MoveOperationLog[] = [
      { inputMethod: 'text', peekCount: 2, undoCount: 1, movePeekCount: 0, invalidCount: 1 },
      { inputMethod: 'board', peekCount: 1, undoCount: 0, movePeekCount: 3, invalidCount: 0 },
    ];
    expect(sumOperationLogs(logs)).toEqual({
      peeks: 3,
      movePeeks: 3,
      undos: 1,
      invalidMoves: 1,
    });
  });

  it('treats missing optional counters on legacy entries as 0', () => {
    const legacy = [
      { inputMethod: 'text', peekCount: 1, undoCount: 0 },
    ] as unknown as MoveOperationLog[];
    expect(sumOperationLogs(legacy)).toEqual({
      peeks: 1,
      movePeeks: 0,
      undos: 0,
      invalidMoves: 0,
    });
  });
});
