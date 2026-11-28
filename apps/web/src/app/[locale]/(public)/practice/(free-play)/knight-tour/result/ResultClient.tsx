'use client';

import { useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { createCustomPracticeResultPage } from '@/app/[locale]/(public)/practice/_lib/createCustomPracticeResultPage';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { KnightTourResult } from '../_components/KnightTourResult';
import { parseKnightTourResult, parseKnightTourSettings } from '../_lib/result-data';

function KnightTourContent({ locale }: { locale: Locale }) {
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataParam = searchParams.get('data');
  const modeParam = searchParams.get('mode');
  const settingsParam = searchParams.get('settings');
  const isTutorial = modeParam === 'tutorial';

  const { visitedSquares, lastSquare, success, isClosedTour } = useMemo(
    () => parseKnightTourResult(dataParam),
    [dataParam]
  );

  const settings = useMemo(() => parseKnightTourSettings(settingsParam), [settingsParam]);

  const handlePlayAgain = () => {
    if (isTutorial) {
      router.push(`/${locale}/practice/knight-tour?mode=tutorial`);
    } else {
      const params = new URLSearchParams();
      params.set('startingSquare', settings.startingSquare);
      if (settings.blindfoldMode) {
        params.set('blindfold', '1');
      }
      router.push(`/${locale}/practice/knight-tour/session?${params.toString()}`);
    }
  };

  const handleFinishTutorial = () => {
    router.push(`/${locale}/practice/knight-tour`);
  };

  const relatedLinks = [
    {
      href: '/learn/practice/knight-tour',
      icon: '♞',
      title: t('articles.knightTour.title'),
      description: t('articles.knightTour.description'),
    },
    {
      href: '/learn/moves/knight-movement',
      icon: '♘',
      title: t('articles.knightMovement.title'),
      description: t('articles.knightMovement.description'),
    },
  ];

  return (
    <>
      <KnightTourResult
        success={success}
        moveCount={visitedSquares.size}
        visitedSquares={visitedSquares}
        lastSquare={lastSquare}
        startingSquare={settings.startingSquare}
        isClosedTour={isClosedTour}
        isTutorial={isTutorial}
        onPlayAgain={handlePlayAgain}
        onChangeSettings={() => router.push(`/${locale}/practice/knight-tour`)}
        onFinishTutorial={handleFinishTutorial}
      />

      {!isTutorial && (
        <PracticeLayout>
          <div className="mt-8 space-y-3">
            <SectionTitle>{tPractice('relatedLearning')}</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedLinks.map((link) => (
                <CardLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  title={link.title}
                  description={link.description}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </PracticeLayout>
      )}
    </>
  );
}

export const ResultClient = createCustomPracticeResultPage({
  moduleSlug: 'knight-tour',
  i18nKey: 'knightTour',
  renderContent: ({ locale }) => <KnightTourContent locale={locale} />,
});
