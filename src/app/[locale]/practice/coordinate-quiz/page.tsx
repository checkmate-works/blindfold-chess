import { getTranslations } from 'next-intl/server';
import { Breadcrumb, PageTitle, Divider } from '@/app/[locale]/_components';
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

      <p className="text-muted-foreground">{t('practice.coordinateQuiz.description')}</p>

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
