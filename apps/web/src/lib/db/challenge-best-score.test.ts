import { describe, expect, it } from 'vitest';

import { detectScoreImprovement } from './challenge-best-score';

describe('detectScoreImprovement', () => {
  it('is a new entry when there is no current best', () => {
    expect(
      detectScoreImprovement({ score: 10, incorrectAnswers: 0, timeTaken: 30 }, undefined)
    ).toEqual({ isNewEntry: true, isImprovement: false });
  });

  it('is an improvement when score is higher', () => {
    expect(
      detectScoreImprovement(
        { score: 11, incorrectAnswers: 5, timeTaken: 99 },
        { score: 10, incorrectAnswers: 0, timeTaken: 1 }
      )
    ).toEqual({ isNewEntry: false, isImprovement: true });
  });

  it('breaks ties on fewer incorrect answers', () => {
    expect(
      detectScoreImprovement(
        { score: 10, incorrectAnswers: 1, timeTaken: 99 },
        { score: 10, incorrectAnswers: 2, timeTaken: 1 }
      )
    ).toEqual({ isNewEntry: false, isImprovement: true });
  });

  it('breaks remaining ties on faster time', () => {
    expect(
      detectScoreImprovement(
        { score: 10, incorrectAnswers: 2, timeTaken: 30 },
        { score: 10, incorrectAnswers: 2, timeTaken: 31 }
      )
    ).toEqual({ isNewEntry: false, isImprovement: true });
  });

  it('is not an improvement when every value is equal', () => {
    expect(
      detectScoreImprovement(
        { score: 10, incorrectAnswers: 2, timeTaken: 30 },
        { score: 10, incorrectAnswers: 2, timeTaken: 30 }
      )
    ).toEqual({ isNewEntry: false, isImprovement: false });
  });

  it('is not an improvement when strictly worse', () => {
    expect(
      detectScoreImprovement(
        { score: 9, incorrectAnswers: 0, timeTaken: 1 },
        { score: 10, incorrectAnswers: 5, timeTaken: 99 }
      )
    ).toEqual({ isNewEntry: false, isImprovement: false });
  });
});
