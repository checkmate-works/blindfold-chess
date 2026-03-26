import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { Divider, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TutorialSkipLink } from '../_components/TutorialSkipLink';

const PositionMemoryTutorial = dynamic(() =>
  import('../_components/PositionMemoryTutorial').then((mod) => mod.PositionMemoryTutorial)
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
  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/position-memory/tutorial' }),
    title: `${t('practice.positionMemory.title')} - ${t('practice.positionMemory.tutorial.title')}`,
    description: t('practice.positionMemory.tutorial.description'),
  };
}

export default async function PositionMemoryTutorialPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
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
