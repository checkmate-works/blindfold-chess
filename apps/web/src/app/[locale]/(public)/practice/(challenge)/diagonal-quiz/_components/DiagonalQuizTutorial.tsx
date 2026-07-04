'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getDiagonals } from '@blindfold-chess/features/diagonal-quiz';
import { FaArrowLeft, FaArrowRight, FaInfinity, FaPlay } from 'react-icons/fa';

import { AnswerFeedback } from '@/app/[locale]/(public)/practice/(challenge)/_components/AnswerFeedback';
import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import { Divider } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPlaying } from '../challenge/_components/DiagonalQuizPlaying';

type Props = {
  locale: Locale;
};

type TutorialStep = 'diagonal' | 'antiDiagonal' | 'trial';

const TUTORIAL_SQUARE = 'd4';
const BISHOP_FEN = '8/8/8/8/3B4/8/8/8 w - - 0 1';

// SVG coordinates for diagonal squares of d4 (a1-h8 direction, file-rank=0)
// Each square: x = fileIndex * 12.5, y = (8 - rank) * 12.5, size = 12.5
const DIAGONAL_SQUARES = [
  { x: 0, y: 87.5 }, // a1
  { x: 12.5, y: 75 }, // b2
  { x: 25, y: 62.5 }, // c3
  { x: 37.5, y: 50 }, // d4
  { x: 50, y: 37.5 }, // e5
  { x: 62.5, y: 25 }, // f6
  { x: 75, y: 12.5 }, // g7
  { x: 87.5, y: 0 }, // h8
];

// SVG coordinates for anti-diagonal squares of d4 (h1-a8 direction, file+rank=6)
const ANTI_DIAGONAL_SQUARES = [
  { x: 0, y: 12.5 }, // a7
  { x: 12.5, y: 25 }, // b6
  { x: 25, y: 37.5 }, // c5
  { x: 37.5, y: 50 }, // d4
  { x: 50, y: 62.5 }, // e3
  { x: 62.5, y: 75 }, // f2
  { x: 75, y: 87.5 }, // g1
];

