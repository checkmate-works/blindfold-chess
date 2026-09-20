import { type ComponentType, type ReactNode, Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { ExpInfo } from '@blindfold-chess/features/exp';

import { getNativeTileCreatives } from '@/lib/ads/ad';
import { PRACTICE_RESULT_NATIVE_AD_SLOT } from '@/lib/ads/registry';
import { getOptionalUser } from '@/lib/auth';
import { getExpInfoBySource } from '@/lib/db/get-exp-info-by-source';
import type { ScoreComparison } from '@/lib/db/score-comparison';
import { getScoreComparison } from '@/lib/db/score-comparison';

import type {
  LeaderboardModule,
  LeaderboardPeriod,
  LeaderboardRow,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { NativeAdTile } from '@/app/[locale]/_components/NativeAdTile';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale, LocalePageProps, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

import { GuestSignUpBanner } from '../_components/GuestSignUpBanner';
import { PracticeResultLoadingSkeleton } from '../_components/PracticeResultLoadingSkeleton';
import { RecordSection } from '../_components/RecordSection';
import { resolveLeaderboardWithFallback } from './resolveLeaderboardWithFallback';

type SearchParams = Record<string, string | string[] | undefined>;

// ---------------------------------------------------------------------------
// Shared: resolve ExpInfo from ?grant=<challenge_result_id>
// ---------------------------------------------------------------------------

/** Identifier written to `exp_events.source` for a given result flow. */
export type ExpSource = 'challenge_result' | 'practice_result';

/** The `?grant=<challenge_result_id>` param, when present and well-formed. */
function readGrantParam(searchParams: SearchParams): string | undefined {
  const grantRaw = searchParams.grant;
  return typeof grantRaw === 'string' ? grantRaw : undefined;
}

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
  searchParams: SearchParams,
  expSource: ExpSource
): Promise<ExpInfo | null> {
  const grant = readGrantParam(searchParams);
  if (!grant) return null;

  const user = await getOptionalUser();
  if (!user) return null;

  return getExpInfoBySource(user.id, expSource, grant);
}

// ---------------------------------------------------------------------------
// Shared: the auth-exclusive slot under the EXP card
// ---------------------------------------------------------------------------

/**
 * The slot directly under the EXP card holds exactly one of two blocks:
 * the sign-up banner for guests, or (on modules that record to
 * `challenge_results`) the player's record comparison. Which one is decided
 * HERE, on the server, from the same `getOptionalUser()` read the EXP card
 * already needs — not in a client component gated on `useAuth()`.
 *
 * That placement is what makes the result page paint without a layout
 * shift: the route's `loading.tsx` resolves the user and reserves the
 * matching placeholder, and the real page then renders the matching block
 * in the initial HTML. The previous client-gated banner rendered nothing
 * until the auth round-trip resolved and then pushed the buttons down.
 * (The `[locale]` static-page rule that keeps auth UI client-side does not
 * apply: every result route is `force-dynamic`.)
 */
type AuthSlot = {
  signUpBanner: ReactNode | undefined;
  recordSection: ReactNode | undefined;
};

/**
 * History lookup is best-effort: a failed read logs and falls back to an
 * empty comparison, so a signed-in player still gets the card (with dashes)
 * rather than a placeholder that collapses into nothing — which would be the
 * layout shift all of this exists to prevent.
 */
async function fetchComparisonOrEmpty(
  userId: string,
  menuType: LeaderboardModule,
  leaderboardKey: string,
  grant: string | undefined
): Promise<ScoreComparison> {
  try {
    return await getScoreComparison(userId, menuType, leaderboardKey, grant);
  } catch (error) {
    console.error('Failed to load score comparison for the result page:', error);
    return { current: undefined, previousBest: undefined, previousLast: undefined };
  }
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

/**
 * The result screen's native ad card, or nothing.
 *
 * Read here rather than in either factory's body so both give every practice
 * module the same placement from the same pool — a module that opts into a
 * result page at all gets it, and there is no per-module wiring to forget.
 *
 * Viewer-independent, like the other surfaces that read a pool directly: the
 * per-reader hide is the `bfc_ads_hidden` cookie and the CSS rule
 * `NativeAdTile` owns. The `link` variant is the `CardLink` shape this screen
 * already speaks in.
 */
async function resolvePracticeResultNativeAd(locale: Locale): Promise<ReactNode> {
  const [creative] = await getNativeTileCreatives(PRACTICE_RESULT_NATIVE_AD_SLOT, locale);
  return creative ? <NativeAdTile creative={creative} variant="link" /> : undefined;
}

// ---------------------------------------------------------------------------
// Simple result page factory (no leaderboard)
// ---------------------------------------------------------------------------

type SimpleResultClientProps = {
  locale: Locale;
  expInfo?: ExpInfo | null;
  /** Server-decided guest banner; `undefined` for a signed-in viewer. */
  signUpBanner?: ReactNode;
  /** The screen's native ad card; `undefined` when the slot's pool is empty. */
  nativeAd?: ReactNode;
};

type SimpleResultPageOptions = {
  /**
   * Source identifier used when looking up EXP events via `?grant=<id>`.
   * Defaults to `'challenge_result'` (matching the historical behavior).
   * Free-play flows that grant EXP via `grantPracticeExp` should pass
   * `'practice_result'`.
   */
  expSource?: ExpSource;
  /**
   * Fallback shown while the client `ResultClient` chunk is in flight on a soft
   * navigation (see the inner `<Suspense>` below). Defaults to the shared
   * `PracticeResultLoadingSkeleton`. Pass the module's own loading skeleton when
   * its `loading.tsx` is bespoke, so the fallback matches the route loading
   * state instead of jumping shape.
   */
  loadingFallback?: ReactNode;
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
    const grant = readGrantParam(searchParams);
    const user = await getOptionalUser();
    const [expInfo, nativeAd] = await Promise.all([
      user && grant ? getExpInfoBySource(user.id, expSource, grant) : null,
      resolvePracticeResultNativeAd(locale),
    ]);
    return (
      // Fallback mirrors the route `loading.tsx`. The outer `loading.tsx`
      // boundary resolves the instant this server `Page` returns (after the
      // awaits above), but `ResultClient` is a client component whose JS chunk
      // may still be in flight on a soft navigation — without a fallback here
      // the page would flash to bare background (PageTitle + PagePanel all live
      // inside ResultClient) in that gap. Reusing the same skeleton keeps one
      // continuous shape until ResultClient paints.
      <Suspense fallback={options.loadingFallback ?? <PracticeResultLoadingSkeleton />}>
        <ResultClient
          locale={locale}
          expInfo={expInfo}
          nativeAd={nativeAd}
          signUpBanner={user ? undefined : <GuestSignUpBanner locale={locale} />}
        />
      </Suspense>
    );
  };
}

// ---------------------------------------------------------------------------
// Leaderboard result page factory
// ---------------------------------------------------------------------------

type LeaderboardResultClientProps = AuthSlot & {
  locale: Locale;
  leaderboardRows?: LeaderboardRow[];
  leaderboardDetailPath?: string;
  leaderboardPeriod?: LeaderboardPeriod;
  expInfo?: ExpInfo | null;
  /** The screen's native ad card; `undefined` when the slot's pool is empty. */
  nativeAd?: ReactNode;
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
  /**
   * Fallback shown while the client `ResultClient` chunk is in flight on a soft
   * navigation (see the inner `<Suspense>` below). Defaults to the shared
   * `PracticeResultLoadingSkeleton`. Pass the module's own loading skeleton when
   * its `loading.tsx` is bespoke (e.g. route-planner), so the fallback matches
   * the route loading state instead of jumping shape.
   */
  loadingFallback?: ReactNode;
};

export function createLeaderboardPracticeResultPage(
  ResultClient: ComponentType<LeaderboardResultClientProps>,
  leaderboard: LeaderboardConfig
) {
  return async function Page(props: LocaleSearchPageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);

    const searchParams = await props.searchParams;
    const key = leaderboard.resolveKey(searchParams);
    const grant = readGrantParam(searchParams);

    const user = await getOptionalUser();
    const [leaderboardData, expInfo, comparison, nativeAd] = await Promise.all([
      resolveLeaderboardWithFallback(leaderboard.module, key),
      user && grant ? getExpInfoBySource(user.id, 'challenge_result', grant) : null,
      user ? fetchComparisonOrEmpty(user.id, leaderboard.module, key, grant) : undefined,
      resolvePracticeResultNativeAd(locale),
    ]);

    const authSlot: AuthSlot = user
      ? {
          signUpBanner: undefined,
          recordSection: comparison && (
            <RecordSection locale={locale} menuType={leaderboard.module} comparison={comparison} />
          ),
        }
      : { signUpBanner: <GuestSignUpBanner locale={locale} />, recordSection: undefined };

    return (
      // See createSimplePracticeResultPage for why this fallback exists: it
      // covers the soft-navigation gap between the route `loading.tsx`
      // resolving and the ResultClient client chunk arriving, so the panel
      // never flashes to bare background.
      <Suspense fallback={leaderboard.loadingFallback ?? <PracticeResultLoadingSkeleton />}>
        <ResultClient
          locale={locale}
          leaderboardRows={leaderboardData?.rows}
          leaderboardDetailPath={leaderboardData?.detailPath}
          leaderboardPeriod={leaderboardData?.period}
          expInfo={expInfo}
          nativeAd={nativeAd}
          {...authSlot}
        />
      </Suspense>
    );
  };
}
