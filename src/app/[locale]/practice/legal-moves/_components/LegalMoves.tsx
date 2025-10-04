'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';
import type { GameState } from '@/app/[locale]/practice/_lib/types';

import type { MoveQuestion, PieceType } from '../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../_lib/utils';
import { LegalMovesPlaying } from './LegalMovesPlaying';
import { LegalMovesSetup } from './LegalMovesSetup';

type GameStats = {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
};

type Props = {
  locale: Locale;
};

const STORAGE_KEY = 'legalMoves_settings';

export function LegalMoves({ locale }: Props) {
  const t = useTranslations('practice.legalMoves');
  const tPractice = useTranslations('practice');

  // Helper function to get question text
  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });
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

  // Setup screen
  if (gameState === 'setup') {
    const togglePiece = (piece: PieceType) => {
      setSelectedPieces((prev) => ({ ...prev, [piece]: !prev[piece] }));
    };

    const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

    return (
      <LegalMovesSetup
        timeLimit={timeLimit}
        selectedPieces={selectedPieces}
        onTimeLimitChange={setTimeLimit}
        onPieceToggle={togglePiece}
        onStart={startGame}
        hasSelectedPieces={hasSelectedPieces}
      />
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
    <LegalMovesPlaying
      currentQuestion={currentQuestion}
      timeRemaining={timeRemaining}
      timeLimit={timeLimit}
      timeElapsed={timeElapsed}
      showResult={showResult}
      lastAnswer={lastAnswer}
      onAnswer={handleAnswer}
      getQuestion={getQuestion}
    />
  );
}
