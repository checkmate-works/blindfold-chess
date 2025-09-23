'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Square } from 'chess.js';
import {
  generateSingleQuestion,
  checkAnswer,
  formatTime,
  calculateScore,
  BoardOrientation,
  CoordinateQuestion,
} from '../_lib/coordinate-quiz';
import { CoordinateQuizBoard } from './CoordinateQuizBoard';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';
import { Breadcrumb } from '@/app/[locale]/_components';
import { Link } from '@/i18n/routing';

type GameState = 'setup' | 'playing' | 'finished';

interface CoordinateQuizClientProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    description: string;
    settings: string;
    timeLimit: string;
    boardOrientation: string;
    white: string;
    black: string;
    random: string;
    start: string;
    clickSquare: string;
    whiteToMove: string;
    blackToMove: string;
    correct: string;
    wrong: string;
    timeRemaining: string;
    finished: string;
    points: string;
    correctAnswers: string;
    accuracy: string;
    timeTaken: string;
    averageTime: string;
    tryAgain: string;
    morePractice: string;
    practice: string;
  };
}

export default function CoordinateQuizClient({ locale, translations }: CoordinateQuizClientProps) {
  // Game settings
  const [timeLimit, setTimeLimit] = useState(60);
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white');

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
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-8">{translations.description}</p>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">{translations.settings}</h2>

          <CoordinateQuizSettings
            timeLimit={timeLimit}
            boardOrientation={boardOrientation}
            onTimeLimitChange={setTimeLimit}
            onBoardOrientationChange={setBoardOrientation}
            translations={{
              timeLimit: translations.timeLimit,
              boardOrientation: translations.boardOrientation,
              white: translations.white,
              black: translations.black,
              random: translations.random,
            }}
          />

          <button
            onClick={startGame}
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors mt-6"
          >
            {translations.start}
          </button>
        </div>

        {/* Breadcrumb at bottom */}
        <div className="mt-8 pt-6 border-t border-border">
          <Breadcrumb
            items={[
              { label: translations.practice, href: '/practice' },
              { label: translations.title },
            ]}
            locale={locale}
          />
        </div>
      </div>
    );
  }

  if (gameState === 'finished' && score) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border mb-8">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center">
              <div className="text-2xl font-semibold text-foreground">
                {correctAnswers}/{totalQuestions}
              </div>
              <div className="text-sm text-muted-foreground">{translations.correctAnswers}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-foreground">
                {score.accuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">{translations.accuracy}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-foreground">
                {formatTime(timeElapsed)}
              </div>
              <div className="text-sm text-muted-foreground">{translations.timeTaken}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-foreground">
                {score.averageTime.toFixed(1)}s
              </div>
              <div className="text-sm text-muted-foreground">{translations.averageTime}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={startGame}
              className="flex-1 bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {translations.tryAgain}
            </button>
            <Link
              href="/practice"
              locale={locale}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-3 px-6 rounded-xl transition-colors text-center"
            >
              {translations.morePractice}
            </Link>
          </div>
        </div>

        {/* Breadcrumb at bottom */}
        <div className="mt-8 pt-6 border-t border-border">
          <Breadcrumb
            items={[
              { label: translations.practice, href: '/practice' },
              { label: translations.title },
            ]}
            locale={locale}
          />
        </div>
      </div>
    );
  }

  // Playing state
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        {/* Timer and score */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            {translations.correct}: {correctAnswers} / {translations.wrong}: {wrongAnswers}
          </span>
          <span className="text-sm text-muted-foreground">
            {translations.timeRemaining}: {formatTime(timeRemaining)}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-foreground h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(timeElapsed / timeLimit) * 100}%` }}
          />
        </div>
      </div>

      {currentQuestion && (
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-2">
            {currentQuestion.targetSquare}
          </h2>
          <p className="text-lg text-muted-foreground">{translations.clickSquare}</p>
        </div>
      )}

      <div className="max-w-md mx-auto mb-8">
        <div className="mb-2 text-center flex items-center justify-center gap-2">
          <div
            className={`w-5 h-5 rounded-full border-2 ${
              currentQuestion?.orientation === 'white'
                ? 'bg-white border-gray-800 dark:border-gray-600'
                : 'bg-gray-800 dark:bg-gray-700 border-gray-800 dark:border-gray-600'
            }`}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {currentQuestion?.orientation === 'white'
              ? translations.whiteToMove
              : translations.blackToMove}
          </span>
        </div>
        <CoordinateQuizBoard
          orientation={currentQuestion?.orientation || 'white'}
          onSquareClick={handleSquareClick}
          highlightedSquares={
            showFeedback && lastClickedSquare && currentQuestion
              ? {
                  [lastClickedSquare]: isCorrect ? 'correct' : 'incorrect',
                  [currentQuestion.targetSquare]: 'target',
                }
              : {}
          }
        />
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {translations.correct}: {correctAnswers}
        </span>
        <span>
          {translations.wrong}: {wrongAnswers}
        </span>
      </div>

      {/* Breadcrumb at bottom */}
      <div className="mt-8 pt-6 border-t border-border">
        <Breadcrumb
          items={[
            { label: translations.practice, href: '/practice' },
            { label: translations.title },
          ]}
          locale={locale}
        />
      </div>
    </div>
  );
}
