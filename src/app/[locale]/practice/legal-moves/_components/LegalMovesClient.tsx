'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PracticeResult } from '../../_components/PracticeResult';
import { TimeDisplay } from '../../_components/TimeDisplay';
import { LegalMovesSettings } from './LegalMovesSettings';
import {
  isLegalMove,
  generateBalancedMoveQuestions,
  pieceDisplayMap,
  type MoveQuestion,
  type PieceType,
} from '../_lib/legal-moves';

interface GameStats {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
}

type GameState = 'setup' | 'playing' | 'finished';

interface LegalMovesClientProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    description: string;
    settings: string;
    timeLimit: string;
    seconds: string;
    pieceSelection: string;
    selectAtLeastOne: string;
    pieces: {
      bishop: string;
      knight: string;
      rook: string;
      queen: string;
      king: string;
    };
    start: string;
    question: string;
    correct: string;
    incorrect: string;
    legal: string;
    illegal: string;
    practice: string;
    finished: string;
    correctAnswers: string;
    accuracy: string;
    timeTaken: string;
    averageTime: string;
    tryAgain: string;
    morePractice: string;
    timeRemaining: string;
  };
}

const STORAGE_KEY = 'legalMoves_settings';

export function LegalMovesClient({ locale, translations }: LegalMovesClientProps) {
  // Game settings - Default values (will be updated from localStorage in useEffect)
  const [timeLimit, setTimeLimit] = useState(60); // Default to 60 seconds
  const [selectedPieces, setSelectedPieces] = useState<Record<PieceType, boolean>>({
    king: true,
    queen: true,
    rook: true,
    bishop: true,
    knight: true,
  });

  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<MoveQuestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null>(null);
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
          if (settings.selectedPieces) {
            setSelectedPieces(settings.selectedPieces);
          }
        } catch {}
      }
      setSettingsLoaded(true);
    }
  }, []);

  // Save settings to localStorage when they change (after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLimit, selectedPieces }));
    }
  }, [timeLimit, selectedPieces, settingsLoaded]);

  const startGame = useCallback(() => {
    // Get selected piece types
    const selectedPieceTypes = Object.entries(selectedPieces)
      .filter(([_, selected]) => selected)
      .map(([piece]) => piece) as PieceType[];

    if (selectedPieceTypes.length === 0) {
      // Show error or prevent starting
      return;
    }

    // Initialize game with selected pieces - generate a large pool (100 questions)
    const newQuestions = generateBalancedMoveQuestions(100, selectedPieceTypes);
    setQuestions(newQuestions);
    setQuestionStartTime(Date.now());
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionTimes([]);
    setTimeRemaining(timeLimit);
    setShowResult(false);
    setLastAnswer(null);
    setGameState('playing');
  }, [timeLimit, selectedPieces]);

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
    (userAnswer: boolean) => {
      if (gameState === 'finished') return;

      const currentQuestion = questions[currentIndex];
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      const isCorrect = userAnswer === isLegal;

      // Update timing
      const now = Date.now();
      const questionTime = now - questionStartTime;
      setQuestionTimes((prev) => [...prev, questionTime / 1000]); // Convert to seconds

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, userAnswer, isLegal });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        setShowResult(false);
        setCurrentIndex((prev) => prev + 1);
        setQuestionStartTime(Date.now());
      }, 500);
    },
    [currentIndex, questions, gameState, questionStartTime]
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
    setQuestions([]);
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

  // Setup screen
  if (gameState === 'setup') {
    const togglePiece = (piece: PieceType) => {
      setSelectedPieces((prev) => ({ ...prev, [piece]: !prev[piece] }));
    };

    const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">{translations.settings}</h2>

          <LegalMovesSettings
            timeLimit={timeLimit}
            selectedPieces={selectedPieces}
            onTimeLimitChange={setTimeLimit}
            onPieceToggle={togglePiece}
            locale={locale}
            translations={{
              timeLimit: translations.timeLimit,
              seconds: translations.seconds,
              pieceSelection: translations.pieceSelection,
              selectAtLeastOne: translations.selectAtLeastOne,
              pieces: translations.pieces,
            }}
          />

          <button
            onClick={startGame}
            disabled={!hasSelectedPieces}
            className="w-full mt-6 bg-foreground hover:bg-foreground/90 disabled:bg-secondary disabled:cursor-not-allowed text-background font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {translations.start}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const timeElapsed = timeLimit - timeRemaining;

  // Wait for questions to be generated
  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Timer display */}
      <TimeDisplay
        timeRemaining={timeRemaining}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        translations={{
          timeRemaining: translations.timeRemaining,
        }}
      />

      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-8">
          {translations.question
            .replace('{from}', currentQuestion.from)
            .replace('{to}', currentQuestion.to)}
        </h2>

        <div className="mb-8">
          <div className="text-6xl mb-4">{pieceDisplayMap[currentQuestion.piece]}</div>
          <div className="text-lg text-muted-foreground">
            {translations.pieces[currentQuestion.piece]}
          </div>

          {showResult && lastAnswer && (
            <div
              className={`mt-4 text-lg font-medium ${
                lastAnswer.correct
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {lastAnswer.correct
                ? translations.correct
                : `${translations.incorrect} (${
                    lastAnswer.isLegal ? translations.legal : translations.illegal
                  })`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleAnswer(true)}
            disabled={showResult}
            className="px-6 py-4 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">○</span>
            <span>{translations.legal}</span>
          </button>
          <button
            onClick={() => handleAnswer(false)}
            disabled={showResult}
            className="px-6 py-4 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">×</span>
            <span>{translations.illegal}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
