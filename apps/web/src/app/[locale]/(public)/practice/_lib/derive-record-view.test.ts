import { describe, expect, it } from 'vitest';

import { deriveRecordView } from './derive-record-view';

const run = (score: number, incorrectAnswers = 0, timeTaken = 60) => ({
  score,
  incorrectAnswers,
  timeTaken,
});

describe('deriveRecordView', () => {
  it('marks the first-ever run and leaves both history rows empty', () => {
    expect(
      deriveRecordView({ current: run(8), previousBest: undefined, previousLast: undefined })
    ).toEqual({
      status: 'first',
      previousBestScore: undefined,
      previousLastScore: undefined,
      diffFromLast: undefined,
    });
  });

  it('marks a new best when the run beats the previous best on score', () => {
    const view = deriveRecordView({
      current: run(12),
      previousBest: run(10),
      previousLast: run(9),
    });
    expect(view.status).toBe('new-best');
    expect(view.previousBestScore).toBe(10);
    expect(view.previousLastScore).toBe(9);
    expect(view.diffFromLast).toBe(3);
  });

  it('applies the leaderboard tiebreak: equal score with fewer mistakes is a new best', () => {
    const view = deriveRecordView({
      current: run(10, 0),
      previousBest: run(10, 2),
      previousLast: run(10, 2),
    });
    expect(view.status).toBe('new-best');
    expect(view.diffFromLast).toBe(0);
  });

  it('shows no badge for an ordinary run, with a negative diff from last', () => {
    const view = deriveRecordView({
      current: run(7),
      previousBest: run(12),
      previousLast: run(9),
    });
    expect(view.status).toBe('none');
    expect(view.diffFromLast).toBe(-2);
  });

  it('shows history only when there is no resolvable current run', () => {
    const view = deriveRecordView({
      current: undefined,
      previousBest: run(12),
      previousLast: run(9),
    });
    expect(view).toEqual({
      status: 'none',
      previousBestScore: 12,
      previousLastScore: 9,
      diffFromLast: undefined,
    });
  });

  it('never reports "first" without a current run, even with empty history', () => {
    const view = deriveRecordView({
      current: undefined,
      previousBest: undefined,
      previousLast: undefined,
    });
    expect(view.status).toBe('none');
  });
});
