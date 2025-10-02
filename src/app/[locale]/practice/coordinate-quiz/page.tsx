import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle, PageDescription, Divider } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '../../_lib/metadata';
import CoordinateQuiz from './_components/CoordinateQuiz';
import type { Locale } from '../../_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/coordinate-quiz' }),
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>

      <PageDescription>{t('practice.coordinateQuiz.description')}</PageDescription>

      <CoordinateQuiz locale={locale} />

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
