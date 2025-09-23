'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChessBoard } from '../../_components/ChessBoard';
import { ProgressBar } from '../../_components/ProgressBar';
import { PracticeComplete } from '../../_components/PracticeComplete';
import { SimpleChessBoard } from './SimpleChessBoard';
import { PositionMemorySettings } from './PositionMemorySettings';
import { Breadcrumb } from '@/app/[locale]/_components';
import {
  getRandomPositions,
  calculateAccuracy,
  type GamePhase,
  type PositionData,
  type PositionAccuracy,
} from '../_lib/position-memory';

type ExtendedGamePhase = GamePhase | 'setup' | 'problem-result';

interface PositionMemoryClientProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    description: string;
    settings: string;
    timeLimit: string;
    seconds: string;
    problemCount: string;
    problems: string;
    shuffle: string;
    start: string;
    memorize: string;
    recreate: string;
    result: string;
    memorizing: string;
    timeRemaining: string;
    memorized: string;
    recreatePosition: string;
    submit: string;
    accuracy: string;
    correct: string;
    extra: string;
    score: string;
    nextProblem: string;
    viewResults: string;
    original: string;
    yourRecreation: string;
    practice: string;
    practiceComplete: string;
    tryAgain: string;
    morePractice: string;
    pieceNames: Record<string, string>;
    scoreDescriptions: {
      correct: string;
      wrongPiece: string;
      missing: string;
      extra: string;
    };
  };
}

