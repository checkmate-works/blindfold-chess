import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
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

export function getRankCardState(
  inDb: boolean,
  requirements: RankRequirement[],
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
    // TEASER_SLUGS is 5kyu/4kyu only (both challenge_score today), but go
    // through the shared dispatcher anyway so a reshuffle of the teaser slugs
    // cannot reintroduce a wrong-branch crash.
    const requirementLabels = requirements.flatMap((req) =>
      buildRequirementLabels(req, tRanks).filter(
        (label): label is string => typeof label === 'string'
      )
    );
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

/**
 * Resolve the highest achieved rank and the next rank to pursue from DB ranks
 * and the set of achieved slugs. Walks `ALL_RANK_SLUGS` in progression order.
 *
 * - `current` = highest achieved slug (or `null` when nothing is achieved).
 * - `next` = first non-achieved slug encountered in the linear walk (or `null`
 *   once everything is achieved).
 *
 * @remarks
 * - Achievement gaps are a normal state: ranks are granted independently
 *   (skip-grants allowed), so e.g. a player can hold 1dan with no kyū ranks.
 *   The walk then assigns `next` to the first non-achieved slug — possibly
 *   lower than `current` — which is the right recommendation: fill in the
 *   lower belts. Locked in by tests.
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
