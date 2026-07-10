import { describe, expect, it } from 'vitest';

import type { MoveLogEntry } from './move-log-entry';
import { computeRecallStats } from './recall-stats';

/** Terse builder — only the fields the stats reader looks at matter here. */
function entry(status: MoveLogEntry['status'], move = 'e4'): MoveLogEntry {
  return { moveNumber: 1, isWhiteMove: true, move, status };
}

describe('computeRecallStats', () => {
  it('returns an all-zero report for an empty log', () => {
    expect(computeRecallStats([])).toEqual({
      total: 0,
      nailed: 0,
      struggled: 0,
      missed: 0,
      mistakes: 0,
      recalled: 0,
      recallRate: 0,
    });
  });

  it('counts a clean correct move as nailed', () => {
    const stats = computeRecallStats([entry('correct'), entry('correct')]);
    expect(stats).toMatchObject({ nailed: 2, struggled: 0, missed: 0, mistakes: 0, total: 2 });
    expect(stats.recallRate).toBe(1);
  });

  it('counts a correct move preceded by wrong attempts as struggled', () => {
    const stats = computeRecallStats([entry('incorrect'), entry('incorrect'), entry('correct')]);
    expect(stats).toMatchObject({ nailed: 0, struggled: 1, missed: 0, mistakes: 2, total: 1 });
    expect(stats.recalled).toBe(1);
    expect(stats.recallRate).toBe(1);
  });

  it('counts a skipped move as missed (and any preceding wrong attempts as mistakes)', () => {
    const stats = computeRecallStats([entry('incorrect'), entry('skipped')]);
    expect(stats).toMatchObject({ nailed: 0, struggled: 0, missed: 1, mistakes: 1, total: 1 });
    expect(stats.recallRate).toBe(0);
  });

  it('counts an auto-filled move as missed, same as an explicit skip', () => {
    const stats = computeRecallStats([entry('autoFilled'), entry('autoFilled')]);
    expect(stats).toMatchObject({ nailed: 0, struggled: 0, missed: 2, mistakes: 0, total: 2 });
    expect(stats.recallRate).toBe(0);
  });

  it('excludes opponent auto-fills from the engaged total', () => {
    // White nailed, black auto-filled (opponent), white nailed again.
    const stats = computeRecallStats([entry('correct'), entry('auto'), entry('correct')]);
    expect(stats).toMatchObject({ nailed: 2, total: 2, missed: 0 });
  });

  it('mixes outcomes into a correct rate over engaged moves only', () => {
    const stats = computeRecallStats([
      entry('correct'), // nailed
      entry('auto'), // opponent — ignored
      entry('incorrect'),
      entry('correct'), // struggled
      entry('auto'), // opponent — ignored
      entry('skipped'), // missed
    ]);
    expect(stats).toMatchObject({
      nailed: 1,
      struggled: 1,
      missed: 1,
      mistakes: 1,
      recalled: 2,
      total: 3,
    });
    expect(stats.recallRate).toBeCloseTo(2 / 3);
  });
});
