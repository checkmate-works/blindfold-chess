/**
 * Rank → Medal emoji mapping for podium positions (1st–3rd).
 *
 * Shared between leaderboard RankBadge and ChallengeRankUpdateCard
 * to keep medal definitions DRY.
 */
export const MEDAL_EMOJI: Record<number, string> = {
  1: '\u{1F947}', // 🥇
  2: '\u{1F948}', // 🥈
  3: '\u{1F949}', // 🥉
};

/**
 * Returns the medal emoji for a given rank, or `null` if the rank
 * is not a podium position (4+).
 */
export function getMedalEmoji(rank: number): string | null {
  return MEDAL_EMOJI[rank] ?? null;
}