export function DiagonalQuizTutorial({ locale }: Props) {
  const t = useTranslations('practice.diagonalQuiz.tutorial');
  const t_quiz = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const [step, setStep] = useState<TutorialStep>('diagonal');
  const [trialAnswered, setTrialAnswered] = useState(false);
  const [trialResult, setTrialResult] = useState<{
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
    userDiagonal: string;
    userAntiDiagonal: string;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
  } | null>(null);

  const steps: TutorialStep[] = ['diagonal', 'antiDiagonal', 'trial'];
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

  const handleTrialAnswer = useCallback((diagonal: string, antiDiagonal: string) => {
    const correct = getDiagonals(TUTORIAL_SQUARE);
    const isDiagonalCorrect = diagonal === correct.diagonal;
    const isAntiDiagonalCorrect = antiDiagonal === correct.antiDiagonal;
    const isCorrect = isDiagonalCorrect && isAntiDiagonalCorrect;

    setTrialResult({
      correct: isCorrect,
      correctDiagonal: correct.diagonal,
      correctAntiDiagonal: correct.antiDiagonal,
      userDiagonal: diagonal,
      userAntiDiagonal: antiDiagonal,
      isDiagonalCorrect,
      isAntiDiagonalCorrect,
    });
    setTrialAnswered(true);
  }, []);

  const handleStartChallenge = () => {
    router.push(`/${locale}/practice/diagonal-quiz/challenge`);
  };

  const handleSwitchToTraining = () => {
    router.push(`/${locale}/practice/diagonal-quiz/training`);
  };

  const getOverlayContent = () => {
    switch (step) {
      case 'diagonal':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {DIAGONAL_SQUARES.map((sq, i) => (
              <rect
                key={i}
                x={sq.x}
                y={sq.y}
                width="12.5"
                height="12.5"
                fill="currentColor"
                className="text-emerald-500"
                opacity="0.4"
              />
            ))}
          </svg>
        );
      case 'antiDiagonal':
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {ANTI_DIAGONAL_SQUARES.map((sq, i) => (
              <rect
                key={i}
                x={sq.x}
                y={sq.y}
                width="12.5"
                height="12.5"
                fill="currentColor"
                className="text-sky-500"
                opacity="0.4"
              />
            ))}
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-2xl p-6 border border-border">
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
        <p className="text-muted-foreground mb-6 min-h-[4.5rem] whitespace-pre-wrap">
          {t(`steps.${step}.description`)}
        </p>

        {step !== 'trial' ? (
          <>
            <div className="aspect-square bg-secondary/30 rounded-lg overflow-hidden mb-6 relative">
              {!isLoaded ? (
                <BoardSkeleton rounded={false} />
              ) : (
                <AnimatedChessBoard
                  initialFen={BISHOP_FEN}
                  showCoordinates={true}
                  flipped={false}
                  boardTheme={preferences.boardTheme}
                >
                  {getOverlayContent()}
                </AnimatedChessBoard>
              )}
            </div>

            {/* Legend */}
            {step === 'diagonal' && (
              <div className="flex justify-center gap-4 mb-6 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-500/40 rounded border border-border" />
                  <span className="text-muted-foreground">{t('diagonalLegend')}</span>
                </div>
              </div>
            )}
            {step === 'antiDiagonal' && (
              <div className="flex justify-center gap-4 mb-6 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-sky-500/40 rounded border border-border" />
                  <span className="text-muted-foreground">{t('antiDiagonalLegend')}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mb-6">
            {!trialAnswered ? (
              <DiagonalQuizPlaying
                currentSquare={TUTORIAL_SQUARE}
                timeRemaining={999}
                timeLimit={0}
                showResult={false}
                lastAnswer={null}
                onAnswer={handleTrialAnswer}
                countdown={null}
                correctCount={0}
                incorrectCount={0}
                showStats={false}
              />
            ) : (
              <div className="text-center space-y-4">
                <AnswerFeedback isCorrect={trialResult?.correct ?? null} isVisible={true} />
                <div className="mt-3 space-y-3 text-sm text-left">
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">
                      {t_quiz('diagonalLabel')}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">{t_quiz('correctAnswerLabel')}:</span>{' '}
                      {trialResult?.correctDiagonal}
                    </p>
                    <p
                      className={
                        trialResult?.isDiagonalCorrect ? 'text-success' : 'text-destructive'
                      }
                    >
                      <span className="font-medium">{t_quiz('yourAnswer')}:</span>{' '}
                      {trialResult?.userDiagonal}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-muted-foreground mb-1">
                      {t_quiz('antiDiagonalLabel')}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">{t_quiz('correctAnswerLabel')}:</span>{' '}
                      {trialResult?.correctAntiDiagonal}
                    </p>
                    <p
                      className={
                        trialResult?.isAntiDiagonalCorrect ? 'text-success' : 'text-destructive'
                      }
                    >
                      <span className="font-medium">{t_quiz('yourAnswer')}:</span>{' '}
                      {trialResult?.userAntiDiagonal}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'trial' ? (
          <div>
            <Button onClick={handleStartChallenge} variant="primary" size="lg" className="w-full">
              <FaPlay className="mr-2 h-4 w-4" />
              {t('startChallenge')}
            </Button>

            <div className="my-6 mx-auto flex w-4/5 items-center gap-4">
              <Divider className="flex-1" />
              <span className="text-sm text-muted-foreground">{tp('orDivider')}</span>
              <Divider className="flex-1" />
            </div>

            <Button onClick={handleSwitchToTraining} variant="outline" size="lg" className="w-full">
              <FaInfinity className="mr-2 h-4 w-4" />
              {tp('startTraining')}
            </Button>
          </div>
        ) : (
          <div className="flex gap-4">
            {step !== 'diagonal' && (
              <Button variant="outline" size="lg" onClick={handlePrevious} className="flex-1">
                <FaArrowLeft className="mr-2 h-4 w-4" />
                {t('previous')}
              </Button>
            )}
            <Button onClick={handleNext} variant="primary" size="lg" className="flex-1">
              {t('next')}
              <FaArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
