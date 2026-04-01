import { describe, expect, it } from 'vitest';

import { MISTAKE_LIMIT } from '@/lib/challenge-constants';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import { getPreviousPeriodLabel } from './dashboard-ui-utils';
import {
  aggregateByDay,
  computePercentChange,
  computeStats,
  formatDate,
  formatShortDate,
  getDayIndex,
  isCompletedSession,
} from './dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<ChallengeResultRow> = {}): ChallengeResultRow {
  return {
    id: 'test-id',
    menuType: 'coordinate_quiz',
    leaderboardKey: 'white',
    score: 10,
    incorrectAnswers: 0,
    timeTaken: 30,
    createdAt: new Date('2025-06-04T10:00:00'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isCompletedSession
// ---------------------------------------------------------------------------

describe('isCompletedSession', () => {
  it('returns true when incorrectAnswers is 0 (well below MISTAKE_LIMIT)', () => {
    const session = makeSession({ incorrectAnswers: 0 });
    expect(isCompletedSession(session, MISTAKE_LIMIT)).toBe(true);
  });

  it('returns true when incorrectAnswers is MISTAKE_LIMIT - 1 (boundary)', () => {
    const session = makeSession({ incorrectAnswers: MISTAKE_LIMIT - 1 });
    expect(isCompletedSession(session, MISTAKE_LIMIT)).toBe(true);
  });

  it('returns false when incorrectAnswers equals MISTAKE_LIMIT (boundary)', () => {
    const session = makeSession({ incorrectAnswers: MISTAKE_LIMIT });
    expect(isCompletedSession(session, MISTAKE_LIMIT)).toBe(false);
  });

  it('returns false when incorrectAnswers exceeds MISTAKE_LIMIT', () => {
    const session = makeSession({ incorrectAnswers: MISTAKE_LIMIT + 1 });
    expect(isCompletedSession(session, MISTAKE_LIMIT)).toBe(false);
  });

  it('MISTAKE_LIMIT is 3', () => {
    expect(MISTAKE_LIMIT).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------

describe('computeStats', () => {
  it('returns null bestScore and avgCompletionScore for empty sessions', () => {
    const result = computeStats([], MISTAKE_LIMIT);
    expect(result).toEqual({
      bestScore: null,
      avgCompletionScore: null,
      totalSessions: 0,
    });
  });

  it('computes bestScore from all sessions regardless of completion', () => {
    const sessions = [
      makeSession({ score: 50, incorrectAnswers: MISTAKE_LIMIT }),
      makeSession({ score: 30, incorrectAnswers: 0 }),
    ];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.bestScore).toBe(50);
  });

  it('computes avgCompletionScore only from completed sessions', () => {
    const sessions = [
      makeSession({ score: 40, incorrectAnswers: 0 }),
      makeSession({ score: 20, incorrectAnswers: 0 }),
      makeSession({ score: 100, incorrectAnswers: MISTAKE_LIMIT }),
    ];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.avgCompletionScore).toBe(30);
  });

  it('returns null avgCompletionScore when no sessions are completed', () => {
    const sessions = [
      makeSession({ score: 10, incorrectAnswers: MISTAKE_LIMIT }),
      makeSession({ score: 20, incorrectAnswers: MISTAKE_LIMIT + 1 }),
    ];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.avgCompletionScore).toBeNull();
    expect(result.bestScore).toBe(20);
  });

  it('counts totalSessions correctly', () => {
    const sessions = [makeSession(), makeSession(), makeSession()];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.totalSessions).toBe(3);
  });

  it('handles single completed session', () => {
    const sessions = [makeSession({ score: 42, incorrectAnswers: 1 })];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.bestScore).toBe(42);
    expect(result.avgCompletionScore).toBe(42);
    expect(result.totalSessions).toBe(1);
  });

  it('boundary: session with incorrectAnswers = MISTAKE_LIMIT - 1 counts as completed', () => {
    const sessions = [makeSession({ score: 15, incorrectAnswers: MISTAKE_LIMIT - 1 })];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.avgCompletionScore).toBe(15);
  });

  it('boundary: session with incorrectAnswers = MISTAKE_LIMIT does NOT count as completed', () => {
    const sessions = [makeSession({ score: 15, incorrectAnswers: MISTAKE_LIMIT })];
    const result = computeStats(sessions, MISTAKE_LIMIT);
    expect(result.avgCompletionScore).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computePercentChange
// ---------------------------------------------------------------------------

describe('computePercentChange', () => {
  it('returns null when current is null', () => {
    expect(computePercentChange(null, 10)).toBeNull();
  });

  it('returns null when previous is null', () => {
    expect(computePercentChange(10, null)).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(computePercentChange(null, null)).toBeNull();
  });

  it('returns null when previous is 0 (division by zero)', () => {
    expect(computePercentChange(10, 0)).toBeNull();
  });

  it('computes positive percent change', () => {
    expect(computePercentChange(20, 10)).toBe(100);
  });

  it('computes negative percent change', () => {
    expect(computePercentChange(5, 10)).toBe(-50);
  });

  it('returns 0 when current equals previous', () => {
    expect(computePercentChange(10, 10)).toBe(0);
  });

  it('handles fractional results', () => {
    const result = computePercentChange(1, 3);
    expect(result).toBeCloseTo(-66.6667, 3);
  });
});

// ---------------------------------------------------------------------------
// formatDate / formatShortDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('returns "-" for null date', () => {
    expect(formatDate(null, 'en')).toBe('-');
  });

  it('returns a formatted string for a valid date', () => {
    const result = formatDate(new Date('2025-06-04T14:30:00'), 'en');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });
});

