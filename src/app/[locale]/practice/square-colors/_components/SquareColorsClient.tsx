'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PracticeResult } from '../../_components/PracticeResult';
import { TimeSlider } from '../../_components/TimeSlider';
import { TimeDisplay } from '../../_components/TimeDisplay';
import { getSquareColor, generateSquareSequence } from '../_lib/square-utils';

interface SquareColorsClientProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    description: string;
    settings: string;
    timeLimit: string;
    seconds: string;
    start: string;
    white: string;
    black: string;
    correct: string;
    incorrect: string;
    finished: string;
    correctAnswers: string;
    accuracy: string;
    timeTaken: string;
    averageTime: string;
    tryAgain: string;
    morePractice: string;
    practice: string;
    timeRemaining: string;
  };
}

interface GameStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
}

type GameState = 'setup' | 'playing' | 'finished';

const STORAGE_KEY = 'squareColors_settings';

export default function SquareColorsClient({ locale, translations }: SquareColorsClientProps) {
  const t = useTranslations('practice.squareColors');

  // Default settings (will be updated from localStorage in useEffect)
  const [timeLimit, setTimeLimit] = useState(60); // Default to 60 seconds
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [squares, setSquares] = useState<string[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; square: string } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          if (settings.timeLimit) {
            setTimeLimit(settings.timeLimit);
          }
        } catch {}
      }
      setSettingsLoaded(true);
    }
  }, []);

  // Save settings to localStorage when they change (after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit }));
    }
  }, [timeLimit, settingsLoaded]);

  const startGame = useCallback(() => {
    // Generate a large pool of squares
    const newSquares = generateSquareSequence(100);
    setSquares(newSquares);
    setQuestionStartTime(Date.now());
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionTimes([]);
    setTimeRemaining(timeLimit);
    setShowResult(false);
    setLastAnswer(null);
    setGameState('playing');
  }, [timeLimit]);

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setGameState('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  const handleAnswer = useCallback(
    (selectedColor: 'light' | 'dark') => {
      if (gameState === 'finished') return;

      const currentSquare = squares[currentIndex];
      const correctColor = getSquareColor(currentSquare);
      const isCorrect = selectedColor === correctColor;

      // Update timing
      const now = Date.now();
      const questionTime = now - questionStartTime;
      setQuestionTimes((prev) => [...prev, questionTime / 1000]); // Convert to seconds

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, square: currentSquare });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        setShowResult(false);
        setCurrentIndex((prev) => prev + 1);
        setQuestionStartTime(Date.now());
      }, 500);
    },
    [currentIndex, squares, gameState, questionStartTime]
  );

  const getStats = (): GameStats => {
    const correct = answers.filter((a) => a).length;
    const incorrect = answers.filter((a) => !a).length;
    const averageTime =
      questionTimes.length > 0
        ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
        : 0;

    return { correct, incorrect, totalTime: 0, averageTime };
  };

  const handlePlayAgain = () => {
    setGameState('setup');
    setCurrentIndex(0);
    setSquares([]);
    setAnswers([]);
    setQuestionTimes([]);
    setTimeRemaining(timeLimit);
    setShowResult(false);
    setLastAnswer(null);
  };

  if (gameState === 'finished') {
    const stats = getStats();
    const total = answers.length;
    const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;
    const timeElapsed = timeLimit - timeRemaining;

    return (
      <PracticeResult
        score={{
          correct: stats.correct,
          total,
          accuracy,
          timeElapsed,
          averageTime: stats.averageTime,
        }}
        onTryAgain={handlePlayAgain}
        locale={locale}
        translations={{
          correctAnswers: translations.correctAnswers,
          accuracy: translations.accuracy,
          timeTaken: translations.timeTaken,
          averageTime: translations.averageTime,
          tryAgain: translations.tryAgain,
          morePractice: translations.morePractice,
        }}
      />
    );
  }

  if (gameState === 'setup') {
    return (
      <div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">{translations.settings}</h2>

          <div className="mb-6">
            <TimeSlider
              timeLimit={timeLimit}
              onTimeLimitChange={setTimeLimit}
              translations={{
                timeLimit: translations.timeLimit,
                seconds: translations.seconds,
              }}
              locale={locale}
            />
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
  const timeElapsed = timeLimit - timeRemaining;

  return (
    <div>
      {/* Timer display */}
      <TimeDisplay
        timeRemaining={timeRemaining}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        translations={{
          timeRemaining: translations.timeRemaining,
        }}
      />

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
