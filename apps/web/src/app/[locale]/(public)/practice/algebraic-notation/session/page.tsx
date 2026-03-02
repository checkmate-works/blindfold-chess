import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { questions } from '../_data/questions';

const AlgebraicNotation = dynamic(() => import('../_components/AlgebraicNotation'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/algebraic-notation/session' }),
    title: `${t('practice.algebraicNotation.pageTitle')} - ${t('practice.algebraicNotation.session')}`,
    description: t('practice.algebraicNotation.description'),
  };
}

export default async function AlgebraicNotationSessionPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.algebraicNotation.pageTitle')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.algebraicNotation.title'), href: '/practice/algebraic-notation' },
        { label: t('practice.algebraicNotation.session') },
      ]}
    >
      <AlgebraicNotation questions={questions} locale={locale} />
    </PracticeSessionPage>
  );
}
