import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeSessionPage } from '@/app/[locale]/practice/_components/PracticeSessionPage';

const SquareColorsChallenge = dynamic(() => import('./_components/SquareColorsChallenge'));

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/square-colors/challenge' }),
    title: `${t('practice.squareColors.title')} - ${t('practice.squareColors.session')}`,
    description: t('practice.squareColors.description'),
  };
}

export default async function SquareColorsChallengePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.squareColors.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.squareColors.title'), href: '/practice/square-colors' },
        { label: t('practice.squareColors.session') },
      ]}
    >
      <SquareColorsChallenge locale={locale} />
    </PracticeSessionPage>
  );
}
