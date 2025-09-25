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
import { PracticeResult } from '../../_components/PracticeResult';
import { TimeDisplay } from '../../_components/TimeDisplay';

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

const STORAGE_KEY = 'coordinateQuiz_settings';

export default function CoordinateQuizClient({ locale, translations }: CoordinateQuizClientProps) {
  // Game settings - Default values (will be updated from localStorage in useEffect)
  const [timeLimit, setTimeLimit] = useState(60); // Default to 60 seconds
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
          if (settings.boardOrientation) {
            setBoardOrientation(settings.boardOrientation);
          }
        } catch {}
      }
      setSettingsLoaded(true);
    }
  }, []);

  // Save settings to localStorage when they change (after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit, boardOrientation }));
    }
  }, [timeLimit, boardOrientation, settingsLoaded]);

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
            locale={locale}
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
      </div>
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

  // Playing state
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Timer display with score */}
      <TimeDisplay
        timeRemaining={timeRemaining}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        translations={{
          timeRemaining: translations.timeRemaining,
        }}
        formatTime={formatTime}
        leftContent={`${translations.correct}: ${correctAnswers} / ${translations.wrong}: ${wrongAnswers}`}
      />

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
    </div>
  );
}
