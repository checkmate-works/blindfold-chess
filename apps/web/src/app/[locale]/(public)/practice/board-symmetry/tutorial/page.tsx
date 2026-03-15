import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardSymmetryTutorialSkipLink } from '../_components/BoardSymmetryTutorialSkipLink';

const BoardSymmetryTutorial = dynamic(() =>
  import('../_components/BoardSymmetryTutorial').then((mod) => mod.BoardSymmetryTutorial)
);

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/board-symmetry/tutorial' }),
    title: `${t('practice.boardSymmetry.title')} - ${t('practice.boardSymmetry.tutorial.title')}`,
    description: t('practice.boardSymmetry.tutorial.description'),
  };
}

export default async function BoardSymmetryTutorialPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.boardSymmetry.title')}</PageTitle>

      <SectionTitle>{t('practice.boardSymmetry.tutorial.title')}</SectionTitle>

      <div className="text-right">
        <BoardSymmetryTutorialSkipLink locale={locale} />
      </div>

      <BoardSymmetryTutorial locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.boardSymmetry.title'), href: '/practice/board-symmetry' },
          { label: t('practice.boardSymmetry.tutorial.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
