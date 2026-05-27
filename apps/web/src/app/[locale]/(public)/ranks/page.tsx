/**
 * Ranks Page
 *
 * @description
 * Displays all belt ranks and their requirements in the blindfold chess
 * training progression system. Shows defined ranks with their score
 * thresholds and visual state indicators: achieved ✓, next (actionable),
 * locked 🔒 (conditions not yet defined), or Coming Soon (not in DB).
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

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { PageLayout, SectionTitle } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { SignUpBanner } from '@/app/[locale]/_components/SignUpBanner';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { RanksGrid } from './_components/RanksGrid';
import { getAllRanks } from './_lib/queries';

export const revalidate = 1800; // 30 minutes — ranks are code-seeded; long TTL is fine

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.ranks', path: 'ranks' });
}

export default async function RanksPage({ params }: LocalePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ranks' });

  const dbRanks = await getAllRanks();

  return (
    <PageLayout title={t('pageTitle')} locale={locale} breadcrumb={[{ label: t('pageTitle') }]}>
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

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PageLayout>
  );
}
