import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveSequenceTutorial } from '../_components/MoveSequenceTutorial';
import { TutorialSkipLink } from '../_components/TutorialSkipLink';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/move-sequence/tutorial' }),
    title: `${t('practice.moveSequence.title')} - ${t('practice.moveSequence.tutorial.title')}`,
    description: t('practice.moveSequence.tutorial.description'),
  };
}

export default async function MoveSequenceTutorialPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.moveSequence.title')}</PageTitle>

      <SectionTitle>{t('practice.moveSequence.tutorial.title')}</SectionTitle>

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
