import { describe, expect, it } from 'vitest';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { buildOpsRows, getPlayerMoveIndices, hasOps, logForMovesIndex } from './move-ops-alignment';

const LABELS = { peek: 'Peek', undo: 'Undo', hints: 'Hints', invalid: 'Illegal' };

const log = (overrides: Partial<MoveOperationLog> = {}): MoveOperationLog => ({
  inputMethod: 'text',
  peekCount: 0,
  undoCount: 0,
  movePeekCount: 0,
  ...overrides,
});

describe('hasOps', () => {
  it('is false when every counter is zero or absent', () => {
    expect(hasOps(log())).toBe(false);
  });

  it('is true when any counter is non-zero', () => {
    expect(hasOps(log({ peekCount: 1 }))).toBe(true);
    expect(hasOps(log({ undoCount: 2 }))).toBe(true);
    expect(hasOps(log({ movePeekCount: 1 }))).toBe(true);
    expect(hasOps(log({ invalidCount: 3 }))).toBe(true);
  });
});

describe('getPlayerMoveIndices', () => {
  it('picks even plies for white and odd for black from the standard start', () => {
    expect(getPlayerMoveIndices(5, undefined, 'white')).toEqual([0, 2, 4]);
    expect(getPlayerMoveIndices(5, undefined, 'black')).toEqual([1, 3]);
  });

  it('skips the seeded setup prefix — those moves have no log entry', () => {
    // Ruy Lopez seed: 1.e4 e5 2.Nf3 Nc6 3.Bb5 (5 plies), then play continues.
    expect(getPlayerMoveIndices(9, undefined, 'white', 5)).toEqual([6, 8]);
    expect(getPlayerMoveIndices(9, undefined, 'black', 5)).toEqual([5, 7]);
  });

  it('treats a whole-game prefix and a negative prefix safely', () => {
    expect(getPlayerMoveIndices(4, undefined, 'white', 4)).toEqual([]);
    expect(getPlayerMoveIndices(4, undefined, 'white', -1)).toEqual([0, 2]);
  });
});

describe('logForMovesIndex', () => {
  const logs = [log({ peekCount: 1 }), log({ undoCount: 2 })];
  const playerIndices = [0, 2, 4];

  it('aligns logs[i] with the i-th player move', () => {
    expect(logForMovesIndex(0, playerIndices, logs)).toBe(logs[0]);
    expect(logForMovesIndex(2, playerIndices, logs)).toBe(logs[1]);
  });

  it('returns null for opponent moves and uncommitted player moves', () => {
    expect(logForMovesIndex(1, playerIndices, logs)).toBeNull();
    // Player move 4 exists in the index list but has no log entry yet.
    expect(logForMovesIndex(4, playerIndices, logs)).toBeNull();
    expect(logForMovesIndex(undefined, playerIndices, logs)).toBeNull();
  });
});

describe('buildOpsRows', () => {
  it('returns no rows when every counter is zero', () => {
    expect(buildOpsRows(log(), LABELS)).toEqual([]);
  });

  it('includes only the non-zero counters, in peek/undo/hints/invalid order', () => {
    const rows = buildOpsRows(log({ peekCount: 2, invalidCount: 1 }), LABELS);
    expect(rows).toEqual([
      { label: 'Peek', value: 2 },
      { label: 'Illegal', value: 1, detail: undefined },
    ]);
  });

  it('attaches the rejected SAN texts as the invalid row detail', () => {
    const rows = buildOpsRows(log({ invalidCount: 2, invalidAttempts: ['Nf3', 'Bb4'] }), LABELS);
    expect(rows).toEqual([{ label: 'Illegal', value: 2, detail: 'Nf3, Bb4' }]);
  });

  it('omits the detail when invalidCount is set but no attempt texts were captured', () => {
    // Board mis-grabs bump the count but carry no SAN — invalidAttempts stays undefined.
    const rows = buildOpsRows(log({ invalidCount: 1 }), LABELS);
    expect(rows).toEqual([{ label: 'Illegal', value: 1, detail: undefined }]);
  });
});
