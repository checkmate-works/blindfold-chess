/** Only post feed items for all-time ranks at or above this threshold. */
export const FEED_RANK_THRESHOLD = 10;

/** Metadata payload of a `challenge_rank_update` feed item. */
export type ChallengeRankFeedMetadata = {
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  rank: number;
  isNewEntry: boolean;
  /** Present only for improvements to an existing best score. */
  previousRank?: number;
};

type DecideChallengeRankFeedArgs = {
  /** True when this is the user's first best score for the menu/key. */
  isNewEntry: boolean;
  /** All-time rank before the UPSERT (improvements only); null otherwise. */
  oldRank: number | null;
  /** All-time rank after the UPSERT; null when it could not be resolved. */
  newRank: number | null;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
};

/**
 * Decide whether a challenge result warrants a `challenge_rank_update` feed
 * item and, if so, build its metadata — returning `null` when none should be
 * posted.
 *
 * A feed item is posted when the new all-time rank is within
 * `FEED_RANK_THRESHOLD`, and — for an improvement to an existing best score —
 * only when the rank strictly improved.
 *
 * Pure: extracted from `saveChallengeResult`, where the new-entry and
 * improvement branches each repeated the threshold check and an almost
 * identical `feedItems` payload.
 */
export function decideChallengeRankFeedItem(
  args: DecideChallengeRankFeedArgs
): ChallengeRankFeedMetadata | null {
  const {
    isNewEntry,
    oldRank,
    newRank,
    menuType,
    leaderboardKey,
    score,
    incorrectAnswers,
    timeTaken,
  } = args;

  if (newRank == null || newRank > FEED_RANK_THRESHOLD) return null;

  const base = {
    menuType,
    leaderboardKey,
    score,
    incorrectAnswers,
    timeTaken,
    rank: newRank,
  };

  if (isNewEntry) {
    return { ...base, isNewEntry: true };
  }

  // Improvement to an existing entry — only worth a feed item when the rank
  // actually rose.
  if (oldRank == null || oldRank <= newRank) return null;
  return { ...base, isNewEntry: false, previousRank: oldRank };
}
