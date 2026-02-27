'use client';

import { use } from 'react';
import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultPage } from '@/app/[locale]/practice/_components/PracticeResultPage';

import { KnightTourResult } from '../_components/KnightTourResult';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default function KnightTourResultPage(props: Props) {
  const params = use(props.params);
  const { locale } = params;
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');
  const router = useRouter();
  const searchParams = useSearchParams();

  const dataParam = searchParams.get('data');
  const modeParam = searchParams.get('mode');
  const settingsParam = searchParams.get('settings');
  const isTutorial = modeParam === 'tutorial';

  // Parse Results
  const { visitedSquares, lastSquare, success, isClosedTour } = useMemo(() => {
    if (!dataParam) {
      return { visitedSquares: new Map(), lastSquare: '', success: false, isClosedTour: false };
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return {
        visitedSquares: new Map(parsed.visitedSquares as [string, number][]),
        lastSquare: parsed.lastSquare,
        success: parsed.success,
        isClosedTour: parsed.isClosedTour,
      };
    } catch {
      return { visitedSquares: new Map(), lastSquare: '', success: false, isClosedTour: false };
    }
  }, [dataParam]);

  // Parse Settings for Restart
  const settings = useMemo(() => {
    if (!settingsParam) return { startingSquare: 'a1', blindfoldMode: false };
    try {
      return JSON.parse(decodeURIComponent(settingsParam));
    } catch {
      return { startingSquare: 'a1', blindfoldMode: false };
    }
  }, [settingsParam]);

  const handlePlayAgain = () => {
    if (isTutorial) {
      router.push(`/${locale}/practice/knight-tour?mode=tutorial`);
    } else {
      const params = new URLSearchParams();
      params.set('startingSquare', settings.startingSquare);
      if (settings.blindfoldMode) {
        params.set('blindfold', '1');
      }
      // Force reload by navigating to the session page directly with params
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
    <PracticeResultPage
      locale={locale}
      title={t('title')}
      breadcrumbItems={[
        { label: tPractice('title'), href: '/practice' },
        { label: t('title'), href: '/practice/knight-tour' },
        { label: tPractice('result') },
      ]}
    >
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
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mt-8">
            <SectionTitle className="text-xl font-semibold mb-4">
              {tPractice('relatedLearning')}
            </SectionTitle>
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
        </div>
      )}
    </PracticeResultPage>
  );
}
