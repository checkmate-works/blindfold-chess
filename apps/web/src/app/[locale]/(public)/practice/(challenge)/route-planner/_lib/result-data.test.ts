import type { RoutePlannerProblemResult } from '@blindfold-chess/features/route-planner';
import { describe, expect, it } from 'vitest';

import { parseRoutePlannerResults, scoreRoutePlannerResults } from './result-data';

const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value));

const solved: RoutePlannerProblemResult = {
  piece: 'n',
  start: 'g1',
  end: 'e2',
  success: true,
  userPath: ['e2'],
  shortestPath: ['g1', 'e2'],
};
const missed: RoutePlannerProblemResult = {
  piece: 'b',
  start: 'c1',
  end: 'h6',
  success: false,
  userPath: ['d2', 'h6'],
  shortestPath: ['c1', 'h6'],
};
const skipped: RoutePlannerProblemResult = { ...missed, userPath: [], skipped: true };
const timedOut: RoutePlannerProblemResult = { ...missed, userPath: [], timedOut: true };

describe('parseRoutePlannerResults', () => {
  it('decodes the list the challenge writes', () => {
    const results = [solved, missed, skipped, timedOut];
    expect(parseRoutePlannerResults(encode(results))).toEqual(results);
  });

  it.each([null, '', 'not-json', '%E0%A4%A'])(
    'is empty for absent or undecodable data: %j',
    (data) => {
      expect(parseRoutePlannerResults(data)).toEqual([]);
    }
  );

  it.each([null, 42, 'text', { 0: solved }])(
    'is empty when the payload is not an array: %j',
    (value) => {
      expect(parseRoutePlannerResults(encode(value))).toEqual([]);
    }
  );

  it('drops entries of the wrong shape and keeps the well-formed ones', () => {
    const { userPath: _userPath, ...withoutUserPath } = missed;
    expect(
      parseRoutePlannerResults(
        encode([
          null,
          'g1',
          [solved],
          {},
          withoutUserPath,
          { ...solved, piece: 'k' },
          { ...solved, start: 'z9' },
          { ...solved, end: { square: 'e2' } },
          { ...solved, success: 'yes' },
          { ...solved, shortestPath: ['g1', 7] },
          { ...solved, timedOut: 1 },
          solved,
        ])
      )
    ).toEqual([solved]);
  });
});

describe('scoreRoutePlannerResults', () => {
  it('counts solved problems over the answered ones, leaving out the timed-out one', () => {
    expect(scoreRoutePlannerResults([solved, missed, skipped, timedOut])).toEqual({
      score: 1,
      total: 3,
    });
  });

  it('is zero over zero for an empty list', () => {
    expect(scoreRoutePlannerResults([])).toEqual({ score: 0, total: 0 });
  });
});
