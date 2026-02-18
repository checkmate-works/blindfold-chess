'use client';

import { useEffect, useState } from 'react';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import type { Question } from '../_lib/types';
import { AlgebraicNotationPlaying } from './AlgebraicNotationPlaying';
import { AlgebraicNotationResult } from './AlgebraicNotationResult';

type Props = {
  questions: Question[];
  locale: Locale;
};

export default function AlgebraicNotation({ questions, locale }: Props) {
  const { preferences } = useGamePreferences();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const question = questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    setSelectedAnswer(option);
    setShowResult(true);
    if (option === question.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowResult(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Redirect to result page
      window.location.href = `/${locale}/practice/algebraic-notation/result?score=${score}&total=${questions.length}`;
    }
  };

  // Scroll to session element after mount
  useEffect(() => {
    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('algebraic-notation-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, []);

  return (
    <div id="algebraic-notation-session" className="space-y-4">
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress bar */}
          <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />

          {/* Question */}
          <AlgebraicNotationPlaying
            question={question}
            currentQuestionIndex={currentQuestionIndex}
            selectedAnswer={selectedAnswer}
            showResult={showResult}
            boardTheme={preferences.boardTheme}
            onOptionSelect={handleOptionSelect}
            locale={locale}
          />

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
