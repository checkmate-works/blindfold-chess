/**
 * Score Leaderboard Middle Hub (`/leaderboard/score/[period]/[module-slug]`)
 *
 * @description
 * Canonical per-module filtered view of the score leaderboard. Replaces the
 * legacy `?module=` query-param filter with a proper path segment so crawlers
 * and share targets get a stable, canonical URL per module.
 *
 * Shape identical to the parent score top page, except:
 *   - the card grid is pre-filtered to one module
 *   - the ModuleFilter renders with the current slug highlighted
 *   - the breadcrumb trail includes the module display name
 *
 * @flow
 * - Score/Exp category tabs
 * - Period tabs
 * - Module filter with the current slug selected
 * - LeaderboardTopContent filtered to the chosen module
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, Skeleton } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTabs } from '../../../_components/LeaderboardTabs';
import { LeaderboardTopContent } from '../../../_components/LeaderboardTopContent';
import { ModuleFilter } from '../../../_components/ModuleFilter';
import { PeriodTabs } from '../../../_components/PeriodTabs';
import { SignUpBanner } from '../../../_components/SignUpBanner';
import type { LeaderboardPeriod } from '../../../_lib/types';
import { slugToModule } from '../../../_lib/types';
import { isValidModuleSlug, isValidPeriod } from '../../../_lib/validators';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
    'module-slug': string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, period, 'module-slug': moduleSlug } = await params;
  if (!isValidPeriod(period)) return {};
  if (!isValidModuleSlug(moduleSlug)) return {};

  const underscoreModule = slugToModule(moduleSlug);
  if (!underscoreModule) return {};

  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  const moduleName = t(`moduleFilter.${underscoreModule}`);
  const leaderboardTitle = t('title');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `leaderboard/score/${period}/${moduleSlug}`,
      title: `${moduleName} — ${leaderboardTitle}`,
      description: t('description'),
    }),
    title: resolveTitle(`${moduleName} — ${leaderboardTitle}`, locale),
    description: t('description'),
  };
}

async function ScoreLeaderboardModuleHubContent({ params }: Props) {
  const { locale, period: periodParam, 'module-slug': moduleSlug } = await params;
  if (!isValidPeriod(periodParam)) notFound();
  if (!isValidModuleSlug(moduleSlug)) notFound();

  const period: LeaderboardPeriod = periodParam;
  const underscoreModule = slugToModule(moduleSlug);
  if (!underscoreModule) notFound();

  const t = await getTranslations({ locale, namespace: 'leaderboard' });
  const moduleDisplayName = t(`moduleFilter.${underscoreModule}`);
  // Dedups with the parent layout's `getOptionalUser()` via React `cache()`.
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
          'all-time': `/${locale}/leaderboard/score/all-time/${moduleSlug}`,
          weekly: `/${locale}/leaderboard/score/weekly/${moduleSlug}`,
          monthly: `/${locale}/leaderboard/score/monthly/${moduleSlug}`,
        }}
      />

      <ModuleFilter currentSlug={moduleSlug} period={period} locale={locale} />

      <Suspense
        key={`${period}:${underscoreModule}`}
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <LeaderboardTopContent locale={locale} period={period} moduleFilter={underscoreModule} />
      </Suspense>

      <AdSlot slot="content-bottom" />

      {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
      <div className="!mt-4 space-y-4">
        <Divider />
        <Breadcrumb
          items={[
            { label: t('title'), href: `/leaderboard/score/${period}` },
            { label: moduleDisplayName },
          ]}
          locale={locale}
          density="compact"
        />
      </div>
    </PagePanel>
  );
}

/**
 * Structurally identical to `ScoreLeaderboardPeriodSkeleton` (the parent
 * score top page's skeleton) — only the card grid entry count changes at
 * render time, not the DOM topology, so the same shape works for both.
 */
function ScoreLeaderboardModuleHubSkeleton() {
  return (
    <PagePanel>
      <Skeleton className="h-8 w-56 rounded" />

      <div
        data-banner-placeholder
        className="h-24 rounded-lg border border-primary/30 bg-primary/5 sm:h-20"
      />

      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      <div className="flex rounded-lg bg-secondary p-1">
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
        <div className="h-10 flex-1 rounded-md" />
      </div>

      <div className="flex rounded-lg bg-secondary p-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 flex-1 rounded-md" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </PagePanel>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `ScoreLeaderboardPeriodPage` (`../page.tsx`) for the full rationale.
 * A file-based `loading.tsx` here would also wrap the deeper `[key]` detail
 * route, causing a double-skeleton flash when navigating straight to a
 * specific leaderboard entry.
 */
export default function ScoreLeaderboardModuleHubPage({ params }: Props) {
  return (
    <Suspense fallback={<ScoreLeaderboardModuleHubSkeleton />}>
      <ScoreLeaderboardModuleHubContent params={params} />
    </Suspense>
  );
}
