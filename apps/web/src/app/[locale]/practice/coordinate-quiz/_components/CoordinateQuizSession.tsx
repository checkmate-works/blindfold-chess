'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Square } from 'chess.js';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameTimer } from '../../_hooks/useGameTimer';
// import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';

import type { BoardOrientation, CoordinateQuestion, FeedbackSpeed } from '../_lib/types';
import { FEEDBACK_SPEED_MS } from '../_lib/types';
import { checkAnswer, generateSingleQuestion } from '../_lib/utils';
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
  const router = useRouter();

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
  // const [timeElapsed, setTimeElapsed] = useState(0); // Replaced by hook
  const [lastClickedSquare, setLastClickedSquare] = useState<Square | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isPaused, setIsPaused] = useState(false);

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

  // Timer hook
  const isPlaying =
    !!currentQuestion && !isFinished && countdown === null && !showFeedback && !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => setIsFinished(true), []),
  });

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (isFinished || !currentQuestion || showFeedback || countdown !== null || isPaused) return;

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
      isPaused,
    ]
  );

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

  // Redirect on finish
  useEffect(() => {
    if (isFinished) {
      const params = new URLSearchParams();
      params.set('score', correctAnswers.toString());
      params.set('total', totalQuestions.toString());
      params.set('time', totalTime.toString());
      params.set('timeLimit', timeLimit.toString()); // Pass timeLimit separately for restart
      params.set('orientation', boardOrientation);
      params.set('speed', feedbackSpeed);

      router.push(`/${locale}/practice/coordinate-quiz/result?${params.toString()}`);
    }
  }, [
    isFinished,
    correctAnswers,
    totalQuestions,
    locale,
    router,
    totalTime,
    timeLimit,
    boardOrientation,
    feedbackSpeed,
  ]);

  if (isFinished) {
    return null; // Or loading spinner
  }

  // Show loading state while question is being generated
  if (!currentQuestion) {
    return null;
  }

  const timeRemaining = Math.max(0, timeLimit - timeElapsed);

  return (
    <div id="coordinate-quiz-session" className="min-h-screen">
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
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
