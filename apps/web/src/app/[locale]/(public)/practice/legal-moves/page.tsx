import { getTranslations } from 'next-intl/server';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMoves } from './_components/LegalMoves';
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
    ...generateCanonicalMetadata({ locale, path: 'practice/legal-moves' }),
    title: t('practice.legalMoves.title'),
    description: t('practice.legalMoves.description'),
  };
}

export default async function LegalMovesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mode } = await searchParams;
  const t = await getTranslations({ locale });
  const initialMode = VALID_MODES.includes(mode as PracticeMode)
    ? (mode as PracticeMode)
    : undefined;

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.legalMoves.title')}</PageTitle>

      <LegalMoves locale={locale} initialMode={initialMode} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.legalMoves.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
