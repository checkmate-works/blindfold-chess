/**
 * The keys that name one completed step of the dojo journey, and the key that
 * names one challenge leaderboard.
 *
 * @description
 * A step key is what the server stores per user once a step is done. There
 * are exactly two shapes:
 *
 * - `guide:<rank>:<page>` — the user worked through one page of a rank's
 *   guide (pages count from 1). This is a "worked on it" mark and nothing is
 *   granted for it, so the client reports it and the server takes the report
 *   after checking the shape with {@link isGuideStepKey}.
 * - `exam:<rank>:<problem>` — the user passed one problem of a rank's exam.
 *   A pass is evidence for a rank, so a client can never report it: the
 *   server grades the answer itself and writes this key. If the server took
 *   `exam:` keys from clients, calling the API directly would be enough to
 *   earn a rank. That is why {@link isGuideStepKey} — the check the client
 *   report goes through — rejects every `exam:` key.
 *
 * Every key fits the database's step-key CHECK
 * (`^[a-z0-9][a-z0-9:_-]{0,63}$`): rank slugs, page numbers and problem kinds
 * use only lower-case letters, digits and `_`.
 */
import {
  type EarnedRankSlug,
  type ExamProblemKind,
  type RankSlug,
  isRankSlug,
} from "../dojo-ranks/ranks";

/**
 * The highest guide page a step key may name. No guide is anywhere near this
 * long; the bound only keeps a client from filling a user's completed steps
 * with keys for pages that do not exist.
 */
export const MAX_GUIDE_PAGES = 50;

/** The key for having worked through `page` (1-based) of `rank`'s guide. */
export function guideStepKey(rank: RankSlug, page: number): string {
  return `guide:${rank}:${page}`;
}

/**
 * The key for having passed `problem` of `exam`'s exam. Only the server
 * writes these, after grading the answer.
 */
export function examStepKey(
  exam: EarnedRankSlug,
  problem: ExamProblemKind,
): string {
  return `exam:${exam}:${problem}`;
}

const GUIDE_STEP_KEY_RE = /^guide:([a-z0-9]+):([1-9][0-9]*)$/;

/**
 * Whether `key` is a guide step key a client may report: `guide:` followed by
 * a known rank slug and a page from 1 to {@link MAX_GUIDE_PAGES}, written
 * without leading zeros so one page has one key. Exam keys and anything else
 * are rejected, because only the server may mark an exam problem as passed.
 */
export function isGuideStepKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const match = GUIDE_STEP_KEY_RE.exec(key);
  if (!match) return false;
  const page = Number(match[2]);
  return isRankSlug(match[1]) && page >= 1 && page <= MAX_GUIDE_PAGES;
}

/**
 * The key for one challenge leaderboard, `<menuType>:<leaderboardKey>` —
 * the same pair `challenge_best_scores` records a score under, so a device
 * that marks a challenge as attempted and the server's best scores count the
 * same unit.
 */
export function challengeKey(menuType: string, leaderboardKey: string): string {
  return `${menuType}:${leaderboardKey}`;
}
