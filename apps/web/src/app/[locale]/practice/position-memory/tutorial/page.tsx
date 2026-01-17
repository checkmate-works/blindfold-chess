import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PositionMemoryTutorial } from '../_components/PositionMemoryTutorial';
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
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/tutorial' }),
    title: `${t('practice.positionMemory.title')} - ${t('practice.positionMemory.tutorial.title')}`,
    description: t('practice.positionMemory.tutorial.description'),
  };
}

export default async function PositionMemoryTutorialPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.positionMemory.title')}</PageTitle>

      <SectionTitle>{t('practice.positionMemory.tutorial.title')}</SectionTitle>

      <div className="text-right">
        <TutorialSkipLink locale={locale} />
      </div>

      <PositionMemoryTutorial locale={locale} />

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.positionMemory.title'), href: '/practice/position-memory' },
          { label: t('practice.positionMemory.tutorial.title') },
        ]}
        locale={locale}
      />
    </div>
  );
}
