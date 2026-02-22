'use client';

import { use, useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/practice/_components/PracticeResultPage';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default function QuadrantAnchorsResultPage(props: Props) {
  const params = use(props.params);
  const { locale } = params;
  const t = useTranslations('practice.quadrantAnchors');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataParam = searchParams.get('data');
  const settingsParam = searchParams.get('settings');

  // Parse Results
  const result = useMemo(() => {
    if (!dataParam) return null;
    try {
      return JSON.parse(decodeURIComponent(dataParam));
    } catch {
      return null;
    }
  }, [dataParam]);

  // Parse Settings for Restart
  const settings = useMemo(() => {
    if (!settingsParam) return null;
    try {
      return JSON.parse(decodeURIComponent(settingsParam));
    } catch {
      return null;
    }
  }, [settingsParam]);

  const handleTryAgain = () => {
    if (settings) {
      const params = new URLSearchParams();
      if (settings.count) params.set('count', settings.count.toString());
      if (settings.orientation) params.set('orientation', settings.orientation);
      router.push(`/${locale}/practice/quadrants/challenge?${params.toString()}`);
    } else {
      router.push(`/${locale}/practice/quadrants`);
    }
  };

  if (!result) {
    return null; // Or some error state
  }

  return (
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/quadrants' },
        { label: tPractice('result') },
      ]}
    >
      <PracticeComplete
        score={result.score}
        total={result.total}
        onTryAgain={handleTryAgain}
        onExit={() => router.push(`/${locale}/practice/quadrants`)}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: tPractice('correctAnswers'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('changeSettings'),
        }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />

      <div className="max-w-4xl mx-auto">
        <SectionTitle className="text-xl font-semibold mb-4">
          {tPractice('relatedLearning')}
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardLink
            href="/learn/coordinates/anchor-squares"
            icon="⚓"
            title={t('articles.anchorSquares.title')}
            description={t('articles.anchorSquares.description')}
            locale={locale}
          />
        </div>
      </div>
    </PracticeResultPage>
  );
}
