import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

import { PracticeSessionPage } from '@/app/[locale]/(public)/practice/_components/PracticeSessionPage';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

const QuadrantPlaying = dynamic(() => import('../_components/QuadrantPlaying'));

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
    ...generateCanonicalMetadata({ locale, path: 'practice/quadrants/challenge' }),
    title: `${t('practice.quadrantAnchors.title')} - ${t('practice.quadrantAnchors.session')}`,
    description: t('practice.quadrantAnchors.description'),
  };
}

export default async function QuadrantChallengePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { count, orientation } = await searchParams;
  const t = await getTranslations({ locale });

  const problemCount = count ? parseInt(count, 10) : 10;
  const initialOrientation = (orientation as 'white' | 'black' | 'random') || 'white';

  return (
    <PracticeSessionPage
      locale={locale}
      title={t('practice.quadrantAnchors.title')}
      breadcrumbItems={[
        { label: t('navigation.practice'), href: '/practice' },
        { label: t('practice.quadrantAnchors.title'), href: '/practice/quadrants' },
        { label: t('practice.quadrantAnchors.session') },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        <QuadrantPlaying
          key={initialOrientation}
          initialProblemCount={problemCount}
          initialOrientation={initialOrientation}
        />
      </div>
    </PracticeSessionPage>
  );
}
