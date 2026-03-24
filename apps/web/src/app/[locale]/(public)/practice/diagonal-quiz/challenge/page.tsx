import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SUPPORTED_LOCALES } from '@/config';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizChallengeSetup } from './_components/DiagonalQuizChallengeSetup';

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
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz/challenge' }),
    title: `${t('practice.diagonalQuiz.title')} - ${t('practice.modeTimed')}`,
    description: t('practice.diagonalQuiz.description'),
  };
}

export default async function DiagonalQuizChallengePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.diagonalQuiz.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.diagonalQuiz.title'), href: '/practice/diagonal-quiz' },
        { label: t('practice.modeTimed') },
      ]}
    >
      <DiagonalQuizChallengeSetup locale={locale} />
    </PracticeSessionPage>
  );
}
