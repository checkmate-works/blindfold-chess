import { type ComponentType, type ReactNode, Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';
import type { ExpInfo } from '@blindfold-chess/features/exp';

import { getExpInfoBySource } from '@/lib/db/get-exp-info-by-source';
import { createClient } from '@/lib/supabase/server';

import type {
  LeaderboardModule,
  LeaderboardPeriod,
  LeaderboardRow,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale, LocalePageProps, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { PracticeResultLoadingSkeleton } from '../_components/PracticeResultLoadingSkeleton';
import { resolveLeaderboardWithFallback } from './resolveLeaderboardWithFallback';

// ---------------------------------------------------------------------------
// Shared: resolve ExpInfo from ?grant=<challenge_result_id>
// ---------------------------------------------------------------------------

/** Identifier written to `exp_events.source` for a given result flow. */
export type ExpSource = 'challenge_result' | 'practice_result';

/**
 * Read the `grant` query param and refetch the corresponding EXP event for
 * the authenticated user. Returns `null` when unauthenticated, when the
 * param is missing, or when no matching event is found. The lookup is
 * scoped to the current user, so passing another user's `sourceId` yields
 * `null` (authorization guard enforced at the query level).
 *
 * Exported so non-factory result pages (e.g. the puzzle result page, which
 * has its own custom layout that does not flow through
 * `createSimplePracticeResultPage`) can reuse the same grant-resolution
 * logic without duplicating it.
 */
export async function resolveExpInfoFromGrantParam(
  searchParams: Record<string, string | string[] | undefined>,
  expSource: ExpSource
): Promise<ExpInfo | null> {
  const grantRaw = searchParams.grant;
  const grant = typeof grantRaw === 'string' ? grantRaw : undefined;
  if (!grant) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return getExpInfoBySource(user.id, expSource, grant);
}

// ---------------------------------------------------------------------------
// Shared metadata factory
// ---------------------------------------------------------------------------

type MetadataConfig = {
  i18nKey: string;
  canonicalPath: string;
};

export function createPracticeResultMetadata(config: MetadataConfig) {
  return async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'practice' });
    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: resolveTitle(`${t(`${config.i18nKey}.title`)} - ${t('result')}`, locale),
    };
  };
}

// ---------------------------------------------------------------------------
// Simple result page factory (no leaderboard)
// ---------------------------------------------------------------------------

type SimpleResultClientProps = {
  locale: Locale;
  adBanner?: ReactNode;
  adBannerStandard?: ReactNode;
  expInfo?: ExpInfo | null;
};

type SimpleResultPageOptions = {
  /**
   * Source identifier used when looking up EXP events via `?grant=<id>`.
   * Defaults to `'challenge_result'` (matching the historical behavior).
   * Free-play flows that grant EXP via `grantPracticeExp` should pass
   * `'practice_result'`.
   */
  expSource?: ExpSource;
};

export function createSimplePracticeResultPage(
  ResultClient: ComponentType<SimpleResultClientProps>,
  options: SimpleResultPageOptions = {}
) {
  const expSource: ExpSource = options.expSource ?? 'challenge_result';

  return async function Page(props: LocaleSearchPageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    const searchParams = await props.searchParams;
    const expInfo = await resolveExpInfoFromGrantParam(searchParams, expSource);
    return (
      // Fallback mirrors the route `loading.tsx`. The outer `loading.tsx`
      // boundary resolves the instant this server `Page` returns (after the
      // awaits above), but `ResultClient` is a client component whose JS chunk
      // may still be in flight on a soft navigation — without a fallback here
      // the page would flash to bare background (PageTitle + PagePanel all live
      // inside ResultClient) in that gap. Reusing the same skeleton keeps one
      // continuous shape until ResultClient paints.
      <Suspense fallback={<PracticeResultLoadingSkeleton />}>
        <ResultClient
          locale={locale}
          expInfo={expInfo}
          adBanner={
            IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE ? (
              <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
            ) : undefined
          }
          adBannerStandard={
            IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM ? (
              <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
            ) : undefined
          }
        />
      </Suspense>
    );
  };
}

// ---------------------------------------------------------------------------
// Leaderboard result page factory
// ---------------------------------------------------------------------------

type LeaderboardResultClientProps = {
  locale: Locale;
  adBannerWide?: ReactNode;
  adBannerStandard?: ReactNode;
  leaderboardRows?: LeaderboardRow[];
  leaderboardDetailPath?: string;
  leaderboardPeriod?: LeaderboardPeriod;
  expInfo?: ExpInfo | null;
};

type LeaderboardConfig = {
  /** Leaderboard module identifier, e.g. "coordinate_quiz" */
  module: LeaderboardModule;
  /**
   * Extract the leaderboard key from search params.
   * For example, coordinate-quiz uses `orientation`, legal-moves uses `piece`.
   * Return the resolved key string (with fallback applied).
   */
  resolveKey: (searchParams: Record<string, string | string[] | undefined>) => string;
  /** Ad banner slots to render. Defaults to both wide and standard. */
  adSlots?: {
    wide?: boolean;
    standard?: boolean;
  };
};

export function createLeaderboardPracticeResultPage(
  ResultClient: ComponentType<LeaderboardResultClientProps>,
  leaderboard: LeaderboardConfig
) {
  const { wide = true, standard = true } = leaderboard.adSlots ?? {};

  return async function Page(props: LocaleSearchPageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);

    const searchParams = await props.searchParams;
    const key = leaderboard.resolveKey(searchParams);

    const [leaderboardData, expInfo] = await Promise.all([
      resolveLeaderboardWithFallback(leaderboard.module, key),
      resolveExpInfoFromGrantParam(searchParams, 'challenge_result'),
    ]);

    // `adBannerWide` (content-middle) is the top half of a sandwich around the
    // leaderboard. When there are no leaderboard rows, `LeaderboardPreview`
    // renders nothing, so the wide banner would become an orphan "top half". Hide
    // it in that case so the sandwich is all-or-nothing.
    const hasLeaderboardRows = leaderboardData !== null;

    return (
      // See createSimplePracticeResultPage for why this fallback exists: it
      // covers the soft-navigation gap between the route `loading.tsx`
      // resolving and the ResultClient client chunk arriving, so the panel
      // never flashes to bare background.
      <Suspense fallback={<PracticeResultLoadingSkeleton />}>
        <ResultClient
          locale={locale}
          adBannerWide={
            wide && hasLeaderboardRows && (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_MIDDLE) ? (
              <AdSenseGuard slot="content-middle" slotId={ADSENSE_SLOT_CONTENT_MIDDLE ?? ''} />
            ) : undefined
          }
          adBannerStandard={
            standard && (IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) ? (
              <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
            ) : undefined
          }
          leaderboardRows={leaderboardData?.rows}
          leaderboardDetailPath={leaderboardData?.detailPath}
          leaderboardPeriod={leaderboardData?.period}
          expInfo={expInfo}
        />
      </Suspense>
    );
  };
}
