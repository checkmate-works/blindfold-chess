'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Square } from 'chess.js';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';
import type { GameState } from '@/app/[locale]/practice/_lib/types';

import type { BoardOrientation, CoordinateQuestion } from '../_lib/types';
import { calculateScore, checkAnswer, generateSingleQuestion } from '../_lib/utils';
import { CoordinateQuizPlaying } from './CoordinateQuizPlaying';
import { CoordinateQuizSetup } from './CoordinateQuizSetup';

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'coordinateQuiz_settings';

export default function CoordinateQuiz({ locale }: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const tPractice = useTranslations('practice');

  // Load settings from localStorage using lazy initializer
  const [timeLimit, setTimeLimit] = useState(() => {
    if (typeof window === 'undefined') return 60;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.timeLimit || 60;
      } catch {}
    }
    return 60;
  });

  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>(() => {
    if (typeof window === 'undefined') return 'white';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.boardOrientation || 'white';
      } catch {}
    }
    return 'white';
  });

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [currentQuestion, setCurrentQuestion] = useState<CoordinateQuestion | null>(null);
  const [recentSquares, setRecentSquares] = useState<Square[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit, boardOrientation }));
    }
  }, [timeLimit, boardOrientation]);

  // Start timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => {
          const newTime = prev + 1;
          if (newTime >= timeLimit) {
            setGameState('finished');
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState, timeLimit]);

  const startGame = useCallback(() => {
    // Generate first question
    const firstQuestion = generateSingleQuestion(boardOrientation);
    setCurrentQuestion(firstQuestion);
    setRecentSquares([firstQuestion.targetSquare]);
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setTimeElapsed(0);
    setLastClickedSquare(null);
    setShowFeedback(false);
    setGameState('playing');
  }, [boardOrientation]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (gameState !== 'playing' || !currentQuestion || showFeedback) return;

      setLastClickedSquare(square);
      const correct = checkAnswer(square, currentQuestion.targetSquare);
      setIsCorrect(correct);
      setShowFeedback(true);
      setTotalQuestions((prev) => prev + 1);

      if (correct) {
        setCorrectAnswers((prev) => prev + 1);
      } else {
        setWrongAnswers((prev) => prev + 1);
      }

      // Generate next question after a short delay
      setTimeout(() => {
        // Keep track of recent squares to avoid repetition
        const updatedRecentSquares = [...recentSquares, currentQuestion.targetSquare].slice(-10);
        setRecentSquares(updatedRecentSquares);

        // Generate new question
        const nextQuestion = generateSingleQuestion(boardOrientation, updatedRecentSquares);
        setCurrentQuestion(nextQuestion);
        setShowFeedback(false);
        setLastClickedSquare(null);
      }, 800);
    },
    [gameState, currentQuestion, showFeedback, boardOrientation, recentSquares]
  );

  const score =
    gameState === 'finished'
      ? calculateScore(correctAnswers, totalQuestions, timeElapsed, timeLimit)
      : null;

  const timeRemaining = Math.max(0, timeLimit - timeElapsed);

  if (gameState === 'setup') {
    return (
      <CoordinateQuizSetup
        timeLimit={timeLimit}
        boardOrientation={boardOrientation}
        onTimeLimitChange={setTimeLimit}
        onBoardOrientationChange={setBoardOrientation}
        onStart={startGame}
      />
    );
  }

  if (gameState === 'finished' && score) {
    return (
      <PracticeResult
        score={{
          correct: correctAnswers,
          total: totalQuestions,
          accuracy: score.accuracy,
          timeElapsed,
          averageTime: score.averageTime,
        }}
        onTryAgain={startGame}
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

  // Playing state
  return (
    <CoordinateQuizPlaying
      currentQuestion={currentQuestion}
      timeRemaining={timeRemaining}
      timeLimit={timeLimit}
      timeElapsed={timeElapsed}
      correctAnswers={correctAnswers}
      wrongAnswers={wrongAnswers}
      lastClickedSquare={lastClickedSquare}
      showFeedback={showFeedback}
      isCorrect={isCorrect}
      onSquareClick={handleSquareClick}
    />
  );
}
