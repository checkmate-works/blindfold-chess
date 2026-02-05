import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Breadcrumb, Divider, PageTitle } from '@/app/[locale]/_components';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import QuadrantPlaying from '../_components/QuadrantPlaying';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{
    count?: string;
    orientation?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'practice/quadrants/session' }),
    title: `${t('practice.quadrantAnchors.title')} - ${t('practice.quadrantAnchors.session')}`,
    description: t('practice.quadrantAnchors.description'),
  };
}

export default async function QuadrantSessionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { count, orientation } = await searchParams;
  const t = await getTranslations({ locale });

  const problemCount = count ? parseInt(count, 10) : 10;
  const initialOrientation = (orientation as 'white' | 'black' | 'random') || 'white';

  return (
    <div className="space-y-8">
      <PageTitle>{t('practice.quadrantAnchors.title')}</PageTitle>

      <div className="max-w-3xl mx-auto">
        <QuadrantPlaying
          key={initialOrientation}
          initialProblemCount={problemCount}
          initialOrientation={initialOrientation}
        />
      </div>

      <Divider />

      <Breadcrumb
        items={[
          { label: t('navigation.practice'), href: '/practice' },
          { label: t('practice.quadrantAnchors.title'), href: '/practice/quadrants' },
          { label: t('practice.quadrantAnchors.session') },
        ]}
        locale={locale}
      />
    </div>
  );
}
