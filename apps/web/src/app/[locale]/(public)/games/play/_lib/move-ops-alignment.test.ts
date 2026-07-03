import { describe, expect, it } from 'vitest';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { getPlayerMoveIndices, hasOps, logForMovesIndex } from './move-ops-alignment';

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
