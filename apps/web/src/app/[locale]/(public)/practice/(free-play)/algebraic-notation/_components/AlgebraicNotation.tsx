'use client';

import { useCallback } from 'react';

import { BoardSkeleton } from '@/app/_components';
import type {
  AlgebraicNotationQuestion,
  AlgebraicNotationResult as SessionResult,
} from '@blindfold-chess/features/algebraic-notation';
import { useAlgebraicNotationSession } from '@blindfold-chess/features/algebraic-notation/client';

import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import {
  realignToElement,
  useScrollToElement,
} from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { AlgebraicNotationPlaying } from './AlgebraicNotationPlaying';
import { AlgebraicNotationResult } from './AlgebraicNotationResult';

type Props = {
  questions: readonly AlgebraicNotationQuestion[];
  locale: Locale;
};

export default function AlgebraicNotation({ questions, locale }: Props) {
  const { preferences, isLoaded } = useGamePreferences();

  const handleComplete = useCallback(
    ({ score, total }: SessionResult) => {
      window.location.href = `/${locale}/practice/algebraic-notation/result?score=${score}&total=${total}`;
    },
    [locale]
  );

  const {
    question,
    currentIndex: currentQuestionIndex,
    selectedAnswer,
    answered: showResult,
    isLastQuestion,
    selectOption: handleOptionSelect,
    next,
  } = useAlgebraicNotationSession({ questions, onComplete: handleComplete });

  const handleNext = () => {
    next();
    if (!isLastQuestion) {
      realignToElement('algebraic-notation-session');
    }
  };

  useScrollToElement('algebraic-notation-session');

  return (
    <div id="algebraic-notation-session" className="min-h-screen space-y-4">
      <div className="bg-card rounded-md border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress bar */}
          <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />

          {/* Question */}
          {!isLoaded ? (
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <BoardSkeleton />
              </div>
            </div>
          ) : (
            <AlgebraicNotationPlaying
              question={question}
              currentQuestionIndex={currentQuestionIndex}
              selectedAnswer={selectedAnswer}
              showResult={showResult}
              boardTheme={preferences.boardTheme}
              onOptionSelect={handleOptionSelect}
              locale={locale}
            />
          )}

          {/* Result */}
          {showResult && (
            <AlgebraicNotationResult
              selectedAnswer={selectedAnswer}
              question={question}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              onNext={handleNext}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
