import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle } from '@/app/[locale]/_components';
import CoordinateQuizClient from './_components/CoordinateQuizClient';
import type { Locale } from '../../_lib/types';

interface CoordinateQuizPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: CoordinateQuizPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('practice.coordinateQuiz.title'),
    description: t('practice.coordinateQuiz.description'),
  };
}

export default async function CoordinateQuizPage({ params }: CoordinateQuizPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('practice.coordinateQuiz.title')}</PageTitle>
        <p className="text-muted-foreground">{t('practice.coordinateQuiz.description')}</p>
      </div>
      <CoordinateQuizClient locale={locale} />

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: t('navigation.practice'), href: '/practice' },
            { label: t('practice.coordinateQuiz.title') },
          ]}
          locale={locale}
        />
      </div>
    </>
  );
}
