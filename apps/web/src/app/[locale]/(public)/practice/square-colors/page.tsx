import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import SquareColors from './_components/SquareColors';
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/square-colors' }),
    title: t('practice.squareColors.title'),
    description: t('practice.squareColors.description'),
  };
}

export default async function SquareColorsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { mode } = await searchParams;
  const t = await getTranslations({ locale });
  const initialMode = VALID_MODES.includes(mode as PracticeMode)
    ? (mode as PracticeMode)
    : undefined;

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.squareColors.title')}</PageTitle>

      <SquareColors locale={locale} initialMode={initialMode} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.squareColors.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
