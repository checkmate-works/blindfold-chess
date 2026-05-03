import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import type {
  LeaderboardModule,
  LeaderboardRow,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { buildDetailPath } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { LeaderboardPreview } from '@/app/[locale]/(public)/practice/_components/LeaderboardPreview';
import { PageLayout } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

type PracticeTopPageConfig = {
  /** i18n key under "practice" namespace, e.g. "coordinateQuiz" */
  i18nKey: string;
  /** Canonical path without leading slash, e.g. "practice/coordinate-quiz" */
  canonicalPath: string;
  /** Render the setup/main component. Receives locale. */
  renderSetup: (locale: Locale) => ReactNode;
  /** Render the articles section. Receives the translation function. */
  renderArticles: (t: Awaited<ReturnType<typeof getTranslations>>, locale: Locale) => ReactNode;
  /** Optional leaderboard preview (reuses LeaderboardPreview from result pages) */
  leaderboard?: {
    module: LeaderboardModule;
    defaultKey: string;
  };
};

async function resolveLeaderboardData(
  lb: PracticeTopPageConfig['leaderboard']
): Promise<{ rows: LeaderboardRow[]; detailPath: string } | null> {
  if (!lb) return null;
  const result = await getLeaderboard(lb.module, lb.defaultKey, 'weekly', 1);
  return {
    rows: result.rows.slice(0, 3),
    detailPath: buildDetailPath('weekly', lb.module, lb.defaultKey),
  };
}

export function createPracticeTopPage(config: PracticeTopPageConfig) {
  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });
    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: resolveTitle(t(`practice.${config.i18nKey}.title`), locale),
      description: t(`practice.${config.i18nKey}.description`),
    };
  }

  async function Page({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const leaderboardData = await resolveLeaderboardData(config.leaderboard);

    return (
      <PageLayout
        title={t(`practice.${config.i18nKey}.title`)}
        locale={locale}
        breadcrumb={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t(`practice.${config.i18nKey}.title`) },
        ]}
      >
        {config.renderSetup(locale)}

        {config.renderArticles(t, locale)}

        {leaderboardData && (
          <LeaderboardPreview
            rows={leaderboardData.rows}
            detailPath={leaderboardData.detailPath}
            locale={locale}
          />
        )}

        {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
          <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
        )}
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}
