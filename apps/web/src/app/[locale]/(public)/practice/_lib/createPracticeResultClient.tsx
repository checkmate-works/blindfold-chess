'use client';

import type { ReactNode } from 'react';

import { notFound, useRouter, useSearchParams } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { LeaderboardPreview } from '@/app/[locale]/(public)/practice/_components/LeaderboardPreview';
import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { SignUpBanner } from '@/app/[locale]/(public)/practice/_components/SignUpBanner';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_lib/get-common-practice-labels';
import type {
  PracticeCompleteLabels,
  ScoreStats,
} from '@/app/[locale]/(public)/practice/_lib/practice-complete-types';
import type { Locale } from '@/app/[locale]/_lib/types';

// ---------------------------------------------------------------------------
// Props type for the generated component
// ---------------------------------------------------------------------------

export type ResultClientProps = {
  locale: Locale;
  adBanner?: ReactNode;
  adBannerWide?: ReactNode;
  adBannerStandard?: ReactNode;
  leaderboardRows?: LeaderboardRow[];
  leaderboardDetailPath?: string;
};

// ---------------------------------------------------------------------------
// Context type passed to config callbacks
// ---------------------------------------------------------------------------

export type ResultContext = {
  searchParams: URLSearchParams;
  locale: Locale;
  /** Module-scoped i18n function (`practice.<i18nKey>`) */
  t: (key: string) => string;
  /** Practice-scoped i18n function (`practice`) */
  tPractice: (key: string, values?: Record<string, string>) => string;
  router: ReturnType<typeof useRouter>;
  /** Parsed score from searchParams */
  score: number;
  /** Parsed total from searchParams */
  total: number;
  /** Parsed time from searchParams */
  timeElapsed: number;
};

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

type ResultClientConfig = {
  /** Module slug used in URLs, e.g. 'coordinate-quiz' */
  moduleSlug: string;
  /** i18n sub-key under 'practice', e.g. 'coordinateQuiz' */
  i18nKey: string;
  /**
   * The i18n key used for the page title in PracticeResultPage.
   * Defaults to 'title'. Override to e.g. 'pageTitle' for modules that differ.
   */
  titleKey?: string;
  /**
   * The i18n key used for the first breadcrumb label (practice link).
   * Defaults to using tPractice('title'). Set to 'navigation' to use
   * tNavigation('practice') instead.
   */
  practiceBreadcrumbSource?: 'practice' | 'navigation';
  /** Optional className for PracticeResultPage container */
  containerClassName?: string;
  /** Optional className for PracticeResultPage divider */
  dividerClassName?: string;
  /**
   * Whether to validate locale against SUPPORTED_LOCALES and call notFound().
   * Defaults to false.
   */
  validateLocale?: boolean;
  /**
   * Override how score and total are resolved.
   * By default they are parsed from `score` and `total` searchParams.
   * Useful for modules that derive score/total from a `data` param (e.g. route-planner).
   */
  resolveScoreTotal?: (searchParams: URLSearchParams) => { score: number; total: number };
  /**
   * Extract extra search params to include in try-again and settings URLs.
   * Return a record of param name to value (null values are excluded from URL).
   */
  extraParams?: (searchParams: URLSearchParams) => Record<string, string | null>;
  /**
   * Build the try-again URL. If not provided, defaults to
   * `/${locale}/practice/${moduleSlug}/challenge/session?${extraParams}`.
   */
  buildTryAgainUrl?: (
    ctx: ResultContext,
    extraParamValues: Record<string, string | null>
  ) => string;
  /**
   * Build the change-settings URL. If not provided, defaults to
   * `/${locale}/practice/${moduleSlug}/challenge?${extraParams}`.
   */
  buildSettingsUrl?: (
    ctx: ResultContext,
    extraParamValues: Record<string, string | null>
  ) => string;
  /**
   * How to navigate on "try again". Defaults to 'router' (router.push).
   * Use 'reload' for full page reload (window.location.href).
   */
  tryAgainNavigation?: 'router' | 'reload';
  /**
   * Override or extend default labels. Receives context and should return
   * a partial labels object to be spread over the defaults.
   */
  labelOverrides?: (ctx: ResultContext) => Partial<PracticeCompleteLabels>;
  /**
   * Override the averageTime text. By default uses `parseFloat(time) / total`.
   * Return undefined to hide the average time display.
   */
  buildAverageTimeText?: (ctx: ResultContext) => string | undefined;
  /**
   * Override scoreStats. By default uses `{ correct: score, incorrect: total - score, total }`.
   */
  buildScoreStats?: (ctx: ResultContext) => ScoreStats;
  /**
   * Render custom children inside PracticeComplete.
   */
  renderChildren?: (ctx: ResultContext) => ReactNode;
  /**
   * Render custom content after PracticeComplete but before leaderboard/ads.
   * adBanner is provided for modules that need to position it within custom content.
   */
  renderAfterComplete?: (ctx: ResultContext, adBanner?: ReactNode) => ReactNode;
  /**
   * Whether to render the SignUpBanner as afterActions. Defaults to true.
   */
  showSignUpBanner?: boolean;
  /**
   * Additional PracticeComplete props (e.g. relatedModule, problemResults,
   * beforeRelatedContent).
   */
  extraCompleteProps?: (
    ctx: ResultContext,
    adProps: { adBanner?: ReactNode; adBannerWide?: ReactNode }
  ) => Record<string, unknown>;
  /**
   * Completely replace the default body (PracticeComplete + leaderboard + ads).
   * When provided, only PracticeResultPage with breadcrumbs is rendered as the
   * wrapper, and the returned ReactNode is rendered as children.
   * Use this for modules that don't use PracticeComplete at all (e.g. knight-tour).
   */
  renderContent?: (ctx: ResultContext, adBanner?: ReactNode) => ReactNode;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildParamString(values: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null) {
      params.set(key, value);
    }
  }
  return params.toString();
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a ResultClient component for a practice module.
 *
 * Handles the common pattern shared across most practice result pages:
 * - Parsing score/total/time from searchParams
 * - Building try-again and settings URLs with extra params
 * - Rendering PracticeResultPage with breadcrumbs
 * - Rendering PracticeComplete with labels, scoreStats, averageTime
 * - Rendering LeaderboardPreview and ad banners
 */
