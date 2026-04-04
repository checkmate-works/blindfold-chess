'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowLeft, FaArrowRight, FaPlay } from 'react-icons/fa';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
};

type TutorialStep = 'intro' | 'visualization' | 'start';

export function RoutePlannerTutorial({ locale }: Props) {
  const t = useTranslations('practice.routePlanner.tutorial');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const [step, setStep] = useState<TutorialStep>('intro');

  const handleStartChallenge = () => {
    localStorage.setItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/route-planner/challenge`);
  };

  const handleSwitchToTraining = () => {
    localStorage.setItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/route-planner/training`);
  };

  const steps: TutorialStep[] = ['intro', 'visualization', 'start'];
  const currentIndex = steps.indexOf(step);

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const getOverlayContent = () => {
    // Common arrow marker definition
    const arrowMarker = (
      <defs>
        <marker
          id="arrowhead-blue"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-blue-500" />
        </marker>
      </defs>
    );

    switch (step) {
      case 'intro':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <circle
              cx="93.75"
              cy="43.75"
              r="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-red-500 animate-pulse"
            />
            <text
              x="93.75"
              y="43.75"
              textAnchor="middle"
              dy="1.5"
              fontSize="4"
              fill="currentColor"
              className="text-red-500 font-bold"
            >
              GOAL
            </text>
          </svg>
        );
      case 'visualization':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {arrowMarker}
            <line
              x1="56.25"
              y1="56.25"
              x2="68.75"
              y2="31.25"
              stroke="currentColor"
              strokeWidth="1"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead-blue)"
            />
            <line
              x1="68.75"
              y1="31.25"
              x2="93.75"
              y2="43.75"
              stroke="currentColor"
              strokeWidth="1"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead-blue)"
            />
            <circle
              cx="93.75"
              cy="43.75"
              r="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-red-500"
            />
            <text
              x="93.75"
              y="43.75"
              textAnchor="middle"
              dy="1.5"
              fontSize="4"
              fill="currentColor"
              className="text-red-500 font-bold"
            >
              GOAL
            </text>
          </svg>
        );
      default:
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <circle
              cx="93.75"
              cy="43.75"
              r="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-red-500"
            />
          </svg>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex
                  ? 'bg-primary'
                  : idx < currentIndex
                    ? 'bg-primary/50'
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <h3 className="text-xl font-bold text-center mb-4">{t(`steps.${step}.title`)}</h3>
        <p className="text-muted-foreground mb-6 min-h-[4.5rem] whitespace-pre-wrap text-center">
          {t(`steps.${step}.description`)}
        </p>

        <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden mb-6 relative">
          {!isLoaded ? (
            <BoardSkeleton rounded={false} />
          ) : (
            <AnimatedChessBoard
              initialFen="8/8/8/8/4N3/8/8/8 w - - 0 1"
              showCoordinates={true}
              flipped={false}
              boardTheme={preferences.boardTheme}
            >
              {getOverlayContent()}
            </AnimatedChessBoard>
          )}
        </div>

        {step === 'start' ? (
          <div className="space-y-3">
            <Button onClick={handleStartChallenge} variant="primary" className="w-full">
              <FaPlay className="mr-2 h-4 w-4" />
              {t('startChallenge')}
            </Button>
            <div className="text-center">
              <button
                onClick={handleSwitchToTraining}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('switchToTraining')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            {step !== 'intro' && (
              <Button variant="outline" onClick={handlePrevious} className="flex-1">
                <FaArrowLeft className="mr-2 h-4 w-4" />
                {t('previous')}
              </Button>
            )}
            <Button onClick={handleNext} variant="primary" className="flex-1">
              {t('next')}
              <FaArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
