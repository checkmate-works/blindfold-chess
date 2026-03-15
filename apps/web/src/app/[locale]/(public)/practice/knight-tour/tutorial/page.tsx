import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const KnightTourTutorial = dynamic(() =>
  import('../_components/KnightTourTutorial').then((mod) => mod.KnightTourTutorial)
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
    ...generateCanonicalMetadata({ locale, path: 'practice/knight-tour/tutorial' }),
    title: `${t('practice.knightTour.title')} - ${t('practice.knightTour.tutorial.title')}`,
    description: t('practice.knightTour.tutorial.description'),
  };
}

export default async function KnightTourTutorialPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.knightTour.title')}</PageTitle>

      <SectionTitle>{t('practice.knightTour.tutorial.title')}</SectionTitle>

      <div className="text-right">
        <TutorialSkipLink locale={locale} />
      </div>

      <KnightTourTutorial locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.knightTour.title'), href: '/practice/knight-tour' },
          { label: t('practice.knightTour.tutorial.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
