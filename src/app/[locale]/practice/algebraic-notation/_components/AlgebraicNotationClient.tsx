'use client';

import { useState } from 'react';
import { ChessBoard } from '../../_components/ChessBoard';
import { Exercise } from '@/lib/practice/algebraic-notation';
import { Link } from '@/i18n/routing';

interface AlgebraicNotationClientProps {
  exercises: Exercise[];
  locale: 'en' | 'ja';
  translations: {
    question: string;
    correct: string;
    incorrect: string;
    correctAnswerIs: string;
    explanation: string;
    nextExercise: string;
    complete: string;
    pageTitle: string;
    tryAgain: string;
    morePractice: string;
    practiceComplete: string;
    score: string;
  };
}

export default function AlgebraicNotationClient({
  exercises,
  locale,
  translations: t,
}: AlgebraicNotationClientProps) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const exercise = exercises[currentExercise];

  const handleOptionSelect = (option: string) => {
    setSelectedAnswer(option);
    setShowResult(true);
    if (option === exercise.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      setSelectedAnswer('');
      setShowResult(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentExercise(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setCompleted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (completed) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-card rounded-lg p-8 border border-border">
          <h2 className="text-2xl font-bold mb-4">{t.practiceComplete}</h2>
          <p className="text-lg mb-6">
            {t.score}: {score}/{exercises.length}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
            >
              {t.tryAgain}
            </button>
            <Link
              href="/practice"
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors inline-block"
            >
              {t.morePractice}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
          <div className="text-sm text-muted-foreground">
            {currentExercise + 1} / {exercises.length}
          </div>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-foreground h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentExercise + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">{t.question}</h2>
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="mb-6">
              <p className="text-lg mb-4">{exercise.description[locale]}</p>
            </div>

            {/* Chess Board */}
            <div className="mb-6 flex justify-center">
              <ChessBoard
                key={`exercise-${currentExercise}`}
                initialFen={exercise.fenBefore}
                move={exercise.move}
                showCoordinates={true}
                animationDuration={800}
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {exercise.options.map((option) => (
                <button
                  key={option}
                  onClick={() => !showResult && handleOptionSelect(option)}
                  disabled={showResult}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors font-mono text-lg font-medium
                    ${
                      showResult
                        ? selectedAnswer === option
                          ? option === exercise.correctAnswer
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-600 border-2'
                            : 'bg-red-100 dark:bg-red-900/30 border-red-500 dark:border-red-600 border-2'
                          : option === exercise.correctAnswer
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 border'
                            : 'bg-secondary border-border border'
                        : selectedAnswer === option
                          ? 'bg-primary/10 border-primary border-2'
                          : 'bg-secondary border-border border hover:bg-secondary/80 cursor-pointer'
                    }
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        {showResult && (
          <div className="bg-card rounded-xl p-6 border border-border">
            <div
              className={`text-center ${
                selectedAnswer === exercise.correctAnswer
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              <p className="text-lg font-semibold mb-2">
                {selectedAnswer === exercise.correctAnswer ? t.correct : t.incorrect}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {t.correctAnswerIs}{' '}
                <span className="font-mono font-bold">{exercise.correctAnswer}</span>
              </p>

              {/* Explanation */}
              <div className="text-left bg-muted/50 dark:bg-secondary rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-3">{t.explanation}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {exercise.explanation[locale].map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-muted-foreground mr-2">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showResult && (
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
            >
              {currentExercise < exercises.length - 1 ? t.nextExercise : t.complete}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
