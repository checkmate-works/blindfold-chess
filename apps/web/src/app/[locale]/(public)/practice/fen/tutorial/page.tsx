import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const FenTutorial = dynamic(() =>
  import('../_components/FenTutorial').then((mod) => mod.FenTutorial)
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
    ...generateCanonicalMetadata({ locale, path: 'practice/fen/tutorial' }),
    title: `${t('practice.fen.title')} - ${t('practice.fen.tutorial.title')}`,
    description: t('practice.fen.tutorial.description'),
  };
}

export default async function FenTutorialPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.fen.title')}</PageTitle>

      <SectionTitle>{t('practice.fen.tutorial.title')}</SectionTitle>

      <div className="text-right">
        <TutorialSkipLink locale={locale} />
      </div>

      <FenTutorial locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.fen.title'), href: '/practice/fen' },
          { label: t('practice.fen.tutorial.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
