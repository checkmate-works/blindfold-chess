import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import type { ChallengeScoreRequirement, RankSlug } from '@/lib/db/data/ranks';
import { getRankGuide } from '@/lib/guides';
import type { RankGuide } from '@/lib/guides';

import { getBeltColorHex } from '@/app/[locale]/(public)/ranks/_lib/helpers';
import { getValidatedRank } from '@/app/[locale]/(public)/ranks/_lib/queries';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Translator object returned by `next-intl/server`'s `getTranslations`.
 * Narrowed just enough for what the renderers use (label lookup + ICU args).
 */
export type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

type RankNavigationNeighbour = {
  slug: RankSlug;
  rankName: string;
};

export type GuideContext = {
  locale: Locale;
  rankSlug: RankSlug;
  guide: RankGuide;
  rankName: string;
  beltColor: string;
  tRanks: Translator;
  tGuides: Translator;
  /**
   * Adjacent ranks that have published guide content. Either side is `null`
   * at the extremes of `ALL_RANK_SLUGS` or when the adjacent rank has no
   * guide entry in `guides.pages`.
   */
  prevRank: RankNavigationNeighbour | null;
  nextRank: RankNavigationNeighbour | null;
};

/**
 * Find the nearest sibling rank in `ALL_RANK_SLUGS` that has guide content,
 * walking in `step === -1` (previous) or `step === +1` (next) direction.
 * Returns `null` when no reachable sibling with a published guide exists.
 */
function findAdjacentGuidedRank(
  currentSlug: RankSlug,
  step: -1 | 1,
  guidesPages: Record<string, unknown>,
  tRanks: Translator
): RankNavigationNeighbour | null {
  const index = (ALL_RANK_SLUGS as readonly string[]).indexOf(currentSlug);
  if (index === -1) return null;
  for (let i = index + step; i >= 0 && i < ALL_RANK_SLUGS.length; i += step) {
    const slug = ALL_RANK_SLUGS[i];
    if (getRankGuide(guidesPages, slug) !== null) {
      return { slug, rankName: tRanks(`rankNames.${slug}`) };
    }
  }
  return null;
}

/**
 * Resolve everything that every layer needs regardless of `kind`: the guide
 * data, the rank name + belt colour, and the two translators. Calling this
 * does NOT touch the database — it is safe to run for the chapter-list layer
 * which skips requirement lookup.
 */
export async function resolveGuideContext(
  locale: Locale,
  rankSlug: RankSlug
): Promise<GuideContext> {
  const tRanks = await getTranslations({ locale, namespace: 'ranks' });
  const tGuides = await getTranslations({ locale, namespace: 'guides' });

  const guidesPages = tGuides.raw('pages') as Record<string, unknown>;
  const guide = getRankGuide(guidesPages, rankSlug);
  if (!guide) notFound();

  return {
    locale,
    rankSlug,
    guide,
    rankName: tRanks(`rankNames.${rankSlug}`),
    beltColor: getBeltColorHex(rankSlug),
    tRanks,
    tGuides,
    prevRank: findAdjacentGuidedRank(rankSlug, -1, guidesPages, tRanks),
    nextRank: findAdjacentGuidedRank(rankSlug, +1, guidesPages, tRanks),
  };
}

/**
 * Load DB-backed rank requirements for the "Try the challenge" CTA that
 * appears on the final page of a flat or chapter body. Mukyu is UI-only and
 * has no DB entry, so we return an empty array for it.
 *
 * Only called by the body renderers — the chapter-list layer does NOT need
 * requirements and MUST NOT pay the DB round-trip.
 */
export async function loadRequirements(rankSlug: RankSlug): Promise<ChallengeScoreRequirement[]> {
  if (isMukyuSlug(rankSlug)) return [];
  const result = await getValidatedRank(rankSlug);
  if (!result) notFound();
  return result.requirements;
}
