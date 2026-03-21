import { getTranslations } from 'next-intl/server';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import CoordinateQuiz from './_components/CoordinateQuiz';
import type { PracticeMode } from './_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    mode?: string;
  }>;
};

const VALID_MODES: PracticeMode[] = ['training', 'timed', 'rush'];

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz' }),
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mode } = await searchParams;
  const t = await getTranslations({ locale });
  const initialMode = VALID_MODES.includes(mode as PracticeMode)
    ? (mode as PracticeMode)
    : undefined;

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>

      <CoordinateQuiz locale={locale} initialMode={initialMode} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.coordinateQuiz.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
