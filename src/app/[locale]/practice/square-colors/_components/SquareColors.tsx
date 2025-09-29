'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PracticeResult } from '../../_components/PracticeResult';
import { SquareColorsSetup } from './SquareColorsSetup';
import { SquareColorsPlaying } from './SquareColorsPlaying';
import { getSquareColor, generateSquareSequence } from '../_lib/square-utils';
import type { GameState } from '../../_lib/types';
import type { Locale } from '../../../_lib/types';

type Props = {
  locale: Locale;
};

interface GameStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
}

const STORAGE_KEY = 'squareColors_settings';

export default function SquareColors({ locale }: Props) {
  const t = useTranslations('practice.squareColors');
  const tPractice = useTranslations('practice');

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
        labels={{
          correctAnswers: t('correctAnswers'),
          accuracy: t('accuracy'),
          timeTaken: t('timeTaken'),
          averageTime: t('averageTime'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
        }}
      />
    );
  }

  if (gameState === 'setup') {
    return (
      <SquareColorsSetup
        timeLimit={timeLimit}
        onTimeLimitChange={setTimeLimit}
        onStart={startGame}
        locale={locale}
      />
    );
  }

  return (
    <SquareColorsPlaying
      currentSquare={squares[currentIndex]}
      timeRemaining={timeRemaining}
      timeLimit={timeLimit}
      showResult={showResult}
      lastAnswer={lastAnswer}
      onAnswer={handleAnswer}
    />
  );
}