describe('formatShortDate', () => {
  it('returns "-" for null date', () => {
    expect(formatShortDate(null, 'en')).toBe('-');
  });

  it('returns a formatted string for a valid date', () => {
    const result = formatShortDate(new Date('2025-06-04T14:30:00'), 'en');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });
});

// ---------------------------------------------------------------------------
// getPreviousPeriodLabel
// ---------------------------------------------------------------------------

describe('getPreviousPeriodLabel', () => {
  it('returns "lastWeek" for thisWeek', () => {
    expect(getPreviousPeriodLabel('thisWeek')).toBe('lastWeek');
  });

  it('returns "twoWeeksAgo" for lastWeek', () => {
    expect(getPreviousPeriodLabel('lastWeek')).toBe('twoWeeksAgo');
  });

  it('returns "lastMonth" for thisMonth', () => {
    expect(getPreviousPeriodLabel('thisMonth')).toBe('lastMonth');
  });

  it('returns "twoMonthsAgo" for lastMonth', () => {
    expect(getPreviousPeriodLabel('lastMonth')).toBe('twoMonthsAgo');
  });
});

// ---------------------------------------------------------------------------
// aggregateByDay
// ---------------------------------------------------------------------------

describe('aggregateByDay', () => {
  it('returns empty array for empty sessions', () => {
    expect(aggregateByDay([], 'en')).toEqual([]);
  });

  it('aggregates sessions on the same day', () => {
    const sessions = [
      makeSession({ score: 10, createdAt: new Date('2025-06-04T08:00:00') }),
      makeSession({ score: 20, createdAt: new Date('2025-06-04T16:00:00') }),
    ];
    const result = aggregateByDay(sessions, 'en');
    expect(result).toHaveLength(1);
    expect(result[0].avgScore).toBe(15);
  });

  it('separates sessions on different days', () => {
    const sessions = [
      makeSession({ score: 10, createdAt: new Date('2025-06-04T08:00:00') }),
      makeSession({ score: 20, createdAt: new Date('2025-06-05T08:00:00') }),
    ];
    const result = aggregateByDay(sessions, 'en');
    expect(result).toHaveLength(2);
  });

  it('sorts results by date ascending', () => {
    const sessions = [
      makeSession({ score: 20, createdAt: new Date('2025-06-06T08:00:00') }),
      makeSession({ score: 10, createdAt: new Date('2025-06-04T08:00:00') }),
    ];
    const result = aggregateByDay(sessions, 'en');
    expect(result[0].dateKey).toBe('2025-06-04');
    expect(result[1].dateKey).toBe('2025-06-06');
  });

  it('rounds avgScore to one decimal place', () => {
    const sessions = [
      makeSession({ score: 10, createdAt: new Date('2025-06-04T08:00:00') }),
      makeSession({ score: 11, createdAt: new Date('2025-06-04T16:00:00') }),
      makeSession({ score: 12, createdAt: new Date('2025-06-04T20:00:00') }),
    ];
    const result = aggregateByDay(sessions, 'en');
    expect(result[0].avgScore).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// getDayIndex
// ---------------------------------------------------------------------------

describe('getDayIndex', () => {
  it('returns 0 for the same day as period start', () => {
    const periodStart = new Date('2025-06-02T00:00:00');
    expect(getDayIndex('2025-06-02', periodStart)).toBe(0);
  });

  it('returns positive index for days after period start', () => {
    const periodStart = new Date('2025-06-02T00:00:00');
    expect(getDayIndex('2025-06-04', periodStart)).toBe(2);
  });

  it('returns negative index for days before period start', () => {
    const periodStart = new Date('2025-06-02T00:00:00');
    expect(getDayIndex('2025-06-01', periodStart)).toBe(-1);
  });
});
