'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ALL_RANK_SLUGS, isMukyuSlug, parseRequirements } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCurrentUserAchievedRankIds } from '../_actions/getCurrentUserAchievedRankIds';
import {
  buildRequirementLabels,
  getBeltColorHex,
  getRankCardState,
  resolveAchievedSlugs,
  resolveDisplayAchievedSlugs,
  resolveRecommendedNextSlug,
} from '../_lib/helpers';
import { RankCard } from './RankCard';

/**
 * Shared with the `/dojo/ranks` page's loading skeleton so the two grids don't
 * drift apart — see the skeleton's own comment in `page.tsx`.
 */
export const RANKS_GRID_CLASSES = 'mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

type Props = {
  locale: Locale;
  dbRanks: Rank[];
};

/**
 * Client-rendered rank grid.
 *
 * Lives in a client component so the parent ranks page can stay free of
 * cookie-reading server APIs (`auth.getUser()`) and be served from the ISR
 * cache. The initial SSR/ISR render uses the unauthenticated view (no
 * achieved slugs); after hydration we fetch the current user's achievement
 * IDs via a Server Action and re-render. Anonymous visitors and crawlers
 * see the cached HTML directly. Signed-in users see the unauthenticated
 * card states for a hydration tick before their personal state replaces it.
 */
export function RanksGrid({ locale, dbRanks }: Props) {
  const t = useTranslations('ranks');
  const { user, isLoading: authLoading } = useAuth();
  const [achievedRankIds, setAchievedRankIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAchievedRankIds(new Set());
      return;
    }
    let cancelled = false;
    getCurrentUserAchievedRankIds()
      .then((ids) => {
        if (!cancelled) setAchievedRankIds(new Set(ids));
      })
      .catch(() => {
        // Achievement overlay is non-load-bearing: failures leave the
        // unauthenticated grid in place, matching the crawler view.
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const dbRanksBySlug = new Map(dbRanks.map((r) => [r.slug, r]));
  const achievedSlugs = resolveAchievedSlugs(dbRanks, achievedRankIds);

  // The single recommended rank to pursue: the first unachieved slug ABOVE
  // the highest achieved rank (forward-only). Ranks grant independently
  // (skip-grants allowed), so this is a recommendation, not a gate — every
  // other unachieved rank renders as a plain browsable card. For a
  // signed-out viewer this is always the first rank.
  const recommendedNextSlug = resolveRecommendedNextSlug(achievedSlugs);

  // Checkmarks use the EXPANDED set: a 1dan holder with no kyū rows should
  // still see every lower rank checked off, not just 1dan itself.
  const displayAchievedSlugs = resolveDisplayAchievedSlugs(achievedSlugs);

  return (
    <div className={RANKS_GRID_CLASSES}>
      {ALL_RANK_SLUGS.map((slug) => {
        if (isMukyuSlug(slug)) {
          const beltColor = getBeltColorHex(slug);
          const mukyuRequirements = t.raw('detail.mukyuRequirements') as string[];
          // Mukyu is the starting state — earning ANY real rank leaves it
          // behind (under skip-grants that need not be 5kyu specifically).
          const mukyuState = displayAchievedSlugs.has('mukyu') ? 'achieved' : 'next';
          return (
            <RankCard
              key={slug}
              slug={slug}
              locale={locale}
              beltColor={beltColor}
              rankName={t(`rankNames.${slug}`)}
              state={mukyuState}
              requirementLabels={mukyuRequirements}
              requirementsHeading={t('requirements')}
              comingSoonLabel={t('comingSoon')}
            />
          );
        }

        const rank = dbRanksBySlug.get(slug);
        const beltColor = getBeltColorHex(slug);
        const isAchieved = displayAchievedSlugs.has(slug);
        const requirements = rank ? parseRequirements(rank.requirements) : [];

        const state = getRankCardState(requirements, isAchieved, slug === recommendedNextSlug);

        const requirementLabels = requirements.flatMap((req) => buildRequirementLabels(req, t));

        return (
          <RankCard
            key={slug}
            slug={slug}
            locale={locale}
            beltColor={beltColor}
            rankName={t(`rankNames.${slug}`)}
            state={state}
            requirementLabels={requirementLabels}
            requirementsHeading={t('requirements')}
            comingSoonLabel={t('comingSoon')}
          />
        );
      })}
    </div>
  );
}
