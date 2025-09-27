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
  getMaxProblems,
  getCustomPositions,
  validateFEN,
  type GamePhase,
  type PositionData,
  type PositionAccuracy,
} from '../_lib/position-memory';
import type { Locale } from '../../../_lib/types';

type ExtendedGamePhase = GamePhase | 'setup' | 'problem-result';

interface PositionMemoryClientProps {
  locale: Locale;
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
  const [useCustomFen, setUseCustomFen] = useState(false);
  const [customFenInput, setCustomFenInput] = useState('');
  const [customFenError, setCustomFenError] = useState<string | null>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('positionMemorySettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTimeLimit(settings.timeLimit ?? 10);
        setProblemCount(settings.problemCount ?? 1);
        setShuffleProblems(settings.shuffleProblems ?? true);
        setUseCustomFen(settings.useCustomFen ?? false);
        setCustomFenInput(settings.customFenInput ?? '');
      } catch (error) {
        console.error('Failed to load position memory settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Skip the initial render to avoid overwriting with defaults
    const savedSettings = localStorage.getItem('positionMemorySettings');
    if (!savedSettings && customFenInput === '') {
      // Don't save empty customFenInput on initial load
      return;
    }

    const settings = {
      timeLimit,
      problemCount,
      shuffleProblems,
      useCustomFen,
      customFenInput,
    };
    localStorage.setItem('positionMemorySettings', JSON.stringify(settings));
  }, [timeLimit, problemCount, shuffleProblems, useCustomFen, customFenInput]);

  // Game state
  const [phase, setPhase] = useState<ExtendedGamePhase>('setup');
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [originalPosition, setOriginalPosition] = useState<PositionData | null>(null);
  const [recreatedPosition, setRecreatedPosition] = useState('8/8/8/8/8/8/8/8 w - - 0 1');
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(timeLimit);
  const [currentAccuracy, setCurrentAccuracy] = useState<PositionAccuracy | null>(null);
  const [problemResults, setProblemResults] = useState<PositionAccuracy[]>([]);

  // Validate custom FEN when input changes
  useEffect(() => {
    if (useCustomFen && customFenInput.trim()) {
      const lines = customFenInput
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      const invalidLines: number[] = [];

      lines.forEach((line, index) => {
        if (!validateFEN(line.trim())) {
          invalidLines.push(index + 1);
        }
      });

      if (invalidLines.length > 0) {
        const lineStr =
          locale === 'ja'
            ? `行 ${invalidLines.join(', ')} に無効なFENがあります`
            : `Invalid FEN on line${invalidLines.length > 1 ? 's' : ''} ${invalidLines.join(', ')}`;
        setCustomFenError(lineStr);
      } else {
        setCustomFenError(null);
      }
    } else {
      setCustomFenError(null);
    }
  }, [customFenInput, useCustomFen, locale]);

  const startGame = useCallback(() => {
    let newPositions: PositionData[];

    if (useCustomFen) {
      const lines = customFenInput
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      if (lines.length === 0) {
        return;
      }

      // Validate all FEN strings
      const allValid = lines.every((line) => validateFEN(line.trim()));
      if (!allValid) {
        return;
      }

      newPositions = getCustomPositions(lines, lines.length, shuffleProblems);
    } else {
      newPositions = getRandomPositions(problemCount, shuffleProblems);
    }

    setPositions(newPositions);
    setCurrentProblemIndex(0);
    setOriginalPosition(newPositions[0]);
    setMemorizeTimeLeft(timeLimit);
    setProblemResults([]);
    setCurrentAccuracy(null);
    setRecreatedPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    setPhase('memorize');
  }, [timeLimit, problemCount, shuffleProblems, useCustomFen, customFenInput]);

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
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">{translations.settings}</h2>

          <PositionMemorySettings
            timeLimit={timeLimit}
            problemCount={problemCount}
            shuffleProblems={shuffleProblems}
            maxProblems={getMaxProblems()}
            useCustomFen={useCustomFen}
            customFenInput={customFenInput}
            customFenError={customFenError}
            locale={locale}
            onTimeLimitChange={setTimeLimit}
            onProblemCountChange={setProblemCount}
            onShuffleChange={setShuffleProblems}
            onUseCustomFenChange={setUseCustomFen}
            onCustomFenInputChange={setCustomFenInput}
            translations={{
              timeLimit: translations.timeLimit,
              seconds: translations.seconds,
              problemCount: translations.problemCount,
              problems: translations.problems,
              shuffle: translations.shuffle,
              useCustomFen: locale === 'ja' ? 'カスタムFENを使用' : 'Use Custom FEN',
              customFenPlaceholder:
                locale === 'ja'
                  ? 'FENを改行区切りで入力\n例: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
                  : 'Enter FEN strings (one per line)\nExample: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              customFenError: locale === 'ja' ? '無効なFEN' : 'Invalid FEN',
            }}
          />

          <button
            onClick={startGame}
            disabled={useCustomFen && (customFenError !== null || !customFenInput.trim())}
            className="w-full mt-6 bg-foreground hover:bg-foreground/90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed text-background font-semibold py-3 px-6 rounded-xl transition-colors"
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
            {translations.timeRemaining}: {memorizeTimeLeft}
            {locale === 'ja' ? '秒' : 's'}
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
