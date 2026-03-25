import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { shouldShowAds } from '@/lib/ad';

import { CardLink, Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import CoordinateQuiz from './_components/CoordinateQuiz';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz' }),
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const showAds = await shouldShowAds();

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>

      <PagePanel>
        <CoordinateQuiz locale={locale} />

        {showAds && <AdBanner slot="banner-wide" locale={locale} />}

        <div className="mt-8 space-y-4">
          <SectionTitle>{t('practice.coordinateQuiz.relatedArticles')}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CardLink
              href="/learn/coordinates/coordinate-confusion"
              icon="🔄"
              title={t('practice.coordinateQuiz.articles.coordinateConfusion.title')}
              description={t('practice.coordinateQuiz.articles.coordinateConfusion.description')}
              locale={locale}
            />
            <CardLink
              href="/learn/coordinates/anchor-squares"
              icon="⚓"
              title={t('practice.coordinateQuiz.articles.anchorSquares.title')}
              description={t('practice.coordinateQuiz.articles.anchorSquares.description')}
              locale={locale}
            />
            <CardLink
              href="/learn/notation/algebraic-notation"
              icon="🔤"
              title={t('practice.coordinateQuiz.articles.algebraicNotation.title')}
              description={t('practice.coordinateQuiz.articles.algebraicNotation.description')}
              locale={locale}
            />
          </div>
        </div>

        {showAds && <AdBanner slot="banner-standard" locale={locale} />}

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.coordinateQuiz.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
