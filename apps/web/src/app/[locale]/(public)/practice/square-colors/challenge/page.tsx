import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { SquareColorsChallengeSetup } from './_components/SquareColorsChallengeSetup';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/square-colors/challenge' }),
    title: `${t('practice.squareColors.title')} - ${t('practice.modeTimed')}`,
    description: t('practice.squareColors.description'),
  };
}

export default async function SquareColorsChallengePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.squareColors.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.squareColors.title'), href: '/practice/square-colors' },
        { label: t('practice.modeTimed') },
      ]}
    >
      <SquareColorsChallengeSetup locale={locale} />
    </PracticeSessionPage>
  );
}
