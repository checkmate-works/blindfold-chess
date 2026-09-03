import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { ServerTranslator } from '@/i18n/translator';

import type { LeaderboardModule } from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { LeaderboardPreviewLoader } from '@/app/[locale]/(public)/practice/_components/LeaderboardPreviewLoader';
import { PageLayout } from '@/app/[locale]/_components';
import { AdSlot } from '@/app/[locale]/_components/AdSense/AdSlot';
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
  renderArticles: (t: ServerTranslator, locale: Locale) => ReactNode;
  /**
   * Optional element rendered to the right of the page title (typically a
   * `HelpTourButton`). Returning `null` skips it entirely — useful when the
   * page only ships the help tour for some locales.
   */
  renderTitleAction?: (t: ServerTranslator, locale: Locale) => ReactNode;
  /**
   * Optional TOP3 teaser. Loaded client-side after hydration, not rendered on
   * the server: reading the ranking during the render pinned these pages to a
   * one-minute ISR interval and let ordinary gameplay invalidate them. See
   * `_actions/getLeaderboardPreview`.
   */
  leaderboard?: {
    module: LeaderboardModule;
    defaultKey: string;
  };
};

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

    const titleAction = config.renderTitleAction?.(t, locale);

    return (
      <PageLayout
        title={t(`practice.${config.i18nKey}.title`)}
        titleAction={titleAction}
        locale={locale}
        breadcrumb={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t(`practice.${config.i18nKey}.title`) },
        ]}
      >
        {config.renderSetup(locale)}

        {config.renderArticles(t, locale)}

        {config.leaderboard && (
          <LeaderboardPreviewLoader
            module={config.leaderboard.module}
            defaultKey={config.leaderboard.defaultKey}
            locale={locale}
          />
        )}

        <AdSlot slot="content-bottom" />
      </PageLayout>
    );
  }

  return { generateMetadata, Page };
}
