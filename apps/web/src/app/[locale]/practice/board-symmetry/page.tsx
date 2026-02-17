import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryPageContent } from './_components/BoardSymmetryPageContent';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/board-symmetry' }),
    title: t('practice.boardSymmetry.title'),
    description: t('practice.boardSymmetry.description'),
  };
}

export default async function BoardSymmetryPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.boardSymmetry.title')}</PageTitle>

      <BoardSymmetryPageContent locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.boardSymmetry.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
