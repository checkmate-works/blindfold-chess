import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  MUKYU_SLUG,
  RANK_COLORS,
  isMukyuSlug,
  parseRequirements,
  ranksSeedData,
} from '@/lib/db/data/ranks';
import type {
  ChallengeScoreRequirement,
  GamePublishWinHiddenBoardRequirement,
  GamePublishWinRequirement,
  PositionSubmissionCountRequirement,
  RankRequirement,
  RankSlug,
} from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import type { RequirementDivider, RequirementItem } from '../_components/RequirementsList';

export type RankCardState = 'achieved' | 'next' | 'unachieved' | 'coming-soon';

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
function menuTypeToPracticeSlug(menuType: string): string {
  return menuType.replace(/_/g, '-');
}

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

function buildChallengeScoreItem(
  req: ChallengeScoreRequirement,
  locale: string,
  t: Translator
): RequirementItem {
  const challengeKey = buildChallengeNameKey(req);
  const practiceSlug = menuTypeToPracticeSlug(req.menuType);

  // For legal_moves and route_planner, link directly to the challenge page
  // with a piece parameter; other modules route to the practice landing.
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
}

function positionSubmissionRouteSegment(positionType: 'memory' | 'puzzle'): string {
  return positionType === 'memory' ? 'position-memory' : 'puzzle';
}

function positionSubmissionLabel(
  req: PositionSubmissionCountRequirement,
  positionType: 'memory' | 'puzzle',
  t: Translator
): string {
  return t('submissionCount', {
    minCount: req.minCount,
    itemName: t(`submissionItemNames.${positionType}`),
  });
}

/**
 * Build one linked RequirementItem per `positionTypes` entry, joined by an
 * "or" divider — each post type independently satisfies the requirement
 * (see {@link PositionSubmissionCountRequirement}), so each gets its own
 * link rather than collapsing into one label/href pointing at only one type.
 */
function buildPositionSubmissionItems(
  req: PositionSubmissionCountRequirement,
  locale: string,
  t: Translator
): (RequirementItem | RequirementDivider)[] {
  return req.positionTypes.flatMap((positionType, index) => {
    const item: RequirementItem = {
      label: positionSubmissionLabel(req, positionType, t),
      href: `/${locale}/practice/${positionSubmissionRouteSegment(positionType)}/new`,
    };
    if (index === 0) return [item];
    const divider: RequirementDivider = { kind: 'or', label: t('orDivider') };
    return [divider, item];
  });
}

/**
 * Build the same "or"-joined entries as {@link buildPositionSubmissionItems},
 * but as plain labels with no href — for the RankCard summary view, which
 * never links out to a specific practice page.
 */
export function buildPositionSubmissionLabels(
  req: PositionSubmissionCountRequirement,
  t: Translator
): (string | RequirementDivider)[] {
  return req.positionTypes.flatMap((positionType, index) => {
    const label = positionSubmissionLabel(req, positionType, t);
    if (index === 0) return [label];
    const divider: RequirementDivider = { kind: 'or', label: t('orDivider') };
    return [divider, label];
  });
}

/**
 * Labels for one requirement, with no hrefs — the summary view used by the
 * ranks grid, the dojo's next-rank card, and the landing teasers.
 *
 * Those three each used to inline `if (challenge_score) … else <position>`,
 * which silently assumed only two requirement types existed: a third would have
 * hit the position branch and thrown on `req.positionTypes`. Dispatching in one
 * place means a new type is one edit here, not four scattered ones.
 */
export function buildRequirementLabels(
  req: RankRequirement,
  t: Translator
): (string | RequirementDivider)[] {
  if (req.type === 'challenge_score') {
    return [
      t('challengeScore', {
        minScore: req.minScore,
        challengeName: t(`challengeNames.${buildChallengeNameKey(req)}`),
      }),
    ];
  }
  if (req.type === 'game_publish_win') {
    return [t('gamePublishWin', { minCount: req.minCount })];
  }
  if (req.type === 'game_publish_win_hidden_board') {
    return [t('gamePublishWinHiddenBoard', { minCount: req.minCount })];
  }
  return buildPositionSubmissionLabels(req, t);
}

/**
 * Build linked requirement entries from rank requirements for use with
 * RequirementsList / NextRankRequirements.
 *
 * Shared by rank detail page and guide last page to avoid duplicating the
 * label formatting and href construction logic. Dispatches on `req.type` —
 * adding a new requirement type means adding one branch here and one new
 * i18n template, with no per-call-site changes.
 */
export function buildRequirementItems(
  requirements: RankRequirement[],
  locale: string,
  t: Translator
): (RequirementItem | RequirementDivider)[] {
  return requirements.flatMap((req) => {
    if (req.type === 'challenge_score') return [buildChallengeScoreItem(req, locale, t)];
    if (req.type === 'game_publish_win') return [buildGamePublishWinItem(req, locale, t)];
    if (req.type === 'game_publish_win_hidden_board') {
      return [buildGamePublishWinHiddenBoardItem(req, locale, t)];
    }
    return buildPositionSubmissionItems(req, locale, t);
  });
}

/**
 * Unlike every other requirement, this one is not earned in `practice/` — it
 * links to the game setup, since the way to satisfy it is to play the engine
 * with something hidden and publish the win.
 */
function buildGamePublishWinItem(
  req: GamePublishWinRequirement,
  locale: string,
  t: Translator
): RequirementItem {
  return {
    label: t('gamePublishWin', { minCount: req.minCount }),
    href: `/${locale}/games/new/standard`,
  };
}

