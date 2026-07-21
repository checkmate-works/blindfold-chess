import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ALL_RANK_SLUGS, isMukyuSlug, parseRequirements } from '@/lib/db/data/ranks';
import type { RankRequirement, RankSlug } from '@/lib/db/data/ranks';
import { getRankGuide } from '@/lib/guides';
import type { RankGuide } from '@/lib/guides';
import { resolveCspNonce } from '@/lib/security/nonce';

import { getBeltColorHex } from '@/app/[locale]/(public)/dojo/ranks/_lib/helpers';
import { getRankBySlug } from '@/app/[locale]/(public)/dojo/ranks/_lib/queries';
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
  /**
   * Per-request CSP nonce (set by `src/proxy.ts` on the request headers).
   * Resolved here once so each guide-body renderer can forward it to its
   * `<JsonLd>` emitter without each having to import `next/headers`
   * directly. `undefined` when the request did not traverse the proxy (e.g.
   * unit tests, static generation paths).
   */
  nonce: string | undefined;
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
  const nonce = await resolveCspNonce();

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
    nonce,
  };
}

/**
 * Load DB-backed rank requirements for the "Try the challenge" CTA that
 * appears on the final page of a flat or chapter body. Returns:
 *   - `[]` for mukyu (UI-only, no DB entry).
 *   - `[]` when the rank row exists but its requirements have not been
 *     defined yet (`requirements: []` in seed). The renderer suppresses the
 *     CTA in that case so a guide can be published ahead of the rank's
 *     gating logic — useful while a new rank's content is still in draft.
 *   - `notFound()` when the rank slug is in `ALL_RANK_SLUGS` but missing
 *     from the DB, which signals a deployment / migration issue rather
 *     than an intentional draft state.
 *
 * Only called by the body renderers — the chapter-list layer does NOT need
 * requirements and MUST NOT pay the DB round-trip.
 */
export async function loadRequirements(rankSlug: RankSlug): Promise<RankRequirement[]> {
  if (isMukyuSlug(rankSlug)) return [];
  const rank = await getRankBySlug(rankSlug);
  if (!rank) notFound();
  return parseRequirements(rank.requirements);
}
