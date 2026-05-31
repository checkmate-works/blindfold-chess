import { describe, expect, it } from 'vitest';

import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { computeGameStats, markerForLog } from './compute-game-stats';

function log(overrides: Partial<MoveOperationLog> = {}): MoveOperationLog {
  return {
    inputMethod: 'text',
    peekCount: 0,
    undoCount: 0,
    movePeekCount: 0,
    invalidCount: 0,
    ...overrides,
  };
}

describe('markerForLog — severity precedence', () => {
  it('clean when every counter is zero', () => {
    expect(markerForLog(log())).toBe('clean');
  });

  it('illegal outranks everything else', () => {
    expect(
      markerForLog(log({ invalidCount: 1, undoCount: 1, peekCount: 1, movePeekCount: 1 }))
    ).toBe('illegal');
  });

  it('takeback outranks peek and hint', () => {
    expect(markerForLog(log({ undoCount: 1, peekCount: 1, movePeekCount: 1 }))).toBe('takeback');
  });

  it('peek outranks hint', () => {
    expect(markerForLog(log({ peekCount: 1, movePeekCount: 1 }))).toBe('peek');
  });

  it('hint when only a legal-move hint was used', () => {
    expect(markerForLog(log({ movePeekCount: 2 }))).toBe('hint');
  });

  it('treats a missing invalidCount (legacy log) as zero', () => {
    const legacy = {
      inputMethod: 'text',
      peekCount: 0,
      undoCount: 0,
      movePeekCount: 0,
    } as MoveOperationLog;
    expect(markerForLog(legacy)).toBe('clean');
  });
});

describe('computeGameStats', () => {
  it('returns zeroed stats for no moves', () => {
    expect(computeGameStats([])).toEqual({
      totalMoves: 0,
      peeks: 0,
      illegal: 0,
      takebacks: 0,
      hints: 0,
      cleanMoves: 0,
      perMove: [],
    });
  });

  it('sums each counter and counts clean moves', () => {
    const stats = computeGameStats([
      log(), // clean
      log({ peekCount: 2 }),
      log({ invalidCount: 3, peekCount: 1 }),
      log({ undoCount: 1 }),
      log({ movePeekCount: 1 }),
      log(), // clean
    ]);

    expect(stats.totalMoves).toBe(6);
    expect(stats.peeks).toBe(3); // 2 + 1
    expect(stats.illegal).toBe(3);
    expect(stats.takebacks).toBe(1);
    expect(stats.hints).toBe(1);
    expect(stats.cleanMoves).toBe(2);
    expect(stats.perMove).toEqual(['clean', 'peek', 'illegal', 'takeback', 'hint', 'clean']);
  });
});
