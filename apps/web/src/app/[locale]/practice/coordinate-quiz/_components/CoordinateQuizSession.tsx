'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Square } from 'chess.js';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';

import type { BoardOrientation, CoordinateQuestion, FeedbackSpeed } from '../_lib/types';
import { FEEDBACK_SPEED_MS } from '../_lib/types';
import { calculateScore, checkAnswer, generateSingleQuestion } from '../_lib/utils';
import { CoordinateQuizPlaying } from './CoordinateQuizPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  initialBoardOrientation: string;
  initialFeedbackSpeed: string;
};

export default function CoordinateQuizSession({
  locale,
  initialTimeLimit,
  initialBoardOrientation,
  initialFeedbackSpeed,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const tPractice = useTranslations('practice');

  const timeLimit = initialTimeLimit;
  const boardOrientation = initialBoardOrientation as BoardOrientation;
  const feedbackSpeed = initialFeedbackSpeed as FeedbackSpeed;
  const feedbackDuration = FEEDBACK_SPEED_MS[feedbackSpeed];

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<CoordinateQuestion | null>(null);
  const [recentSquares, setRecentSquares] = useState<Square[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStarted = useRef(false);
  const hasScrolled = useRef(false);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const firstQuestion = generateSingleQuestion(boardOrientation);
    setCurrentQuestion(firstQuestion);
    setRecentSquares([firstQuestion.targetSquare]);
  }, [boardOrientation]);

  // Scroll to quiz-session element after first question is rendered
  useEffect(() => {
    if (!currentQuestion || hasScrolled.current) return;
    hasScrolled.current = true;

    const element = document.getElementById('quiz-session');
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [currentQuestion]);

  // Start timer
  useEffect(() => {
    if (!currentQuestion || isFinished || countdown !== null || showFeedback) return;

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime >= timeLimit) {
          setIsFinished(true);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestion, isFinished, timeLimit, countdown, showFeedback]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (isFinished || !currentQuestion || showFeedback || countdown !== null) return;

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
      }, feedbackDuration);
    },
    [
      isFinished,
      currentQuestion,
      showFeedback,
      boardOrientation,
      recentSquares,
      feedbackDuration,
      countdown,
    ]
  );

  const handlePlayAgain = () => {
    // Reset and restart
    const firstQuestion = generateSingleQuestion(boardOrientation);
    setCurrentQuestion(firstQuestion);
    setRecentSquares([firstQuestion.targetSquare]);
    setTotalQuestions(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setTimeElapsed(0);
    setLastClickedSquare(null);
    setShowFeedback(false);
    setIsFinished(false);
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500); // Show "START!" for 0.5s
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const score = isFinished
    ? calculateScore(correctAnswers, totalQuestions, timeElapsed, timeLimit)
    : null;

  const timeRemaining = Math.max(0, timeLimit - timeElapsed);

  if (isFinished && score) {
    return (
      <PracticeResult
        score={{
          correct: correctAnswers,
          total: totalQuestions,
          accuracy: score.accuracy,
          timeElapsed,
          averageTime: score.averageTime,
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

  // Show loading state while question is being generated
  if (!currentQuestion) {
    return null;
  }

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
      countdown={countdown}
    />
  );
}