export function createPracticeResultClient(config: ResultClientConfig) {
  const {
    moduleSlug,
    i18nKey,
    titleKey = 'title',
    practiceBreadcrumbSource = 'practice',
    containerClassName,
    dividerClassName,
    validateLocale = false,
    resolveScoreTotal,
    extraParams,
    buildTryAgainUrl,
    buildSettingsUrl,
    tryAgainNavigation = 'router',
    labelOverrides,
    buildAverageTimeText,
    buildScoreStats,
    renderChildren,
    renderAfterComplete,
    showSignUpBanner = true,
    extraCompleteProps,
    renderContent,
  } = config;

  function ResultClient({
    locale,
    adBanner,
    adBannerWide,
    adBannerStandard,
    leaderboardRows,
    leaderboardDetailPath,
  }: ResultClientProps) {
    const t = useTranslations(`practice.${i18nKey}`);
    const tPractice = useTranslations('practice');
    const tNavigation = useTranslations('navigation');
    const router = useRouter();
    const searchParams = useSearchParams();

    // Locale validation (used by square-colors, board-symmetry)
    if (validateLocale) {
      if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
        notFound();
      }
    }

    const resolved = resolveScoreTotal
      ? resolveScoreTotal(searchParams)
      : {
          score: parseInt(searchParams.get('score') || '0', 10),
          total: parseInt(searchParams.get('total') || '0', 10),
        };
    const { score, total } = resolved;
    const timeElapsed = parseInt(searchParams.get('time') || '0', 10);

    // Build context for callbacks
    const ctx: ResultContext = {
      searchParams,
      locale,
      t,
      tPractice: tPractice as unknown as (key: string, values?: Record<string, string>) => string,
      router,
      score,
      total,
      timeElapsed,
    };

    // Breadcrumb label for "Practice" link
    const practiceBreadcrumbLabel =
      practiceBreadcrumbSource === 'navigation' ? tNavigation('practice') : tPractice('title');

    // Full content override — skip PracticeComplete entirely
    if (renderContent) {
      return (
        <PracticeResultPage
          locale={locale}
          title={t(titleKey)}
          breadcrumbItems={[
            { label: practiceBreadcrumbLabel, href: '/practice' },
            { label: t('title'), href: `/practice/${moduleSlug}` },
            { label: tPractice('result') },
          ]}
          containerClassName={containerClassName}
          dividerClassName={dividerClassName}
        >
          {renderContent(ctx, adBanner)}
        </PracticeResultPage>
      );
    }

    // Extract extra params
    const extraParamValues = extraParams ? extraParams(searchParams) : {};

    // Build URLs
    const tryAgainUrl = buildTryAgainUrl
      ? buildTryAgainUrl(ctx, extraParamValues)
      : `/${locale}/practice/${moduleSlug}/challenge/session?${buildParamString(extraParamValues)}`;

    const changeSettingsUrl = buildSettingsUrl
      ? buildSettingsUrl(ctx, extraParamValues)
      : `/${locale}/practice/${moduleSlug}/challenge?${buildParamString(extraParamValues)}`;

    // Average time
    const defaultAverageTimeText = (() => {
      const time = parseFloat(searchParams.get('time') || '0');
      const avg = total > 0 ? (time / total).toFixed(1) : '0.0';
      return total > 0 ? ctx.tPractice('secondsFormat', { seconds: avg }) : undefined;
    })();

    const averageTimeText = buildAverageTimeText
      ? buildAverageTimeText(ctx)
      : defaultAverageTimeText;

    // Score stats
    const scoreStats = buildScoreStats
      ? buildScoreStats(ctx)
      : { correct: score, incorrect: total - score, total };

    // Labels
    const labels = {
      ...getCommonPracticeCompleteLabels(tPractice),
      recreationProgress: tPractice('accuracy'),
      averageTime: tPractice('averageTime'),
      correct: tPractice('correct'),
      incorrect: tPractice('incorrect'),
      ...(labelOverrides ? labelOverrides(ctx) : {}),
    } as PracticeCompleteLabels;

    const onTryAgain =
      tryAgainNavigation === 'reload'
        ? () => {
            window.location.href = tryAgainUrl;
          }
        : () => router.push(tryAgainUrl);

    // Extra PracticeComplete props
    const extraProps = extraCompleteProps
      ? extraCompleteProps(ctx, { adBanner, adBannerWide })
      : {};

    return (
      <PracticeResultPage
        locale={locale}
        title={t(titleKey)}
        breadcrumbItems={[
          { label: practiceBreadcrumbLabel, href: '/practice' },
          { label: t('title'), href: `/practice/${moduleSlug}` },
          { label: tPractice('result') },
        ]}
        containerClassName={containerClassName}
        dividerClassName={dividerClassName}
      >
        <PracticeComplete
          score={score}
          total={total}
          onTryAgain={onTryAgain}
          onExit={() => router.push(changeSettingsUrl)}
          locale={locale}
          labels={labels}
          scoreStats={scoreStats}
          averageTimeText={averageTimeText}
          otherPracticeLink={{
            href: `/${locale}/practice`,
            label: tPractice('doOtherPractice'),
          }}
          afterActions={showSignUpBanner ? <SignUpBanner locale={locale} /> : undefined}
          {...extraProps}
        >
          {renderChildren ? renderChildren(ctx) : undefined}
        </PracticeComplete>

        {renderAfterComplete ? renderAfterComplete(ctx, adBanner) : null}

        {leaderboardRows && leaderboardDetailPath && (
          <LeaderboardPreview
            rows={leaderboardRows}
            detailPath={leaderboardDetailPath}
            locale={locale}
          />
        )}
        {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}
        {adBanner && !adBannerStandard && !renderAfterComplete ? adBanner : null}
      </PracticeResultPage>
    );
  }

  ResultClient.displayName = `ResultClient(${moduleSlug})`;
  return ResultClient;
}
