'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { PageTitle } from '@/app/[locale]/_components';
import { ProgressBar } from '../../_components/ProgressBar';
import { PracticeComplete } from '../../_components/PracticeComplete';
import { getSquareColor, generateSquareSequence } from '@/lib/square-utils';

interface SquareColorsClientProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    description: string;
    settings: string;
    questionCount: string;
    start: string;
    white: string;
    black: string;
    correct: string;
    incorrect: string;
    practiceComplete: string;
    score: string;
    tryAgain: string;
    morePractice: string;
    relatedLearning: string;
    learnTitle: string;
    learnDescription: string;
  };
}

interface GameStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
}

type GameState = 'setup' | 'playing' | 'finished';

export default function SquareColorsClient({ locale, translations }: SquareColorsClientProps) {
  const t = useTranslations('practice.squareColors');
  const [questionCount, setQuestionCount] = useState(10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; square: string } | null>(null);

  const startGame = useCallback(() => {
    const newSquares = generateSquareSequence(questionCount);
    setSquares(newSquares);
    setQuestionStartTime(Date.now());
    setCurrentIndex(0);
    setAnswers([]);
    setTotalTime(0);
    setShowResult(false);
    setLastAnswer(null);
    setGameState('playing');
  }, [questionCount]);

  const handleAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      if (currentIndex >= squares.length || gameState === 'finished') return;

      const currentSquare = squares[currentIndex];
      const correctColor = getSquareColor(currentSquare);
      const isCorrect = selectedColor === correctColor;

      // Update timing
      const now = Date.now();
      const questionTime = now - questionStartTime;
      setTotalTime((prev) => prev + questionTime);

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, square: currentSquare });
      setShowResult(true);

      // Move to next question or finish game
      setTimeout(() => {
        setShowResult(false);
        if (currentIndex + 1 >= squares.length) {
          setGameState('finished');
        } else {
          setCurrentIndex((prev) => prev + 1);
          setQuestionStartTime(Date.now());
        }
      }, 500);
    },
    [currentIndex, squares, gameState, questionStartTime]
  );

  const getStats = (): GameStats => {
    const correct = answers.filter((a) => a).length;
    const incorrect = answers.filter((a) => !a).length;
    const averageTime = totalTime / answers.length / 1000; // in seconds

    return { correct, incorrect, totalTime, averageTime };
  };

  const handlePlayAgain = () => {
    setGameState('setup');
    setCurrentIndex(0);
    setSquares([]);
    setAnswers([]);
    setTotalTime(0);
    setShowResult(false);
    setLastAnswer(null);
  };

  if (gameState === 'finished') {
    const stats = getStats();

    return (
      <PracticeComplete
        score={stats.correct}
        total={squares.length}
        onTryAgain={handlePlayAgain}
        locale={locale}
        translations={{
          practiceComplete: translations.practiceComplete,
          score: translations.score,
          tryAgain: translations.tryAgain,
          morePractice: translations.morePractice,
        }}
        relatedModule={{
          href: '/learn/square-colors',
          icon: '🏁',
          title: translations.learnTitle,
          description: translations.learnDescription,
          sectionTitle: translations.relatedLearning,
        }}
      />
    );
  }

  if (gameState === 'setup') {
    return (
      <div>
        <PageTitle>{translations.title}</PageTitle>
        <p className="text-muted-foreground mb-8">{translations.description}</p>

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">{translations.settings}</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              {translations.questionCount}
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <button
            onClick={startGame}
            className="w-full py-3 px-6 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {translations.start}
          </button>
        </div>
      </div>
    );
  }

  const currentSquare = squares[currentIndex];

  return (
    <div>
      {/* Progress bar */}
      <ProgressBar current={currentIndex + 1} total={squares.length} />

      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-8">
          {t('question', { square: currentSquare })}
        </h2>

        <div className="mb-8">
          <div className="text-6xl font-bold text-foreground mb-4">{currentSquare}</div>

          {showResult && lastAnswer && (
            <div
              className={`text-lg font-medium ${
                lastAnswer.correct
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {lastAnswer.correct ? translations.correct : translations.incorrect}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer('light')}
            disabled={showResult}
            className="px-6 py-4 bg-gray-100 dark:bg-gray-200 hover:bg-gray-200 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-900 rounded-lg font-medium text-lg transition-colors"
          >
            {translations.white}
          </button>
          <button
            onClick={() => handleAnswer('dark')}
            disabled={showResult}
            className="px-6 py-4 bg-gray-800 dark:bg-gray-900 hover:bg-gray-700 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg transition-colors"
          >
            {translations.black}
          </button>
        </div>
      </div>
    </div>
  );
}
