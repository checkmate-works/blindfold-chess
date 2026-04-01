'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { FaArrowLeft, FaArrowRight, FaPlay } from 'react-icons/fa';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY } from './BoardSymmetryTutorialSkipLink';

type Props = {
  locale: Locale;
};

type TutorialStep = 'intro' | 'horizontal' | 'vertical' | 'point' | 'start';

export function BoardSymmetryTutorial({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry.tutorial');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const [step, setStep] = useState<TutorialStep>('intro');

  const handleStartChallenge = () => {
    localStorage.setItem(BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/board-symmetry/challenge`);
  };

  const handleSwitchToTraining = () => {
    localStorage.setItem(BOARD_SYMMETRY_TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/board-symmetry/training`);
  };

  const steps: TutorialStep[] = ['intro', 'horizontal', 'vertical', 'point', 'start'];
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
    switch (step) {
      case 'intro':
        return null;
      case 'horizontal':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Dashed line between d and e files (center vertical) */}
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="100"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              className="text-red-500"
            />
            {/* Arrows connecting equivalent files */}
            <path
              d="M 12.5 90 Q 50 70 87.5 90"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead)"
            />
            <path
              d="M 87.5 90 Q 50 70 12.5 90"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead)"
            />

            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-blue-500" />
              </marker>
            </defs>
          </svg>
        );
      case 'vertical':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Dashed line between 4 and 5 ranks (center horizontal) */}
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              className="text-red-500"
            />
            {/* Arrows connecting equivalent ranks */}
            <path
              d="M 10 87.5 Q 30 50 10 12.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead)"
            />
            <path
              d="M 10 12.5 Q 30 50 10 87.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        );
      case 'point':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Center point */}
            <circle cx="50" cy="50" r="1.5" fill="currentColor" className="text-red-500" />
            {/* Rotation arrows */}
            <path
              d="M 12.5 87.5 Q 50 50 87.5 12.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead)"
            />
            <path
              d="M 87.5 12.5 Q 50 50 12.5 87.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-blue-500 opacity-60"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        );
      default:
        return null;
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

        <p className="text-muted-foreground mb-6 min-h-[4.5rem]">
          {t(`steps.${step}.description`)}
        </p>

        <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden mb-6 relative">
          {!isLoaded ? (
            <BoardSkeleton rounded={false} />
          ) : (
            <AnimatedChessBoard
              initialFen="8/8/8/8/8/8/8/8 w - - 0 1" // Empty board
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
