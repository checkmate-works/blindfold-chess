/**
 * Score Leaderboard (`/leaderboard/score/[period]`)
 *
 * @description
 * Canonical category-first score leaderboard. Displays weekly/monthly/all-time
 * score rankings for challenge-enabled practice modules. Users can filter by
 * module via the path segment `/leaderboard/score/[period]/[module-slug]`
 * (middle hub). The period is path-based. Shows top scores with leaderboard
 * cards linking to detailed per-module/per-key rankings.
 *
 * Top-3 ranks are displayed with medal emojis and highlighted rows (left border
 * accent + subtle background). The SCORE column shows miss count inline as
 * `score(misses)` with color-coded miss indicators.
 *
 * @flow
 * - Score/Exp category tabs
 * - Period tabs: weekly / monthly / all-time (path-based)
 * - Module filter: all / per-module filter (path-based)
 * - LeaderboardTopContent: Top-ranked entries with scores
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTabs } from '../../_components/LeaderboardTabs';
import { LeaderboardTopContent } from '../../_components/LeaderboardTopContent';
import { ModuleFilter } from '../../_components/ModuleFilter';
import { PeriodTabs } from '../../_components/PeriodTabs';
import { SignUpBanner } from '../../_components/SignUpBanner';
import type { LeaderboardPeriod } from '../../_lib/types';
import { isValidPeriod } from '../../_lib/validators';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) return {};
  const t = await getTranslations({ locale, namespace: 'metadata.leaderboard' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `leaderboard/score/${periodParam}`,
      title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function ScoreLeaderboardPeriodPage({ params }: Props) {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) {
    notFound();
  }
  const period: LeaderboardPeriod = periodParam;
  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  // `getOptionalUser` is React-`cache()`d in @/lib/auth, so this call dedups
  // with the one the parent `layout.tsx` already made — no double round-trip.
  const user = await getOptionalUser();

  return (
    <PagePanel>
      <SectionTitle>{t('scoreLeaderboardSection')}</SectionTitle>

      {!user && <SignUpBanner locale={locale} />}

      <LeaderboardTabs activeTab="score" locale={locale} period={period} />

      <PeriodTabs
        currentPeriod={period}
        locale={locale}
        hrefs={{
          'all-time': `/${locale}/leaderboard/score/all-time`,
          weekly: `/${locale}/leaderboard/score/weekly`,
          monthly: `/${locale}/leaderboard/score/monthly`,
        }}
      />

      <ModuleFilter currentSlug="all" period={period} locale={locale} />

      <Suspense
        key={`${period}:all`}
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <LeaderboardTopContent locale={locale} period={period} moduleFilter="all" />
      </Suspense>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}

      <Divider />

      <Breadcrumb items={[{ label: t('title') }]} locale={locale} />
    </PagePanel>
  );
}
