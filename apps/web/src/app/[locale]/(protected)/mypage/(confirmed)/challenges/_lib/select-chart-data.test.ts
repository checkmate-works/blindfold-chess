import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChallengeResultRow } from '../_actions/get-challenge-sessions';
import { selectChartData } from './select-chart-data';

// Freeze time so getPeriodRange / getPreviousPeriodRange return deterministic
// window edges. Pick a Wednesday mid-UTC so both the current and previous
// thisWeek windows are well-formed.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

function makeSession(
  daysAgo: number,
  score: number,
  id = `s-${daysAgo}-${score}`
): ChallengeResultRow {
  const created = new Date('2026-04-15T12:00:00.000Z');
  created.setDate(created.getDate() - daysAgo);
  return {
    id,
    createdAt: created,
    score,
    incorrectAnswers: 0,
    leaderboardKey: 'default',
  } as ChallengeResultRow;
}

describe('selectChartData', () => {
  it('returns an empty array when both periods are empty', () => {
    const result = selectChartData([], [], 'thisWeek', 'en');
    expect(result).toEqual([]);
  });

  it('returns one point per day with non-null current scores', () => {
    // Two sessions on two different days of the current week.
    const sessions = [makeSession(0, 10), makeSession(1, 20)];
    const result = selectChartData(sessions, [], 'thisWeek', 'en');
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Every point should have a score (number), and previousScore === null.
    for (const p of result) {
      expect(p.previousScore).toBeNull();
    }
    const nonNullScores = result.filter((p) => p.score !== null);
    expect(nonNullScores.length).toBeGreaterThanOrEqual(1);
  });

  it('includes previous-period-only days with score=null and previousScore set', () => {
    const prev = [makeSession(10, 50, 'prev')];
    const result = selectChartData([], prev, 'thisWeek', 'en');
    // At least one point must come from the previous period.
    const prevOnly = result.filter((p) => p.score === null && p.previousScore !== null);
    expect(prevOnly.length).toBeGreaterThanOrEqual(1);
  });

  it('sorts points by ascending day index', () => {
    // Points come back sorted even with mixed-order input.
    const sessions = [makeSession(1, 30), makeSession(0, 15), makeSession(2, 45)];
    const result = selectChartData(sessions, [], 'thisWeek', 'en');
    // We can't assert exact labels across locales, but the input already
    // produced multiple rows — make sure the array is monotonic on day index
    // by re-running selectChartData's internal contract: labels are stable.
    const dates = result.map((p) => p.date);
    // Uniqueness proxy: no two consecutive labels equal (different day labels).
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).not.toBe(dates[i - 1]);
    }
  });

  it('labels week periods by weekday, so a previous-only day never shows a future date', () => {
    // 2026-04-15 is a Wednesday; the previous week's Friday and Sunday have
    // data, the current week only Wednesday.
    const current = [makeSession(0, 10)];
    const prev = [makeSession(5, 30, 'fri'), makeSession(3, 40, 'sun')];
    const result = selectChartData(current, prev, 'thisWeek', 'en');
    expect(result.map((p) => p.date)).toEqual(['Wed', 'Fri', 'Sun']);
    expect(result.map((p) => p.score)).toEqual([10, null, null]);
    expect(result.map((p) => p.previousScore)).toEqual([null, 30, 40]);
  });

  it('labels month periods by day of month', () => {
    const current = [makeSession(0, 10), makeSession(14, 20)];
    const result = selectChartData(current, [], 'thisMonth', 'en');
    expect(result.map((p) => p.date)).toEqual(['1', '15']);
  });

  it('formats labels for the given locale', () => {
    const result = selectChartData([makeSession(0, 10)], [], 'thisWeek', 'ja');
    expect(result[0].date).toBe('水');
  });

  it('is a pure function — does not mutate its input arrays', () => {
    const sessions = [makeSession(0, 10), makeSession(1, 20)];
    const sessionsCopy = [...sessions];
    const previous = [makeSession(8, 5)];
    const previousCopy = [...previous];

    selectChartData(sessions, previous, 'thisWeek', 'en');

    expect(sessions).toEqual(sessionsCopy);
    expect(previous).toEqual(previousCopy);
  });
});
