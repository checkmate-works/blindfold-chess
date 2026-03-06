'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { PracticeComplete } from '@/app/[locale]/(public)/practice/_components/PracticeComplete';
import { PracticeResultPage } from '@/app/[locale]/(public)/practice/_components/PracticeResultPage';
import { getCommonPracticeCompleteLabels } from '@/app/[locale]/(public)/practice/_components/get-common-practice-labels';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
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
          ...getCommonPracticeCompleteLabels(tPractice),
          score: tPractice('correctAnswers'),
        }}
        otherPracticeLink={{
          href: `/${locale}/practice`,
          label: tPractice('doOtherPractice'),
        }}
      />

      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 mt-8 space-y-3">
          <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
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
      </div>
    </PracticeResultPage>
  );
}
