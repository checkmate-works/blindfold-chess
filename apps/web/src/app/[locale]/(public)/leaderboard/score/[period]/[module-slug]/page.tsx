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

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  ScoreLeaderboardSkeleton,
  ScoreLeaderboardView,
} from '../../../_components/ScoreLeaderboardView';
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

/**
 * Deliberately NOT a segment-level `loading.tsx` — see the matching comment
 * on `ScoreLeaderboardPeriodPage` (`../page.tsx`) for the full rationale.
 * A file-based `loading.tsx` here would also wrap the deeper `[key]` detail
 * route, causing a double-skeleton flash when navigating straight to a
 * specific leaderboard entry.
 */
export default async function ScoreLeaderboardModuleHubPage({ params }: Props) {
  const { locale, period: periodParam, 'module-slug': moduleSlug } = await params;
  if (!isValidPeriod(periodParam)) notFound();
  if (!isValidModuleSlug(moduleSlug)) notFound();

  const period: LeaderboardPeriod = periodParam;
  const underscoreModule = slugToModule(moduleSlug);
  if (!underscoreModule) notFound();

  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <Suspense fallback={<ScoreLeaderboardSkeleton />}>
      <ScoreLeaderboardView
        locale={locale}
        period={period}
        moduleFilter={underscoreModule}
        currentSlug={moduleSlug}
        periodHrefSuffix={`/${moduleSlug}`}
        breadcrumbItems={[
          { label: t('title'), href: `/leaderboard/score/${period}` },
          { label: t(`moduleFilter.${underscoreModule}`) },
        ]}
      />
    </Suspense>
  );
}
