/**
 * One of the player's own challenge results, as the "My Records" dashboard
 * reads it. The web reads it straight from `challenge_results`; the app gets
 * the same fields from the mobile API, with `createdAt` parsed back into a
 * `Date`.
 */
export type ChallengeRecord = {
  id: string;
  menuType: string;
  leaderboardKey: string;
  score: number;
  incorrectAnswers: number;
  timeTaken: number;
  createdAt: Date;
};

/**
 * Completion detection: `incorrectAnswers < mistakeLimit` (the session ran
 * out of time without reaching the mistake limit). Callers pass
 * `MISTAKE_LIMIT` from `practice-registry`.
 */
export function isCompletedSession(
  session: ChallengeRecord,
  mistakeLimit: number,
): boolean {
  return session.incorrectAnswers < mistakeLimit;
}

/**
 * Best score over every run, and the average over completed runs only (a
 * run that hit the mistake limit stopped early, so its score says less about
 * the player's pace).
 */
export function computeStats(
  sessions: ChallengeRecord[],
  mistakeLimit: number,
) {
  const scores = sessions.map((s) => s.score);

  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  const completedScores = sessions
    .filter((s) => isCompletedSession(s, mistakeLimit))
    .map((s) => s.score);

  const avgCompletionScore =
    completedScores.length > 0
      ? completedScores.reduce((sum, v) => sum + v, 0) / completedScores.length
      : null;

  return { bestScore, avgCompletionScore, totalSessions: sessions.length };
}

/**
 * Period-over-period change as a plain difference in the stat's own unit,
 * or `null` when either period has no value to compare. Not a percentage:
 * the stats are small counts of correct answers, where 1 → 3 is "+200%" and
 * a previous period of 0 has no percentage at all (see `formatSignedDelta`).
 */
export function computeAbsoluteChange(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}

/** Date and time of a run, in the viewer's locale. */
export function formatDate(date: Date | null, locale: string): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Month and day of a run, in the viewer's locale. */
export function formatShortDate(date: Date | null, locale: string): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
