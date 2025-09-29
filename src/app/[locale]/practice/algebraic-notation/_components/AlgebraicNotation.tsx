'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProgressBar } from '../../_components/ProgressBar';
import { PracticeComplete } from '../../_components/PracticeComplete';
import { AlgebraicNotationPlaying } from './AlgebraicNotationPlaying';
import { AlgebraicNotationResult } from './AlgebraicNotationResult';
import type { Question } from '../_lib/types';
import type { Locale } from '../../../_lib/types';

type Props = {
  questions: Question[];
  locale: Locale;
};

export default function AlgebraicNotation({ questions, locale }: Props) {
  const tPractice = useTranslations('practice');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

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
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setCompleted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (completed) {
    return (
      <PracticeComplete
        score={score}
        total={questions.length}
        onTryAgain={handleRestart}
        locale={locale}
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: tPractice('score'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />

      {/* Question */}
      <div className="space-y-6">
        <AlgebraicNotationPlaying
          question={question}
          currentQuestionIndex={currentQuestionIndex}
          selectedAnswer={selectedAnswer}
          showResult={showResult}
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
  );
}
