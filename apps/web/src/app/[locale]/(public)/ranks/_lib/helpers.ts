import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  RANK_COLORS,
  isMukyuSlug,
  parseRequirements,
  ranksSeedData,
} from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import type { RequirementItem } from '../_components/RequirementsList';

export type RankCardState = 'achieved' | 'next' | 'locked' | 'coming-soon';

export function buildChallengeNameKey(req: ChallengeScoreRequirement): string {
  if (req.leaderboardKey === 'default') {
    return req.menuType;
  }
  return `${req.menuType}_${req.leaderboardKey}`;
}

/**
 * Convert a challenge menuType (snake_case) to a practice route slug (kebab-case).
 *
 * Assumes that the resulting slug corresponds to an existing practice route
 * (e.g. `square_colors` → `/practice/square-colors`).
 */
export function menuTypeToPracticeSlug(menuType: string): string {
  return menuType.replace(/_/g, '-');
}

/**
 * Build RequirementItem[] from rank requirements for use with RequirementsList.
 *
 * Shared by rank detail page and guide last page to avoid duplicating the
 * label formatting and href construction logic.
 */
export function buildRequirementItems(
  requirements: ChallengeScoreRequirement[],
  locale: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string
): RequirementItem[] {
  return requirements.map((req) => {
    const challengeKey = buildChallengeNameKey(req);
    const practiceSlug = menuTypeToPracticeSlug(req.menuType);

    // For legal_moves and route_planner, link directly to challenge page with piece parameter
    const href =
      (req.menuType === 'legal_moves' || req.menuType === 'route_planner') &&
      req.leaderboardKey !== 'default'
        ? `/${locale}/practice/${practiceSlug}/challenge?piece=${req.leaderboardKey}`
        : `/${locale}/practice/${practiceSlug}`;

    return {
      label: t('challengeScore', {
        minScore: req.minScore,
        challengeName: t(`challengeNames.${challengeKey}`),
      }),
      href,
    };
  });
}

export function getBeltColorHex(slug: RankSlug): string {
  const colorName = RANK_COLORS[slug];
  return BELT_COLOR_HEX[colorName] ?? '#6b7280';
}

/**
 * Whether a given hex belt color should be treated as the "white belt" color.
 *
 * `#ffffff` is invisible on light backgrounds, so components rendering white
 * belts need to add a visible border / outline. Centralising the check here
 * keeps belt-color UI behaviour consistent across components.
 */
export function isWhiteBelt(beltColor: string): boolean {
  return beltColor.toLowerCase() === '#ffffff';
}

export function getRankCardState(
  inDb: boolean,
  requirements: ChallengeScoreRequirement[],
  isAchieved: boolean,
  previousAchieved: boolean,
  isLoggedIn: boolean,
  isFirstRank: boolean
): RankCardState {
  // Not in DB = Coming Soon
  if (!inDb) return 'coming-soon';

  // Has empty requirements = coming soon (conditions not yet defined)
  if (requirements.length === 0) return 'coming-soon';

  // Logged in: check achievement
  if (isLoggedIn) {
    if (isAchieved) return 'achieved';
    if (isFirstRank || previousAchieved) return 'next';
    return 'locked';
  }

  // Not logged in: first rank is visible, rest are locked
  if (isFirstRank) return 'next';
  return 'locked';
}

export type RankTeaserCardProps = {
  slug: string;
  locale: string;
  beltColor: string;
  rankName: string;
  state: 'locked';
  requirementLabels: string[];
  requirementsHeading: string;
  comingSoonLabel: string;
  previousRankName?: string;
  previousSlug?: string;
};

const TEASER_SLUGS = ['5kyu', '4kyu'] as const;

/**
 * Build RankCard props for the teaser cards shown on the landing page and getting-started page.
 *
 * Centralises the slug list, seed-data lookup, requirement parsing, and label
 * formatting so callers only need to supply locale and translations.
 */
export function buildRankTeaserCards(
  locale: string,
  tRanks: (key: string, values?: Record<string, string | number | Date>) => string
): RankTeaserCardProps[] {
  return TEASER_SLUGS.map((slug, index) => {
    const seed = ranksSeedData.find((r) => r.slug === slug);
    const requirements = seed ? parseRequirements(seed.requirements) : [];
    const beltColor = getBeltColorHex(slug);
    const requirementLabels = requirements.map((req) => {
      const challengeKey = buildChallengeNameKey(req);
      return tRanks('challengeScore', {
        minScore: req.minScore,
        challengeName: tRanks(`challengeNames.${challengeKey}`),
      });
    });
    const previousSlug = index > 0 ? TEASER_SLUGS[index - 1] : undefined;

    return {
      slug,
      locale,
      beltColor,
      rankName: tRanks(`rankNames.${slug}`),
      state: 'locked' as const,
      requirementLabels,
      requirementsHeading: tRanks('requirements'),
      comingSoonLabel: tRanks('comingSoon'),
      previousRankName: previousSlug ? tRanks(`rankNames.${previousSlug}`) : undefined,
      previousSlug,
    };
  });
}

/**
 * View model for the dojo page — identifies the user's current rank and the
 * next rank they are working toward.
 *
 * `current` is `null` for unranked users (mukyu / not logged in).
 * `next` is `null` only when the user has achieved the top rank.
 */
export type ResolvedRankView = {
  slug: RankSlug;
  dbRank: Rank | null;
  requirements: ChallengeScoreRequirement[];
};

export type ResolveNextRankResult = {
  current: ResolvedRankView | null;
  next: ResolvedRankView | null;
};

/**
 * Resolve the highest achieved rank and the next rank to pursue from DB ranks
 * and the set of achieved slugs. Walks `ALL_RANK_SLUGS` in progression order.
 *
 * - `current` = highest achieved slug (or `null` when nothing is achieved).
 * - `next` = first non-achieved slug encountered in the linear walk (or `null`
 *   once everything is achieved).
 *
 * @remarks
 * - Linear grant progression is assumed: ranks are granted in order, so in
 *   practice `next` will be the slug immediately after `current`.
 * - If achievement gaps exist (e.g. user somehow has 3kyu without 5kyu), the
 *   linear walk assigns `next` to the first non-achieved slug it encounters,
 *   which may end up being lower than `current` in theory. This behaviour is
 *   intentional and locked in by tests.
 * - Mukyu is UI-only and is always skipped — it is never counted as achieved
 *   or assigned as `current` / `next`.
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

  let current: ResolvedRankView | null = null;
  let next: ResolvedRankView | null = null;

  for (const slug of ALL_RANK_SLUGS) {
    if (isMukyuSlug(slug)) continue;
    if (achievedSlugs.has(slug)) {
      current = toView(slug);
    } else if (next === null) {
      next = toView(slug);
    }
  }

  return { current, next };
}