/**
 * Same shape as {@link buildGamePublishWinItem}, plus a `note` caption
 * spelling out the peek allowance — the label alone ("keep the board hidden
 * and win") doesn't convey that a bounded number of peeks is still tolerated.
 */
function buildGamePublishWinHiddenBoardItem(
  req: GamePublishWinHiddenBoardRequirement,
  locale: string,
  t: Translator
): RequirementItem {
  return {
    label: t('gamePublishWinHiddenBoard', { minCount: req.minCount }),
    href: `/${locale}/games/new/standard`,
    note: t('gamePublishWinHiddenBoardNote', { maxPeeks: req.maxPeeks }),
  };
}

/**
 * Requirement types that are earned at the board rather than in `practice/`.
 * Both game-publish variants route their CTA to the game setup instead of the
 * practice index — see {@link isRankEarnedByPlaying}.
 */
const GAME_BASED_REQUIREMENT_TYPES: readonly RankRequirement['type'][] = [
  'game_publish_win',
  'game_publish_win_hidden_board',
];

/**
 * Whether a rank is earned at the board rather than in `practice/`.
 *
 * Everything up to 2kyu is drilled in the practice modules; 1kyu and 1dan are
 * earned by publishing a won game. Callers use this to point their CTA
 * somewhere that can actually satisfy the rank — the practice index is a dead
 * end for either of those.
 *
 * Keyed on the requirement types, not the slug, so a rank lands on the right
 * destination by virtue of what it asks for. A rank with no requirements yet
 * ("Coming Soon") is not earned by playing — there is nothing to earn.
 */
export function isRankEarnedByPlaying(requirements: RankRequirement[]): boolean {
  return (
    requirements.length > 0 &&
    requirements.every((req) =>
      (GAME_BASED_REQUIREMENT_TYPES as readonly string[]).includes(req.type)
    )
  );
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

/**
 * Card state for the ranks grid. Ranks are granted independently
 * (skip-grants allowed), so there is NO gate on lower ranks: every defined
 * rank is openly browsable and earnable. `'unachieved'` means simply "not
 * achieved and not the recommended next", rendered as a plain clickable
 * card. `'next'` highlights the single recommended rank to pursue (the
 * first unachieved in progression order — computed by the caller), which
 * for a signed-out viewer is always the first rank.
 */
export function getRankCardState(
  requirements: RankRequirement[],
  isAchieved: boolean,
  isRecommendedNext: boolean
): RankCardState {
  // Empty requirements = coming soon (either not in DB yet, or conditions
  // not yet defined — callers pass [] for both, so a single check covers it).
  if (requirements.length === 0) return 'coming-soon';

  if (isAchieved) return 'achieved';
  return isRecommendedNext ? 'next' : 'unachieved';
}

export type RankTeaserCardProps = {
  slug: string;
  locale: string;
  beltColor: string;
  rankName: string;
  state: 'unachieved';
  requirementLabels: string[];
  requirementsHeading: string;
  comingSoonLabel: string;
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
  return TEASER_SLUGS.map((slug) => {
    const seed = ranksSeedData.find((r) => r.slug === slug);
    const requirements = seed ? parseRequirements(seed.requirements) : [];
    const beltColor = getBeltColorHex(slug);
    // TEASER_SLUGS is 5kyu/4kyu only (both challenge_score today), but go
    // through the shared dispatcher anyway so a reshuffle of the teaser slugs
    // cannot reintroduce a wrong-branch crash.
    const requirementLabels = requirements.flatMap((req) =>
      buildRequirementLabels(req, tRanks).filter(
        (label): label is string => typeof label === 'string'
      )
    );

    return {
      slug,
      locale,
      beltColor,
      rankName: tRanks(`rankNames.${slug}`),
      state: 'unachieved' as const,
      requirementLabels,
      requirementsHeading: tRanks('requirements'),
      comingSoonLabel: tRanks('comingSoon'),
    };
  });
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

/** Non-mukyu rank slugs, in ascending progression order. */
const REAL_RANK_SLUGS = ALL_RANK_SLUGS.filter((slug) => !isMukyuSlug(slug));

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
 * `/ranks`, just not pushed as "next").
 */
export function resolveRecommendedNextSlug(achievedSlugs: ReadonlySet<RankSlug>): RankSlug | null {
  let highestAchievedIndex = -1;
  for (let i = 0; i < REAL_RANK_SLUGS.length; i++) {
    if (achievedSlugs.has(REAL_RANK_SLUGS[i])) highestAchievedIndex = i;
  }
  for (let i = highestAchievedIndex + 1; i < REAL_RANK_SLUGS.length; i++) {
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
  let highestAchievedIndex = -1;
  for (let i = 0; i < REAL_RANK_SLUGS.length; i++) {
    if (achievedSlugs.has(REAL_RANK_SLUGS[i])) highestAchievedIndex = i;
  }
  if (highestAchievedIndex === -1) return achievedSlugs;
  return new Set(REAL_RANK_SLUGS.slice(0, highestAchievedIndex + 1));
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

  let current: ResolvedRankView | null = null;
  for (const slug of REAL_RANK_SLUGS) {
    if (achievedSlugs.has(slug)) current = toView(slug);
  }

  const nextSlug = resolveRecommendedNextSlug(achievedSlugs);
  const next = nextSlug ? toView(nextSlug) : null;

  return { current, next };
}
