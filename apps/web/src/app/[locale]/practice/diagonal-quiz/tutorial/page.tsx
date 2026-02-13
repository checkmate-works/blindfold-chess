import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizTutorial } from '../_components/DiagonalQuizTutorial';
import { DiagonalQuizTutorialSkipLink } from '../_components/DiagonalQuizTutorialSkipLink';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/diagonal-quiz/tutorial' }),
    title: `${t('practice.diagonalQuiz.title')} - ${t('practice.diagonalQuiz.tutorial.title')}`,
    description: t('practice.diagonalQuiz.description'),
  };
}

export default async function DiagonalQuizTutorialPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.diagonalQuiz.title')}</PageTitle>

      <SectionTitle>{t('practice.diagonalQuiz.tutorial.title')}</SectionTitle>

      <div className="text-right">
        <DiagonalQuizTutorialSkipLink locale={locale} />
      </div>

      <DiagonalQuizTutorial locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.diagonalQuiz.title'), href: '/practice/diagonal-quiz' },
          { label: t('practice.diagonalQuiz.tutorial.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