export function PositionMemoryClient({ locale, translations }: PositionMemoryClientProps) {
  // Game settings
  const [timeLimit, setTimeLimit] = useState(10);
  const [problemCount, setProblemCount] = useState(1);
  const [shuffleProblems, setShuffleProblems] = useState(true);

  // Game state
  const [phase, setPhase] = useState<ExtendedGamePhase>('setup');
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [originalPosition, setOriginalPosition] = useState<PositionData | null>(null);
  const [recreatedPosition, setRecreatedPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(timeLimit);
  const [currentAccuracy, setCurrentAccuracy] = useState<PositionAccuracy | null>(null);
  const [problemResults, setProblemResults] = useState<PositionAccuracy[]>([]);

  const startGame = useCallback(() => {
    const newPositions = getRandomPositions(problemCount, shuffleProblems);
    setPositions(newPositions);
    setCurrentProblemIndex(0);
    setOriginalPosition(newPositions[0]);
    setMemorizeTimeLeft(timeLimit);
    setProblemResults([]);
    setCurrentAccuracy(null);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setPhase('memorize');
  }, [timeLimit, problemCount, shuffleProblems]);

  const handleMemorized = useCallback(() => {
    setPhase('recreate');
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
  }, []);

  useEffect(() => {
    if (phase === 'memorize' && memorizeTimeLeft > 0) {
      const timer = setTimeout(() => {
        setMemorizeTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'memorize' && memorizeTimeLeft === 0) {
      handleMemorized();
    }
  }, [phase, memorizeTimeLeft, handleMemorized]);

  const handleSubmit = useCallback(() => {
    if (!originalPosition) return;

    const descriptions = {
      correct: (piece: string, square: string) =>
        translations.scoreDescriptions.correct
          .replace('{piece}', piece)
          .replace('{square}', square),
      wrongPiece: (square: string, expected: string, actual: string) =>
        translations.scoreDescriptions.wrongPiece
          .replace('{square}', square)
          .replace('{expected}', expected)
          .replace('{actual}', actual),
      missing: (piece: string, square: string) =>
        translations.scoreDescriptions.missing
          .replace('{piece}', piece)
          .replace('{square}', square),
      extra: (piece: string, square: string) =>
        translations.scoreDescriptions.extra.replace('{piece}', piece).replace('{square}', square),
    };

    const accuracy = calculateAccuracy(
      originalPosition.fen,
      recreatedPosition,
      translations.pieceNames,
      descriptions
    );

    setCurrentAccuracy(accuracy);
    setProblemResults((prev) => [...prev, accuracy]);

    // Always show problem-result phase first
    setPhase('problem-result');
  }, [originalPosition, recreatedPosition, translations]);

  const handleNextProblem = useCallback(() => {
    const nextIndex = currentProblemIndex + 1;
    setCurrentProblemIndex(nextIndex);
    setOriginalPosition(positions[nextIndex]);
    setMemorizeTimeLeft(timeLimit);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setCurrentAccuracy(null);
    setPhase('memorize');
  }, [currentProblemIndex, positions, timeLimit]);

  const handlePlayAgain = useCallback(() => {
    setPhase('setup');
    setPositions([]);
    setCurrentProblemIndex(0);
    setOriginalPosition(null);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setMemorizeTimeLeft(timeLimit);
    setCurrentAccuracy(null);
    setProblemResults([]);
  }, [timeLimit]);

  // Setup phase
  if (phase === 'setup') {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-8">{translations.description}</p>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">{translations.settings}</h2>

          <PositionMemorySettings
            timeLimit={timeLimit}
            problemCount={problemCount}
            shuffleProblems={shuffleProblems}
            onTimeLimitChange={setTimeLimit}
            onProblemCountChange={setProblemCount}
            onShuffleChange={setShuffleProblems}
            maxProblems={10}
            translations={{
              timeLimit: translations.timeLimit,
              seconds: translations.seconds,
              problemCount: translations.problemCount,
              problems: translations.problems,
              shuffle: translations.shuffle,
            }}
          />

          <button
            onClick={startGame}
            className="w-full mt-6 bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {translations.start}
          </button>
        </div>

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

  // Memorize phase
  if (phase === 'memorize' && originalPosition) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">{translations.memorizing}</h2>
          <p className="text-lg text-muted-foreground">
            {translations.timeRemaining}: {memorizeTimeLeft}s
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md">
            <ChessBoard
              initialFen={originalPosition.fen}
              showCoordinates={true}
              flipped={originalPosition.isBlackToMove}
            />
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleMemorized}
            className="px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            {translations.memorized}
          </button>
        </div>

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

  // Recreate phase
  if (phase === 'recreate' && originalPosition) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {translations.recreatePosition}
          </h2>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <SimpleChessBoard
              fen={recreatedPosition}
              onFenChange={setRecreatedPosition}
              flipped={originalPosition.isBlackToMove}
              editable={true}
              preserveTurnInfo={true}
              originalPosition={originalPosition.fen}
              translations={{
                blackPieces: locale === 'ja' ? '黒の駒' : 'Black Pieces',
                whitePieces: locale === 'ja' ? '白の駒' : 'White Pieces',
                removePieceMode:
                  locale === 'ja'
                    ? '駒を削除 - マスをクリックして駒を削除'
                    : 'Remove piece mode - Click on a square to remove piece',
                placingPiece: locale === 'ja' ? '配置中:' : 'Placing',
              }}
            />
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            {translations.submit}
          </button>
        </div>

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

  // Problem result phase
  if (phase === 'problem-result' && currentAccuracy && originalPosition) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">
            {translations.accuracy}: {currentAccuracy.accuracy.toFixed(1)}%
          </h2>

          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div>
              <p className="text-2xl font-bold text-green-600">{currentAccuracy.correctPieces}</p>
              <p className="text-sm text-muted-foreground">{translations.correct}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{currentAccuracy.extraPieces}</p>
              <p className="text-sm text-muted-foreground">{translations.extra}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {currentAccuracy.netScore.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">{translations.score}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {translations.original}
              </p>
              <div className="w-full max-w-xs mx-auto">
                <ChessBoard
                  initialFen={originalPosition.fen}
                  showCoordinates={false}
                  flipped={originalPosition.isBlackToMove}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {translations.yourRecreation}
              </p>
              <div className="w-full max-w-xs mx-auto">
                <ChessBoard
                  initialFen={recreatedPosition}
                  showCoordinates={false}
                  flipped={originalPosition.isBlackToMove}
                />
              </div>
            </div>
          </div>

          {currentProblemIndex < positions.length - 1 ? (
            <button
              onClick={handleNextProblem}
              className="w-full mt-6 bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {translations.nextProblem}
            </button>
          ) : (
            <button
              onClick={() => setPhase('result')}
              className="w-full mt-6 bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {translations.viewResults}
            </button>
          )}
        </div>

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

  // Final result phase
  if (phase === 'result' && problemResults.length > 0) {
    const totalAccuracy =
      problemResults.reduce((sum, r) => sum + r.accuracy, 0) / problemResults.length;
    const totalCorrect = problemResults.reduce((sum, r) => sum + r.correctPieces, 0);
    const totalPieces = problemResults.reduce((sum, r) => sum + r.totalPieces, 0);

    return (
      <PracticeComplete
        score={Math.round(totalAccuracy)}
        total={100}
        onTryAgain={handlePlayAgain}
        locale={locale}
        translations={{
          practiceComplete: translations.practiceComplete,
          score: `${translations.accuracy}: ${totalAccuracy.toFixed(1)}% (${totalCorrect}/${totalPieces})`,
          tryAgain: translations.tryAgain,
          morePractice: translations.morePractice,
        }}
      />
    );
  }

  return null;
}
