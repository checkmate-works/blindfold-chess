import { ALL_RANK_SLUGS, MUKYU_SLUG, isMukyuSlug, parseRequirements } from '@/lib/db/data/ranks';
import type { RankRequirement, RankSlug } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

/**
 * Which ranks a user holds, and which one to point them at next.
 *
 * Split from the requirement-rendering and belt-colour modules because this is
 * the only part that reasons about the progression ORDER, and it is the part
 * where the grant model's sharpest edge lives: ranks are granted independently
 * (skip-grants allowed), so a sparse achieved set — a 1dan holder with no kyū
 * rows at all — is a normal DB state, and "literal" vs "effective" achievement
 * must not be conflated. See {@link resolveEffectiveAchievedSlugs}.
 */

/** Non-mukyu rank slugs, in ascending progression order. */
const REAL_RANK_SLUGS = ALL_RANK_SLUGS.filter((slug) => !isMukyuSlug(slug));

/**
 * Index of the highest achieved rank in progression order, or -1 for none.
 *
 * The single place the "highest achieved" scan lives: every question below is
 * answered relative to it (forward-only recommendation, display expansion,
 * current rank), and having each derive its own loop is how they could drift.
 */
function highestAchievedIndex(achievedSlugs: ReadonlySet<RankSlug>): number {
  let highest = -1;
  for (let i = 0; i < REAL_RANK_SLUGS.length; i++) {
    if (achievedSlugs.has(REAL_RANK_SLUGS[i])) highest = i;
  }
  return highest;
}

/**
 * Convert a user's achieved rank IDs into a typed slug set, guarding DB slugs
 * against the known progression order so stale / unknown slugs cannot leak
 * into the helpers below (notably {@link resolveNextRank}).
 */
export function resolveAchievedSlugs(
  dbRanks: Rank[],
  achievedRankIds: ReadonlySet<string>
): ReadonlySet<RankSlug> {
  return new Set(
    dbRanks
      .filter((r) => achievedRankIds.has(r.id))
      .map((r) => r.slug)
      .filter((slug): slug is RankSlug => (ALL_RANK_SLUGS as readonly string[]).includes(slug))
  );
}

/**
 * The single rank slug to recommend as "next" — the first unachieved slug
 * with a level HIGHER than the highest currently achieved rank (forward-only
 * progression), or the first real rank if nothing is achieved yet.
 *
 * Skip-grants make achievement gaps a normal state (e.g. a player can hold
 * 1dan with no kyū ranks at all — a black-belt-grade game grants it
 * outright). A lower unachieved rank must never be recommended once a higher
 * one is already held: "next" means "work toward this", and recommending a
 * rank BELOW what the user already has reads as a regression, not a goal.
 * Returns `null` once the highest defined rank is achieved — there is
 * nothing higher to recommend (skipped lower ranks stay freely earnable via
 * `/dojo/ranks`, just not pushed as "next").
 */
export function resolveRecommendedNextSlug(achievedSlugs: ReadonlySet<RankSlug>): RankSlug | null {
  for (let i = highestAchievedIndex(achievedSlugs) + 1; i < REAL_RANK_SLUGS.length; i++) {
    if (!achievedSlugs.has(REAL_RANK_SLUGS[i])) return REAL_RANK_SLUGS[i];
  }
  return null;
}

/**
 * Expand a literal (DB-row-backed) achieved-slugs set into "effective"
 * achievement for DISPLAY purposes: every real rank at or below the highest
 * actually-achieved rank's level counts as achieved too, even without its
 * own `user_ranks` row.
 *
 * Skip-grants make sparse achievement a normal DB state (e.g. a 1dan holder
 * with no kyū rows at all), but a checkmark UI showing gaps below the
 * user's actual rank reads as broken, not as a nuance of the grant model —
 * real-world belt systems don't ask a black belt to separately "prove" 5th
 * kyū. Use this wherever achievement is rendered as a checkmark (the ranks
 * grid, the curriculum roadmap). Do NOT use it for grant-adjacent logic —
 * {@link resolveRecommendedNextSlug} and the grant evaluator must stay keyed
 * off literal rows; expanding first would be harmless there today (both
 * only look at the highest level) but conflating "earned" and "implied"
 * achievement is the wrong default for anything that isn't pure display.
 */
export function resolveEffectiveAchievedSlugs(
  achievedSlugs: ReadonlySet<RankSlug>
): ReadonlySet<RankSlug> {
  const highest = highestAchievedIndex(achievedSlugs);
  if (highest === -1) return achievedSlugs;
  return new Set(REAL_RANK_SLUGS.slice(0, highest + 1));
}

/** Display-only: effective expansion + mukyu iff the user holds >=1 real rank. */
export function resolveDisplayAchievedSlugs(
  achievedSlugs: ReadonlySet<RankSlug>
): ReadonlySet<RankSlug> {
  const effectiveSlugs = resolveEffectiveAchievedSlugs(achievedSlugs);
  if (achievedSlugs.size === 0) return effectiveSlugs;
  return new Set([...effectiveSlugs, MUKYU_SLUG]);
}

/**
 * View model for the dojo page — identifies the user's current rank and the
 * next rank they are working toward.
 *
 * `current` is `null` for unranked users (mukyu / not logged in).
 * `next` is `null` only when the user has achieved the top rank.
 */
type ResolvedRankView = {
  slug: RankSlug;
  dbRank: Rank | null;
  requirements: RankRequirement[];
};

export type ResolveNextRankResult = {
  current: ResolvedRankView | null;
  next: ResolvedRankView | null;
};

/**
 * Resolve the highest achieved rank and the next rank to pursue from DB ranks
 * and the set of achieved slugs.
 *
 * - `current` = highest achieved slug (or `null` when nothing is achieved).
 * - `next` = {@link resolveRecommendedNextSlug} resolved to its DB row and
 *   requirements (or `null` once the highest rank is achieved).
 *
 * Mukyu is UI-only and is always skipped — it is never counted as achieved
 * or assigned as `current` / `next`.
 */
export function resolveNextRank(
  dbRanks: Rank[],
  achievedSlugs: ReadonlySet<RankSlug>
): ResolveNextRankResult {
  const dbRanksBySlug = new Map(dbRanks.map((r) => [r.slug, r]));

  const toView = (slug: RankSlug): ResolvedRankView => {
    const dbRank = dbRanksBySlug.get(slug) ?? null;
    const requirements = dbRank ? parseRequirements(dbRank.requirements) : [];
    return { slug, dbRank, requirements };
  };

  const highest = highestAchievedIndex(achievedSlugs);
  const current = highest === -1 ? null : toView(REAL_RANK_SLUGS[highest]);

  const nextSlug = resolveRecommendedNextSlug(achievedSlugs);
  const next = nextSlug ? toView(nextSlug) : null;

  return { current, next };
}
