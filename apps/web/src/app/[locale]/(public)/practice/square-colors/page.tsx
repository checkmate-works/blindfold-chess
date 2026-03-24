import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { CardLink, Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { AdBanner } from '@/app/[locale]/_components/AdBanner';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsSetup } from './_components/SquareColorsSetup';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/square-colors' }),
    title: t('practice.squareColors.title'),
    description: t('practice.squareColors.description'),
  };
}

export default async function SquareColorsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.squareColors.title')}</PageTitle>

      <PagePanel>
        <SquareColorsSetup locale={locale} />

        <AdBanner slot="banner-wide" locale={locale} />

        <PracticePanel className="mt-8 p-6 space-y-3">
          <SectionTitle>{t('practice.squareColors.requiredKnowledge')}</SectionTitle>
          <CardLink
            href="/learn/coordinates/square-colors"
            icon="🎨"
            title={t('practice.squareColors.viewArticle')}
            description={t('practice.squareColors.articleDescription')}
            locale={locale}
          />
        </PracticePanel>

        <AdBanner slot="banner-standard" locale={locale} />

        <Divider />

        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.squareColors.title') },
          ]}
          locale={locale}
        />
      </PagePanel>
    </div>
  );
}
