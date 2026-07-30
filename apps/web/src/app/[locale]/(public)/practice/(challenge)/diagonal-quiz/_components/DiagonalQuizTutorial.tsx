'use client';

import { useCallback, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getDiagonals } from '@blindfold-chess/features/diagonal-quiz';

import { AnswerFeedback } from '@/app/[locale]/(public)/practice/(challenge)/_components/AnswerFeedback';
import { SteppedTutorial } from '@/app/[locale]/(public)/practice/(challenge)/_components/SteppedTutorial';
import { TutorialBoardFrame } from '@/app/[locale]/(public)/practice/(challenge)/_components/TutorialBoardFrame';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalQuizPlaying } from '../challenge/_components/DiagonalQuizPlaying';

type Props = {
  locale: Locale;
};

type TutorialStep = 'diagonal' | 'antiDiagonal' | 'trial';

const STEPS: readonly TutorialStep[] = ['diagonal', 'antiDiagonal', 'trial'];

const TUTORIAL_SQUARE = 'd4';
const BISHOP_FEN = '8/8/8/8/3B4/8/8/8 w - - 0 1';

const OVERLAY_CLASSES = 'absolute inset-0 w-full h-full pointer-events-none z-10';

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

type TrialResult = {
  correct: boolean;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  userDiagonal: string;
  userAntiDiagonal: string;
  isDiagonalCorrect: boolean;
  isAntiDiagonalCorrect: boolean;
};

/** Tints the squares of one diagonal so the reader can read its endpoints off. */
function DiagonalOverlay({
  squares,
  colorClass,
}: {
  squares: { x: number; y: number }[];
  colorClass: string;
}) {
  return (
    <svg className={OVERLAY_CLASSES} viewBox="0 0 100 100" preserveAspectRatio="none">
      {squares.map((sq, i) => (
        <rect
          key={i}
          x={sq.x}
          y={sq.y}
          width="12.5"
          height="12.5"
          fill="currentColor"
          className={colorClass}
          opacity="0.4"
        />
      ))}
    </svg>
  );
}

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <div className="flex justify-center gap-4 mb-6 text-xs">
      <div className="flex items-center gap-1">
        <div className={`w-3 h-3 rounded border border-border ${swatchClass}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/**
 * Teaches the two diagonals through d4 by tinting each one on the board, then
 * hands the reader the real challenge input for a single untimed practice
 * question and grades each diagonal independently — a half-right answer shows
 * one green and one red line, exactly as the challenge does.
 */
export function DiagonalQuizTutorial({ locale }: Props) {
  const t = useTranslations('practice.diagonalQuiz.tutorial');
  const tQuiz = useTranslations('practice.diagonalQuiz');
  const [trialResult, setTrialResult] = useState<TrialResult | null>(null);

  const handleTrialAnswer = useCallback((diagonal: string, antiDiagonal: string) => {
    const correct = getDiagonals(TUTORIAL_SQUARE);
    const isDiagonalCorrect = diagonal === correct.diagonal;
    const isAntiDiagonalCorrect = antiDiagonal === correct.antiDiagonal;

    setTrialResult({
      correct: isDiagonalCorrect && isAntiDiagonalCorrect,
      correctDiagonal: correct.diagonal,
      correctAntiDiagonal: correct.antiDiagonal,
      userDiagonal: diagonal,
      userAntiDiagonal: antiDiagonal,
      isDiagonalCorrect,
      isAntiDiagonalCorrect,
    });
  }, []);

  function renderTrial() {
    if (!trialResult) {
      return (
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
      );
    }

    const rows = [
      {
        label: tQuiz('diagonalLabel'),
        expected: trialResult.correctDiagonal,
        actual: trialResult.userDiagonal,
        isCorrect: trialResult.isDiagonalCorrect,
      },
      {
        label: tQuiz('antiDiagonalLabel'),
        expected: trialResult.correctAntiDiagonal,
        actual: trialResult.userAntiDiagonal,
        isCorrect: trialResult.isAntiDiagonalCorrect,
      },
    ];

    return (
      <div className="text-center space-y-4">
        <AnswerFeedback isCorrect={trialResult.correct} isVisible={true} />
        <div className="mt-3 space-y-3 text-sm text-left">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="font-bold text-muted-foreground mb-1">{row.label}</p>
              <p className="text-muted-foreground">
                <span className="font-medium">{tQuiz('correctAnswerLabel')}:</span> {row.expected}
              </p>
              <p className={row.isCorrect ? 'text-success' : 'text-destructive'}>
                <span className="font-medium">{tQuiz('yourAnswer')}:</span> {row.actual}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SteppedTutorial
      locale={locale}
      moduleSlug="diagonal-quiz"
      steps={STEPS}
      namespace="practice.diagonalQuiz.tutorial"
      descriptionClassName="whitespace-pre-wrap"
      renderStep={(step) => {
        if (step === 'trial') return <div className="mb-6">{renderTrial()}</div>;

        const isDiagonal = step === 'diagonal';
        return (
          <>
            <TutorialBoardFrame fen={BISHOP_FEN}>
              <DiagonalOverlay
                squares={isDiagonal ? DIAGONAL_SQUARES : ANTI_DIAGONAL_SQUARES}
                colorClass={isDiagonal ? 'text-emerald-500' : 'text-sky-500'}
              />
            </TutorialBoardFrame>
            <Legend
              swatchClass={isDiagonal ? 'bg-emerald-500/40' : 'bg-sky-500/40'}
              label={isDiagonal ? t('diagonalLegend') : t('antiDiagonalLegend')}
            />
          </>
        );
      }}
    />
  );
}
