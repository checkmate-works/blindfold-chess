import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { Divider, PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
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

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const title = `${t('practice.boardSymmetry.title')} - ${t('practice.boardSymmetry.tutorial.title')}`;
  const description = t('practice.boardSymmetry.tutorial.description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: 'practice/board-symmetry/tutorial',
      title,
      description,
    }),
    title,
    description,
  };
}

export default async function BoardSymmetryTutorialPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <PagePanel>
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
    </PagePanel>
  );
}
