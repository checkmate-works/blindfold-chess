'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ALL_RANK_SLUGS, isMukyuSlug, parseRequirements } from '@/lib/db/data/ranks';
import type { Rank } from '@/lib/db/schema';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getCurrentUserAchievedRankIds } from '../_actions/getCurrentUserAchievedRankIds';
import { buildChallengeNameKey, getBeltColorHex, getRankCardState } from '../_lib/helpers';
import { RankCard } from './RankCard';

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
  const achievedSlugs = new Set<string>(
    dbRanks.filter((r) => achievedRankIds.has(r.id)).map((r) => r.slug)
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {ALL_RANK_SLUGS.map((slug, index) => {
        if (isMukyuSlug(slug)) {
          const beltColor = getBeltColorHex(slug);
          const mukyuRequirements = t.raw('detail.mukyuRequirements') as string[];
          const mukyuState = user && achievedSlugs.has('5kyu') ? 'achieved' : 'next';
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
        const isFirstRank = index === 1; // index 1 because mukyu is index 0
        const previousSlug = ALL_RANK_SLUGS[index - 1];
        const previousAchieved = previousSlug ? achievedSlugs.has(previousSlug) : false;
        const isAchieved = achievedSlugs.has(slug);
        const requirements = rank ? parseRequirements(rank.requirements) : [];

        const state = getRankCardState(
          !!rank,
          requirements,
          isAchieved,
          previousAchieved,
          !!user,
          isFirstRank
        );

        const requirementLabels = requirements.map((req) => {
          if (req.type === 'challenge_score') {
            const challengeKey = buildChallengeNameKey(req);
            return t('challengeScore', {
              minScore: req.minScore,
              challengeName: t(`challengeNames.${challengeKey}`),
            });
          }
          return t('submissionCount', {
            minCount: req.minCount,
            itemName: t(`submissionItemNames.${req.positionType}`),
          });
        });

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
            previousRankName={previousSlug ? t(`rankNames.${previousSlug}`) : undefined}
            previousSlug={previousSlug}
          />
        );
      })}
    </div>
  );
}
