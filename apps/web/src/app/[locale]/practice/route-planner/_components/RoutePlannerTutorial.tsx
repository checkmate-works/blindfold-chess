import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaArrowLeft, FaArrowRight, FaPlay } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';

import { ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY } from './RoutePlannerTutorialSkipLink';

type Props = {
  locale: Locale;
};

const TUTORIAL_PROBLEM = {
  piece: 'N',
  start: 'e4',
  end: 'h5',
};

type TutorialStep = 'intro' | 'visualization' | 'start';

export function RoutePlannerTutorial({ locale }: Props) {
  const t = useTranslations('practice.routePlanner.tutorial');
  const router = useRouter();
  const { preferences } = useGamePreferences();
  const [step, setStep] = useState<TutorialStep>('intro');

  const handleStart = () => {
    // Mark tutorial as skipped (completed) so we don't show it again automatically
    localStorage.setItem(ROUTE_PLANNER_TUTORIAL_SKIPPED_KEY, 'true');

    const params = new URLSearchParams();
    params.set('count', '1');
    params.set('mode', 'tutorial');
    params.set('piece', TUTORIAL_PROBLEM.piece);
    params.set('start', TUTORIAL_PROBLEM.start);
    params.set('end', TUTORIAL_PROBLEM.end);

    router.push(`/${locale}/practice/route-planner/challenge?${params.toString()}`);
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
            {/* Highlight Goal h5 (file 7, rank 5 -> y=37.5) */}
            {/* h is 8th file (index 7). 5th rank (index 3 from bottom, or index 3 from top? 8-5=3) */}
            {/* x: 7 * 12.5 + 6.25 = 87.5 + 6.25 = 93.75 */}
            {/* y: 3 * 12.5 + 6.25 = 37.5 + 6.25 = 43.75. Wait. */}
            {/* Board is 0-100. Each square is 12.5. */}
            {/* h file: x = 7 * 12.5 = 87.5. Center = 87.5 + 6.25 = 93.75 */}
            {/* 5th rank: y = (8-5) * 12.5 = 3 * 12.5 = 37.5. Center = 37.5 + 6.25 = 43.75 */}

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
            {/* e4 -> f6 */}
            {/* e4: x=4*12.5+6.25=56.25, y=(8-4)*12.5+6.25=56.25 */}
            {/* f6: x=5*12.5+6.25=68.75, y=(8-6)*12.5+6.25=31.25 */}
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

            {/* f6 -> h5 */}
            {/* h5: x=93.75, y=43.75 */}
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

            {/* Goal Marker */}
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
            {/* Goal Marker again to keep context */}
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
          <AnimatedChessBoard
            initialFen="8/8/8/8/4N3/8/8/8 w - - 0 1"
            showCoordinates={true}
            flipped={false}
            boardTheme={preferences.boardTheme}
          >
            {getOverlayContent()}
          </AnimatedChessBoard>
        </div>

        <div className="flex gap-4">
          {step !== 'intro' && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              <FaArrowLeft className="mr-2 h-4 w-4" />
              {t('previous')}
            </Button>
          )}

          {step === 'start' ? (
            <Button onClick={handleStart} variant="primary" className="flex-1">
              <FaPlay className="mr-2 h-4 w-4" />
              {t('start')}
            </Button>
          ) : (
            <Button onClick={handleNext} variant="primary" className="flex-1">
              {t('next')}
              <FaArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
