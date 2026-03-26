import { type ComponentType, type ReactNode, Suspense } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import type { LeaderboardModule, LeaderboardRow } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale, LocalePageProps, LocaleSearchPageProps } from '@/app/[locale]/_lib/types';

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
      title: `${t(`${config.i18nKey}.title`)} - ${t('result')}`,
    };
  };
}

// ---------------------------------------------------------------------------
// Simple result page factory (no leaderboard)
// ---------------------------------------------------------------------------

type SimpleResultClientProps = {
  locale: Locale;
  adBanner?: ReactNode;
};

export function createSimplePracticeResultPage(
  ResultClient: ComponentType<SimpleResultClientProps>
) {
  return async function Page(props: LocalePageProps) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    return (
      <>
        <Suspense>
          <ResultClient locale={locale} adBanner={<AdBannerGuard slot="banner-wide" />} />
        </Suspense>
        <AdBannerGuard slot="banner-standard" />
      </>
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

    const leaderboardResult = await getLeaderboard(leaderboard.module, key, 'weekly', 1);
    const leaderboardRows = leaderboardResult.rows.slice(0, 3);
    const leaderboardDetailPath = buildDetailPath('weekly', leaderboard.module, key);

    return (
      <Suspense>
        <ResultClient
          locale={locale}
          adBannerWide={wide ? <AdBannerGuard slot="banner-wide" /> : undefined}
          adBannerStandard={standard ? <AdBannerGuard slot="banner-standard" /> : undefined}
          leaderboardRows={leaderboardRows}
          leaderboardDetailPath={leaderboardDetailPath}
        />
      </Suspense>
    );
  };
}
