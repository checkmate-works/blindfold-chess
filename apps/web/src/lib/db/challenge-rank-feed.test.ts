import { describe, expect, it } from 'vitest';

import { decideChallengeRankFeedItem } from './challenge-rank-feed';

const base = {
  menuType: 'coordinate_quiz',
  leaderboardKey: 'default',
  score: 100,
  incorrectAnswers: 2,
  timeTaken: 60,
};

describe('decideChallengeRankFeedItem', () => {
  it('posts a feed item for a new entry within the threshold', () => {
    const result = decideChallengeRankFeedItem({
      ...base,
      isNewEntry: true,
      oldRank: null,
      newRank: 3,
    });
    expect(result).toEqual({ ...base, rank: 3, isNewEntry: true });
  });

  it('returns null for a new entry ranked outside the threshold', () => {
    expect(
      decideChallengeRankFeedItem({ ...base, isNewEntry: true, oldRank: null, newRank: 11 })
    ).toBeNull();
  });

  it('returns null when the new rank could not be resolved', () => {
    expect(
      decideChallengeRankFeedItem({ ...base, isNewEntry: true, oldRank: null, newRank: null })
    ).toBeNull();
  });

  it('posts a feed item with previousRank when an existing entry improves rank', () => {
    const result = decideChallengeRankFeedItem({
      ...base,
      isNewEntry: false,
      oldRank: 8,
      newRank: 4,
    });
    expect(result).toEqual({ ...base, rank: 4, isNewEntry: false, previousRank: 8 });
  });

  it('returns null when an improvement does not raise the rank', () => {
    expect(
      decideChallengeRankFeedItem({ ...base, isNewEntry: false, oldRank: 4, newRank: 4 })
    ).toBeNull();
  });

  it('returns null for an improvement with no known previous rank', () => {
    expect(
      decideChallengeRankFeedItem({ ...base, isNewEntry: false, oldRank: null, newRank: 4 })
    ).toBeNull();
  });
});
