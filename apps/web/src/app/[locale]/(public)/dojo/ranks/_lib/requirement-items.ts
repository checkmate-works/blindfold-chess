import type { InterpolatingTranslator } from '@/i18n/translator';
import { examProblemSegment } from '@blindfold-chess/features/dojo-journey';
import { challengeNameKey } from '@blindfold-chess/features/dojo-ranks';

import { parseRequirements, ranksSeedData } from '@/lib/db/data/ranks';
import type {
  ChallengeScoreRequirement,
  ExamProblemRequirement,
  GamePublishWinHiddenBoardRequirement,
  GamePublishWinRequirement,
  RankRequirement,
} from '@/lib/db/data/ranks';

import type { RequirementItem } from '../_components/RequirementsList';
import { getBeltColorHex } from './belt-colors';

/**
 * Turning a rank's {@link RankRequirement}s into something a user can read and
 * click: localized labels, and hrefs pointing at the surface that can actually
 * satisfy each requirement.
 *
 * Every entry point here dispatches on `req.type` in ONE place, so call sites
 * never assume which requirement types exist. Adding a requirement type is
 * one branch in each dispatcher here plus one i18n template; both
 * dispatchers are exhaustive over the union, so a new member is a compile
 * error until it gets its branches.
 *
 * Every requirement renders as exactly one entry: a rank's requirements are
 * all required (implicit AND), so no entry is an alternative to another and
 * nothing here emits an "or" divider.
 */

export type RankCardState = 'achieved' | 'next' | 'unachieved' | 'coming-soon';

/**
 * Convert a challenge menuType (snake_case) to a practice route slug (kebab-case).
 *
 * Assumes that the resulting slug corresponds to an existing practice route
 * (e.g. `square_colors` → `/practice/square-colors`).
 */
function menuTypeToPracticeSlug(menuType: string): string {
  return menuType.replace(/_/g, '-');
}

function buildChallengeScoreItem(
  req: ChallengeScoreRequirement,
  locale: string,
  t: InterpolatingTranslator
): RequirementItem {
  const challengeKey = challengeNameKey(req.menuType, req.leaderboardKey);
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

function examProblemLabel(req: ExamProblemRequirement, t: InterpolatingTranslator): string {
  return t('examProblem', {
    rankName: t(`rankNames.${req.exam}`),
    problemName: t(`examProblemNames.${req.problem}`),
  });
}

/**
 * An exam problem links to its own page under `/dojo/exams`, where the
 * answer is graded on the server and a pass is recorded one problem at a
 * time.
 */
function buildExamProblemItem(
  req: ExamProblemRequirement,
  locale: string,
  t: InterpolatingTranslator
): RequirementItem {
  return {
    label: examProblemLabel(req, t),
    href: `/${locale}/dojo/exams/${req.exam}/${examProblemSegment(req.problem)}`,
  };
}

/**
 * Labels for one requirement, with no hrefs — the summary view used by the
 * ranks grid, the dojo's next-rank card, and the landing teasers. Every
 * requirement is one label: all of a rank's requirements must be met, so
 * none is an alternative to another.
 */
export function buildRequirementLabels(req: RankRequirement, t: InterpolatingTranslator): string[] {
  if (req.type === 'challenge_score') {
    return [
      t('challengeScore', {
        minScore: req.minScore,
        challengeName: t(`challengeNames.${challengeNameKey(req.menuType, req.leaderboardKey)}`),
      }),
    ];
  }
  if (req.type === 'exam_problem') return [examProblemLabel(req, t)];
  if (req.type === 'game_publish_win') {
    return [t('gamePublishWin', { minCount: req.minCount })];
  }
  if (req.type === 'game_publish_win_hidden_board') {
    return [t('gamePublishWinHiddenBoard', { minCount: req.minCount })];
  }
  const unhandled: never = req;
  return unhandled;
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
  t: InterpolatingTranslator
): RequirementItem[] {
  return requirements.map((req) => {
    if (req.type === 'challenge_score') return buildChallengeScoreItem(req, locale, t);
    if (req.type === 'exam_problem') return buildExamProblemItem(req, locale, t);
    if (req.type === 'game_publish_win') return buildGamePublishWinItem(req, locale, t);
    return buildGamePublishWinHiddenBoardItem(req, locale, t);
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
  t: InterpolatingTranslator
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
  t: InterpolatingTranslator
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
    const requirementLabels = requirements.flatMap((req) => buildRequirementLabels(req, tRanks));

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
