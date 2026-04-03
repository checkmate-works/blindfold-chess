/**
 * Ranks Page (段級位一覧)
 *
 * @description
 * Displays all belt ranks and their requirements in the blindfold chess
 * training progression system. Shows defined ranks with their score
 * thresholds and visual state indicators: achieved ✓, next (actionable),
 * locked 🔒 (conditions not yet defined), or Coming Soon (not in DB).
 *
 * @flow
 * 1. Fetch all ranks from the database (ordered by level ascending).
 * 2. Optionally fetch the current user's achieved ranks (if logged in).
 * 3. Render each rank as a card with belt color indicator and state overlay.
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ALL_RANK_SLUGS, isMukyuSlug, parseRequirements } from '@/lib/db/data/ranks';
import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { SignUpBanner } from '@/app/[locale]/_components/SignUpBanner';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { RankCard } from './_components/RankCard';
import { buildChallengeNameKey, getBeltColorHex, getRankCardState } from './_lib/helpers';
import { getAllRanks, getUserAchievedRankIds } from './_lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.ranks' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'ranks' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function RanksPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ranks' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbRanks = await getAllRanks();
  const dbRanksBySlug = new Map(dbRanks.map((r) => [r.slug, r]));

  const achievedRankIds = user ? await getUserAchievedRankIds(user.id) : new Set<string>();

  // Build a set of achieved slugs for easier lookup
  const achievedSlugs = new Set<string>();
  for (const rank of dbRanks) {
    if (achievedRankIds.has(rank.id)) {
      achievedSlugs.add(rank.slug);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('pageTitle')}</SectionTitle>
        <p className="text-muted-foreground">{t('pageSubtitle')}</p>

        <Suspense fallback={null}>
          <SignUpBanner
            locale={locale}
            message={t('signUpBanner.message')}
            description={t('signUpBanner.description')}
            ctaLabel={t('signUpBanner.cta')}
          />
        </Suspense>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_RANK_SLUGS.map((slug, index) => {
            // Mukyu (無級) is a UI-only rank — not in DB, always accessible.
            // It uses i18n text for requirements instead of challenge_score entries.
            if (isMukyuSlug(slug)) {
              const beltColor = getBeltColorHex(slug);
              const mukyuRequirements = t.raw('detail.mukyuRequirements') as string[];
              return (
                <RankCard
                  key={slug}
                  slug={slug}
                  locale={locale}
                  beltColor={beltColor}
                  rankName={t(`rankNames.${slug}`)}
                  state="next"
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
              const challengeKey = buildChallengeNameKey(req);
              return t('challengeScore', {
                minScore: req.minScore,
                challengeName: t(`challengeNames.${challengeKey}`),
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
              />
            );
          })}
        </div>

        <AdBannerGuard slot="banner-standard" />

        <Divider />

        <Breadcrumb items={[{ label: t('pageTitle') }]} locale={locale} />
      </PagePanel>
    </div>
  );
}
