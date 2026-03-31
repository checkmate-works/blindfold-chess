import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { AdBannerGuard } from '@/app/[locale]/_components/AdBanner/AdBannerGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
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
};

export function createPracticeTopPage(config: PracticeTopPageConfig) {
  const dynamic = 'force-dynamic' as const;

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });
    return {
      ...generateCanonicalMetadata({ locale, path: config.canonicalPath }),
      title: t(`practice.${config.i18nKey}.title`),
      description: t(`practice.${config.i18nKey}.description`),
    };
  }

  async function Page({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    return (
      <div className="space-y-8">
        <PageTitle>{t(`practice.${config.i18nKey}.title`)}</PageTitle>

        <PagePanel>
          {config.renderSetup(locale)}

          <AdBannerGuard slot="banner-wide" />

          {config.renderArticles(t, locale)}

          <AdBannerGuard slot="banner-standard" />

          <Divider />

          <Breadcrumb
            items={[
              { label: t('navigation.practice'), href: '/practice' },
              { label: t(`practice.${config.i18nKey}.title`) },
            ]}
            locale={locale}
          />
        </PagePanel>
      </div>
    );
  }

  return { dynamic, generateMetadata, Page };
}
