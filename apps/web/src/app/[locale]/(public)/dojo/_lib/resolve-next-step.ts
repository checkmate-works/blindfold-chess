import { CURRICULUM } from '@/lib/db/data/curriculum';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import { resolveNextRank } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';
import type { ResolveNextRankResult } from '@/app/[locale]/(public)/dojo/ranks/_lib/rank-progression';
import { isRankEarnedByPlaying } from '@/app/[locale]/(public)/dojo/ranks/_lib/requirement-items';

/**
 * Dojo next step (次にやること)
 *
 * The one decision the `/dojo` page exists to make: given what the viewer has
 * earned, which rank to show as "next", where its call-to-action should send
 * them, and how far down the curriculum table of contents to reveal. The page
 * translates and renders; everything here is a plain value so the decision can
 * be unit-tested without a translator or React.
 *
 * **What "next" means.** The first unachieved rank ABOVE the highest achieved
 * one, in progression order (`resolveNextRank`). Ranks are granted
 * independently — a black-belt-grade game grants 1dan outright, so a 1dan
 * holder with no kyū rows is a normal DB state — and the recommendation only
 * ever moves forward: a lower unachieved rank is never pushed as "next" because
 * that reads as a regression, not a goal. Once the top rank is held, `next` is
 * `null` and the page shows its "all achieved" copy instead of a card. The
 * literal (DB-row-backed) achieved set is what feeds this; the display-expanded
 * set that paints checkmarks on the TOC is the page's concern.
 *
 * **Card state.** A next rank whose requirements are still empty (not in the
 * DB yet, or defined without conditions) is `'coming-soon'`; otherwise
 * `'next'`. `RankCard` renders the coming-soon label in place of requirements.
 *
 * **Where the CTA points.** Everything up to 2kyu is drilled in the practice
 * modules, so the CTA below the requirement list is the practice index
 * (`/practice`, label `dojo.viewAllPractices`). 1kyu and 1dan are earned by
 * publishing a won engine game, and for those the practice index is a dead
 * end — the CTA becomes the game setup (`/games/new`, label
 * `dojo.startAiGame`). The switch is keyed on the requirement types
 * (`isRankEarnedByPlaying`), not on the slug, so a rank lands on the right
 * destination by virtue of what it asks for. With no next rank the CTA stays
 * on the practice index: there is nothing left to earn at the board.
 *
 * **Curriculum cutoff.** The TOC is truncated at the next rank
 * (`maxVisibleSlug`, or the top rank when everything is achieved) so a
 * beginner is not shown chapters for ranks several steps away.
 * `hasHiddenCurriculum` says whether that cutoff actually hides a rank WITH
 * content: the "view all guides" link beneath the TOC is redundant once every
 * rank that has curriculum sections is already visible — for a 1kyu holder
 * (next = 1dan, which has no sections) the TOC already IS the full guide list
 * and the link would open an identical page.
 *
 * **What is deliberately not decided here.** "The requirements are already
 * satisfied by a game the viewer has not published yet" is a different next
 * step — publish it — and it is resolved client-side by `PublishNudgeBanner`
 * (`games/_components`) through `usePromotionTarget`. A qualifying game lives
 * in the browser's localStorage until it is published, so this server-side
 * decision cannot see it; the banner renders above the next-rank section and
 * takes precedence visually, but the two never share state.
 */

export type DojoNextStepCta = {
  href: string;
  /** Key under the `dojo` namespace; the page translates it. */
  labelKey: 'startAiGame' | 'viewAllPractices';
};

export type DojoNextStep = {
  /** Highest achieved rank, or `null` for unranked / signed-out viewers. */
  current: ResolveNextRankResult['current'];
  /** Rank to work toward, or `null` once the top rank is held. */
  next: ResolveNextRankResult['next'];
  /** `null` exactly when `next` is `null`. */
  nextCardState: 'next' | 'coming-soon' | null;
  cta: DojoNextStepCta;
  /** Last rank whose curriculum rows the TOC shows. */
  maxVisibleSlug: RankSlug;
  /** Whether the cutoff hides at least one rank that has curriculum content. */
  hasHiddenCurriculum: boolean;
};

export function resolveDojoNextStep({
  dbRanks,
  achievedSlugs,
  locale,
}: {
  dbRanks: Rank[];
  achievedSlugs: ReadonlySet<RankSlug>;
  locale: string;
}): DojoNextStep {
  const { current, next } = resolveNextRank(dbRanks, achievedSlugs);

  const nextCardState =
    next === null ? null : next.requirements.length === 0 ? 'coming-soon' : 'next';

  const nextIsEarnedByPlaying = next !== null && isRankEarnedByPlaying(next.requirements);
  const cta: DojoNextStepCta = nextIsEarnedByPlaying
    ? { href: `/${locale}/games/new`, labelKey: 'startAiGame' }
    : { href: `/${locale}/practice`, labelKey: 'viewAllPractices' };

  const maxVisibleSlug = next?.slug ?? ALL_RANK_SLUGS[ALL_RANK_SLUGS.length - 1];
  const maxVisibleIndex = ALL_RANK_SLUGS.indexOf(maxVisibleSlug);
  const hasHiddenCurriculum = CURRICULUM.some(
    ({ slug, sections }) => sections.length > 0 && ALL_RANK_SLUGS.indexOf(slug) > maxVisibleIndex
  );

  return { current, next, nextCardState, cta, maxVisibleSlug, hasHiddenCurriculum };
}
