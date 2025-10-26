'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeComplete } from '@/app/[locale]/practice/_components/PracticeComplete';

import type { GamePhase, PositionAccuracy, PositionData } from '../_lib/types';
import {
  calculateAccuracy,
  getCustomPositions,
  getMaxProblems,
  getRandomPositions,
  validateFEN,
} from '../_lib/utils';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';
import { PositionMemorySetup } from './PositionMemorySetup';

type ExtendedGamePhase = GamePhase | 'setup' | 'problem-result';

type Props = {
  locale: Locale;
  urlError?: string | null;
  urlFens?: string[] | null;
  urlTimeLimit?: number | null;
  urlShuffle?: boolean | null;
};

export function PositionMemory({ locale, urlError, urlFens, urlTimeLimit, urlShuffle }: Props) {
  const t = useTranslations('practice.positionMemory');
  const tPractice = useTranslations('practice');

  // Helper function to get score description
  const getScoreDescription = useCallback(
    (type: 'correct' | 'wrongPiece' | 'missing' | 'extra', params: Record<string, string>) => {
      return t(`scoreDescriptions.${type}`, params);
    },
    [t]
  );
  // Game settings
  const [timeLimit, setTimeLimit] = useState(10);
  const [problemCount, setProblemCount] = useState(1);
  const [shuffleProblems, setShuffleProblems] = useState(true);
  const [useCustomFen, setUseCustomFen] = useState(false);
  const [customFenInput, setCustomFenInput] = useState('');
  const [customFenError, setCustomFenError] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  // Load saved settings from localStorage or URL params
  useEffect(() => {
    // URL params take priority over localStorage
    if (urlFens) {
      setUseCustomFen(true);
      setCustomFenInput(urlFens.join('\n'));
      setTimeLimit(urlTimeLimit ?? 10);
      setShuffleProblems(urlShuffle ?? true);
      setHasLoadedSettings(true);
      return;
    }

    // Handle URL errors
    if (urlError) {
      setCustomFenError(urlError);
      setHasLoadedSettings(true);
      return;
    }

    // Load from localStorage if no URL params
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
    setHasLoadedSettings(true);
  }, [urlFens, urlTimeLimit, urlShuffle, urlError]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Don't save if settings haven't been loaded yet
    if (!hasLoadedSettings) {
      return;
    }

    // Don't save if loaded from URL params
    if (urlFens) {
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
  }, [
    timeLimit,
    problemCount,
    shuffleProblems,
    useCustomFen,
    customFenInput,
    hasLoadedSettings,
    urlFens,
  ]);

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
          invalidLines.length > 1
            ? t('invalidFenOnLines', { lines: invalidLines.join(', ') })
            : t('invalidFenOnLine', { lines: invalidLines.join(', ') });
        setCustomFenError(lineStr);
      } else {
        setCustomFenError(null);
      }
    } else {
      setCustomFenError(null);
    }
  }, [customFenInput, useCustomFen, t]);

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

    // Create pieceNames object for calculateAccuracy
    const pieceNames: Record<string, string> = {
      K: t('pieceNames.K'),
      Q: t('pieceNames.Q'),
      R: t('pieceNames.R'),
      B: t('pieceNames.B'),
      N: t('pieceNames.N'),
      P: t('pieceNames.P'),
      k: t('pieceNames.k'),
      q: t('pieceNames.q'),
      r: t('pieceNames.r'),
      b: t('pieceNames.b'),
      n: t('pieceNames.n'),
      p: t('pieceNames.p'),
    };

    // Create descriptions object for calculateAccuracy
    const accuracyDescriptions = {
      correct: (piece: string, square: string) => getScoreDescription('correct', { piece, square }),
      wrongPiece: (square: string, expected: string, actual: string) =>
        getScoreDescription('wrongPiece', { square, expected, actual }),
      missing: (piece: string, square: string) => getScoreDescription('missing', { piece, square }),
      extra: (piece: string, square: string) => getScoreDescription('extra', { piece, square }),
    };

    const accuracy = calculateAccuracy(
      originalPosition.fen,
      recreatedPosition,
      pieceNames,
      accuracyDescriptions
    );

    setCurrentAccuracy(accuracy);
    setProblemResults((prev) => [...prev, accuracy]);

    // Always show problem-result phase first
    setPhase('problem-result');
  }, [originalPosition, recreatedPosition, t, getScoreDescription]);

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
      <PositionMemorySetup
        locale={locale}
        timeLimit={timeLimit}
        problemCount={problemCount}
        shuffleProblems={shuffleProblems}
        maxProblems={getMaxProblems()}
        useCustomFen={useCustomFen}
        customFenInput={customFenInput}
        customFenError={customFenError}
        onTimeLimitChange={setTimeLimit}
        onProblemCountChange={setProblemCount}
        onShuffleChange={setShuffleProblems}
        onUseCustomFenChange={setUseCustomFen}
        onCustomFenInputChange={setCustomFenInput}
        onStart={startGame}
      />
    );
  }

  // Memorize phase
  if (phase === 'memorize' && originalPosition) {
    return (
      <PositionMemoryMemorize
        position={originalPosition}
        memorizeTimeLeft={memorizeTimeLeft}
        currentProblemIndex={currentProblemIndex}
        problemCount={problemCount}
        onMemorized={handleMemorized}
      />
    );
  }

  // Recreate phase
  if (phase === 'recreate' && originalPosition) {
    return (
      <PositionMemoryRecreate
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        problemCount={problemCount}
        onPositionChange={setRecreatedPosition}
        onSubmit={handleSubmit}
      />
    );
  }

  // Problem result phase
  if (phase === 'problem-result' && currentAccuracy && originalPosition) {
    return (
      <PositionMemoryProblemResult
        accuracy={currentAccuracy}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        totalProblems={positions.length}
        onNextProblem={handleNextProblem}
        onViewResults={() => setPhase('result')}
      />
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
        labels={{
          practiceComplete: tPractice('practiceComplete'),
          score: `${t('accuracy')}: ${totalAccuracy.toFixed(1)}% (${totalCorrect}/${totalPieces})`,
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
        }}
      />
    );
  }

  return null;
}
