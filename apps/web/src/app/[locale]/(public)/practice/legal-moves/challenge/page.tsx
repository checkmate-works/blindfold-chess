import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesChallengeSetup } from './_components/LegalMovesChallengeSetup';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    piece?: string;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves/challenge' }),
    title: `${t('practice.legalMoves.title')} - ${t('practice.modeTimed')}`,
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesChallengePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { piece } = await searchParams;
  const t = await getTranslations({ locale });

  const validPiece = piece ?? 'random';

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.legalMoves.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.legalMoves.title'), href: '/practice/legal-moves' },
        { label: t('practice.modeTimed') },
      ]}
    >
      <LegalMovesChallengeSetup locale={locale} piece={validPiece} />
    </PracticeSessionPage>
  );
}
