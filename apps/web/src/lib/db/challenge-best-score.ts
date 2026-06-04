export type ChallengeScore = {
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
};

/**
 * Compare a fresh challenge result against the user's current all-time best
 * for that menu/leaderboard key.
 *
 * Ranking is a tuple comparison: higher score wins, then fewer incorrect
 * answers, then faster time. Pure (no DB) so the "is this better?" rule can
 * be reasoned about and tested in isolation from `saveChallengeResult`.
 *
 * @returns `isNewEntry` when there is no existing best, and `isImprovement`
 *   when an existing best is strictly beaten.
 */
export function detectScoreImprovement(
  result: ChallengeScore,
  currentBest: ChallengeScore | undefined
): { isNewEntry: boolean; isImprovement: boolean } {
  if (!currentBest) {
    return { isNewEntry: true, isImprovement: false };
  }

  const isImprovement =
    result.score > currentBest.score ||
    (result.score === currentBest.score &&
      result.incorrectAnswers < currentBest.incorrectAnswers) ||
    (result.score === currentBest.score &&
      result.incorrectAnswers === currentBest.incorrectAnswers &&
      result.timeTaken < currentBest.timeTaken);

  return { isNewEntry: false, isImprovement };
}
