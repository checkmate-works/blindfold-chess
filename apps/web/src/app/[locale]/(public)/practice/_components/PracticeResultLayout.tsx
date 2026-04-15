'use client';

import type { ReactNode } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { ExpInfo } from '@blindfold-chess/features/exp';

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

export type PracticeResultLayoutProps = {
  locale: Locale;
  /** Page title shown above the panel (typically the module name). */
  title: string;
  /** i18n sub-key under `practice`, e.g. `coordinateQuiz`. Used to derive
   *  the breadcrumb label and the `practice/<slug>` breadcrumb target. */
  moduleSlug: string;
  moduleI18nKey: string;
  /** If set, the first breadcrumb uses `navigation.practice` instead of
   *  `practice.title`. Defaults to `'practice'`. */
  practiceBreadcrumbSource?: 'practice' | 'navigation';
  containerClassName?: string;
  dividerClassName?: string;
  /** Replaces the standard PracticeComplete body entirely. When provided,
   *  none of the complete/leaderboard/signup-banner props below are rendered
   *  and the children are responsible for the full panel body. */
  children?: ReactNode;
  /** Optional ad banner rendered at the bottom of the panel. */
  adBannerStandard?: ReactNode;
};

/**
 * Slot-based wrapper for practice result pages.
 *
 * This is the "new" layout component introduced in Batch 7 as a replacement
 * for the `createPracticeResultClient` factory. It only owns the outer shell
 * (title, breadcrumbs, optional bottom ad); call sites compose the body with
 * JSX instead of passing a config object of callbacks.
 *
 * Migration of existing result clients from the factory to this component
 * is deferred — see `createPracticeResultClient.tsx` for the legacy path.
 */
export function PracticeResultLayout({
  locale,
  title,
  moduleSlug,
  moduleI18nKey,
  practiceBreadcrumbSource = 'practice',
  containerClassName,
  dividerClassName,
  children,
  adBannerStandard,
}: PracticeResultLayoutProps) {
  const tPractice = useTranslations('practice');
  const tNavigation = useTranslations('navigation');
  const tModule = useTranslations(`practice.${moduleI18nKey}`);

  const practiceBreadcrumbLabel =
    practiceBreadcrumbSource === 'navigation' ? tNavigation('practice') : tPractice('title');

  return (
    <PracticeResultPage
      locale={locale}
      title={title}
      breadcrumbItems={[
        { label: practiceBreadcrumbLabel, href: '/practice' },
        { label: tModule('title'), href: `/practice/${moduleSlug}` },
        { label: tPractice('result') },
      ]}
      containerClassName={containerClassName}
      dividerClassName={dividerClassName}
    >
      {children}
      {adBannerStandard && <div className="mt-8">{adBannerStandard}</div>}
    </PracticeResultPage>
  );
}

// ---------------------------------------------------------------------------
// Standard body slot: reusable "PracticeComplete + leaderboard + signup banner"
// block that most modules share. Call sites pass one of these as children of
// <PracticeResultLayout> when they don't need a fully custom body.
// ---------------------------------------------------------------------------

export type StandardPracticeResultBodyProps = {
  locale: Locale;
  score: number;
  total: number;
  scoreStats?: ScoreStats;
  averageTimeText?: string;
  /** Absolute URL to re-run the challenge. */
  tryAgainUrl: string;
  /** Absolute URL to change challenge settings. */
  changeSettingsUrl: string;
  /** How to navigate on try-again. Defaults to router.push. */
  tryAgainNavigation?: 'router' | 'reload';
  expInfo?: ExpInfo | null;
  leaderboardRows?: LeaderboardRow[];
  leaderboardDetailPath?: string;
  adBanner?: ReactNode;
  adBannerWide?: ReactNode;
  /** Override/extend default PracticeComplete labels. */
  labelOverrides?: Partial<PracticeCompleteLabels>;
  /** Whether to render the SignUpBanner as afterActions. Defaults to true. */
  showSignUpBanner?: boolean;
  /** Additional PracticeComplete props (e.g. relatedModule, problemResults). */
  extraCompleteProps?: Record<string, unknown>;
  /** Custom children rendered inside PracticeComplete. */
  children?: ReactNode;
  /** Custom content rendered after PracticeComplete and before leaderboard. */
  afterComplete?: ReactNode;
};

/**
 * Standard body block for practice result pages: renders `PracticeComplete`,
 * optional leaderboard preview, and trailing ad banner.
 */
export function StandardPracticeResultBody({
  locale,
  score,
  total,
  scoreStats,
  averageTimeText,
  tryAgainUrl,
  changeSettingsUrl,
  tryAgainNavigation = 'router',
  expInfo = null,
  leaderboardRows,
  leaderboardDetailPath,
  adBanner,
  adBannerWide: _adBannerWide,
  labelOverrides,
  showSignUpBanner = true,
  extraCompleteProps,
  children,
  afterComplete,
}: StandardPracticeResultBodyProps) {
  const tPractice = useTranslations('practice');
  const router = useRouter();
  // `useSearchParams` is retained so the component stays a client-component
  // "result page" peer and composes cleanly with existing result clients.
  useSearchParams();

  const onTryAgain =
    tryAgainNavigation === 'reload'
      ? () => {
          window.location.href = tryAgainUrl;
        }
      : () => router.push(tryAgainUrl);

  const labels = {
    ...getCommonPracticeCompleteLabels(tPractice),
    recreationProgress: tPractice('accuracy'),
    averageTime: tPractice('averageTime'),
    correct: tPractice('correct'),
    incorrect: tPractice('incorrect'),
    ...(labelOverrides ?? {}),
  } as PracticeCompleteLabels;

  const resolvedScoreStats = scoreStats ?? {
    correct: score,
    incorrect: total - score,
    total,
  };

  return (
    <>
      <PracticeComplete
        score={score}
        total={total}
        onTryAgain={onTryAgain}
        onExit={() => router.push(changeSettingsUrl)}
        locale={locale}
        labels={labels}
        scoreStats={resolvedScoreStats}
        averageTimeText={averageTimeText}
        expInfo={expInfo}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
        afterActions={showSignUpBanner ? <SignUpBanner locale={locale} /> : undefined}
        {...(extraCompleteProps ?? {})}
      >
        {children}
      </PracticeComplete>

      {afterComplete}

      {leaderboardRows && leaderboardDetailPath && (
        <LeaderboardPreview
          rows={leaderboardRows}
          detailPath={leaderboardDetailPath}
          locale={locale}
        />
      )}
      {adBanner && !afterComplete ? adBanner : null}
    </>
  );
}
