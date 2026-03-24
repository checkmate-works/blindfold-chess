import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import CoordinateQuiz from './_components/CoordinateQuiz';

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
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz' }),
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>

      <PagePanel>
        <CoordinateQuiz locale={locale} />

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
