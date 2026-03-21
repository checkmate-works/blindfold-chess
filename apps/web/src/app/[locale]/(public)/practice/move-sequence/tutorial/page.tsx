import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { SUPPORTED_LOCALES } from '@/config';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TutorialSectionTitle } from '../_components/TutorialSectionTitle';
import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const MoveSequenceTutorial = dynamic(() =>
  import('../_components/MoveSequenceTutorial').then((mod) => mod.MoveSequenceTutorial)
);

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/move-sequence/tutorial' }),
    title: `${t('practice.moveSequence.title')} - ${t('practice.moveSequence.tutorial.title')}`,
    description: t('practice.moveSequence.tutorial.description'),
  };
}

export default async function MoveSequenceTutorialPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.moveSequence.title')}</PageTitle>

      <TutorialSectionTitle />

      <div className="text-right">
        <TutorialSkipLink locale={locale} />
      </div>

      <MoveSequenceTutorial locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.moveSequence.title'), href: '/practice/move-sequence' },
          { label: t('practice.moveSequence.tutorial.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
