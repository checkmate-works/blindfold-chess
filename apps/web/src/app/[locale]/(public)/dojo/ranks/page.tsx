/**
 * Ranks Page
 *
 * @description
 * Displays all belt ranks and their requirements in the blindfold chess
 * training progression system. Shows defined ranks with their score
 * thresholds and visual state indicators: achieved ✓, next (the recommended
 * rank to pursue), unachieved (plain, simply not yet achieved — every rank
 * is freely earnable in any order, so there is no lock), or Coming Soon
 * (not in DB, or conditions not yet defined).
 *
 * @flow
 * 1. Fetch all ranks from the database (ordered by level ascending).
 * 2. Render the rank grid via the client component `RanksGrid`, which
 *    overlays the current user's achievement state on top of the
 *    statically-rendered cards after hydration.
 *
 * @design ISR + client achievement overlay
 * Rank definitions are code-seeded (see `lib/db/data/ranks.ts`) so they only
 * change on deploy. The page is therefore served from the ISR cache; the
 * per-user "achieved ✓" state is fetched on the client via a Server Action
 * (`getCurrentUserAchievedRankIds`). Crawlers and anonymous visitors get
 * cached HTML in one Function Invocation; logged-in users see the
 * unauthenticated card states for a hydration tick before their personal
 * state replaces it — acceptable for a non-load-bearing visual indicator.
 */
import { Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';

import {
  Divider,
  PageLayout,
  PagePanel,
  PageTitle,
  SectionTitle,
} from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
import { SignUpBanner } from '@/app/[locale]/_components/SignUpBanner';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { RANKS_GRID_CLASSES, RanksGrid } from './_components/RanksGrid';
import { getAllRanks } from './_lib/queries';

export const revalidate = 1800; // 30 minutes — ranks are code-seeded; long TTL is fine

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.ranks', path: 'dojo/ranks' });
}

async function RanksContent({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ranks' });
  const tDojo = await getTranslations({ locale, namespace: 'dojo' });

  const dbRanks = await getAllRanks();

  return (
    <PageLayout
      title={t('pageTitle')}
      locale={locale}
      breadcrumb={[{ label: tDojo('pageTitle'), href: '/dojo' }, { label: t('pageTitle') }]}
    >
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

      <RanksGrid locale={locale} dbRanks={dbRanks} />

      <AdSlot slot="content-bottom" />
    </PageLayout>
  );
}

/**
 * Shown while the server fetches rank definitions and the current user's
 * achievements. Mirrors `RanksContent` (space-y-8 > PageTitle > PagePanel >
 * SectionTitle + subtitle + SignUpBanner + card grid gap-6) to minimise
 * CLS. PageTitle / SectionTitle / subtitle are all static and resolve from
 * the `ranks` namespace; rank cards (DB-driven) stay as bar placeholders.
 */
async function RanksSkeleton() {
  const locale = await getLocaleFromPathnameHeader();
  const t = await getTranslations({ locale, namespace: 'ranks' });
  const tDojo = await getTranslations({ locale, namespace: 'dojo' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('pageTitle')}</PageTitle>

      <PagePanel>
        <SectionTitle>{t('pageTitle')}</SectionTitle>
        <p className="text-muted-foreground">{t('pageSubtitle')}</p>

        {/* SignUpBanner skeleton */}
        <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2 mb-3" />
          <div className="h-9 bg-muted rounded w-32" />
        </div>

        {/* Rank card grid — one placeholder per ALL_RANK_SLUGS entry */}
        <div className={RANKS_GRID_CLASSES}>
          {Array.from({ length: ALL_RANK_SLUGS.length }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg border border-border bg-card animate-pulse"
            >
              {/* Belt color bar */}
              <div className="h-2 bg-muted" />

              <div className="space-y-4 p-4 sm:p-5">
                {/* Rank name with color badge */}
                <div className="flex items-center gap-3">
                  <div className="size-4 rounded-full bg-muted shrink-0" />
                  <div className="h-5 w-24 bg-muted rounded" />
                </div>

                {/* Requirements placeholder */}
                <div>
                  <div className="h-3 bg-muted rounded w-20 mb-2" />
                  <div className="h-4 bg-muted rounded w-full mb-1" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* Breadcrumb: [Home logo] / Dojo / Ranks. Static crumbs mirror
            `ranks/page.tsx`'s PageLayout breadcrumb. */}
        <nav aria-label="Breadcrumb" className="mb-4 flex min-h-10 items-end">
          <ol className="flex flex-wrap items-center gap-x-1 text-sm">
            <li>
              <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{tDojo('pageTitle')}</span>
            </li>
            <li className="flex items-center">
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{t('pageTitle')}</span>
            </li>
          </ol>
        </nav>
      </PagePanel>
    </div>
  );
}

/**
 * Deliberately NOT a segment-level `loading.tsx`. A `loading.tsx` file here
 * would wrap this whole subtree (including `/dojo/ranks/[slug]`) in a
 * `<Suspense>` boundary, so navigating straight into a specific rank (e.g.
 * via `BeltRankBadge` on the practice page) would flash this 7-card grid
 * skeleton before the detail page's own skeleton mounted. Scoping the
 * boundary inside this page's own JSX means it only exists in the render
 * tree when this exact route is the matched leaf.
 */
export default function RanksPage({ params }: LocalePageProps) {
  return (
    <Suspense fallback={<RanksSkeleton />}>
      <RanksContent params={params} />
    </Suspense>
  );
}
