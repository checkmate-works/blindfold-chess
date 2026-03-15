import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import DiagonalQuiz from './_components/DiagonalQuiz';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz' }),
    title: t('practice.diagonalQuiz.title'),
    description: t('practice.diagonalQuiz.description'),
  };
}

export default async function DiagonalQuizPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.diagonalQuiz.title')}</PageTitle>

      <DiagonalQuiz locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.diagonalQuiz.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
