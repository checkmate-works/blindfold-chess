'use client';

import { useCallback, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import {
  type FenPosition,
  selectInitialPositions,
  summarizeFenSession,
} from '@blindfold-chess/features/fen-practice';
import {
  useFenPracticeSession,
  usePieceAccuracy,
} from '@blindfold-chess/features/fen-practice/client';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import {
  realignToElement,
  useScrollToElement,
} from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { FenProblemResult } from './FenProblemResult';
import { FenRecreate } from './FenRecreate';

type Props = {
  locale: Locale;
  problemCount: number;
  shuffle: boolean;
  isTutorial?: boolean;
  customFen?: string;
  fens?: string[];
};

export function FenSession({
  locale,
  problemCount,
  shuffle,
  isTutorial = false,
  customFen,
  fens,
}: Props) {
  const t = useTranslations('practice.fen');
  const quitModalLabels = useQuitConfirmLabels({
    message: t('quitConfirmMessage'),
    confirmButton: t('quitConfirmYes'),
    cancelButton: t('quitConfirmNo'),
  });

  const { preferences, isLoaded } = useGamePreferences();
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(t);

  // Positions are derived once on first render from props — no effect-based
  // initialization and no `hasMounted` flag required. `FenSession` is loaded
  // via `next/dynamic`, so it never renders on the server.
  const [initialPositions] = useState<FenPosition[]>(() =>
    selectInitialPositions(customFen, fens, problemCount, shuffle)
  );

  useScrollToElement('fen-session');

  const {
    positions,
    phase,
    currentProblemIndex,
    originalPosition,
    recreatedPosition,
    setRecreatedPosition,
    currentAccuracy,
    problemResults,
    recreatedPositions,
    skippedProblems,
    submit: handleSubmit,
    skip,
    nextProblem,
    finish,
  } = useFenPracticeSession({
    positions: initialPositions,
    pieceNames,
    accuracyDescriptions,
  });
  const [showQuitModal, setShowQuitModal] = useState(false);

  const handleSkip = useCallback(() => {
    if (skip()) realignToElement('fen-session');
  }, [skip]);

  const handleNextProblem = useCallback(() => {
    nextProblem();
    realignToElement('fen-session');
  }, [nextProblem]);

  const handlePlayAgain = useCallback(() => {
    window.location.href = `/${locale}/practice/fen`;
  }, [locale]);

  const handleQuitClick = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const handleQuitConfirm = useCallback(() => {
    setShowQuitModal(false);
    finish();
  }, [finish]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
  }, []);

  // Wait for preferences to be loaded (positions are initialized synchronously).
  if (!isLoaded || positions.length === 0) {
    return null;
  }

  // Recreate phase
  if (phase === 'recreate' && originalPosition) {
    return (
      <>
        <div id="fen-session" className="min-h-screen">
          <FenRecreate
            originalPosition={originalPosition}
            recreatedPosition={recreatedPosition}
            currentProblemIndex={currentProblemIndex}
            problemCount={positions.length}
            boardTheme={preferences.boardTheme}
            showCoordinates={preferences.showCoordinates}
            isTutorial={isTutorial}
            onPositionChange={setRecreatedPosition}
            onSubmit={handleSubmit}
            onSkip={handleSkip}
            onQuit={handleQuitClick}
          />
        </div>
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
          labels={quitModalLabels}
        />
      </>
    );
  }

  // Problem result phase
  if (phase === 'problem-result' && currentAccuracy && originalPosition) {
    return (
      <FenProblemResult
        accuracy={currentAccuracy}
        originalPosition={originalPosition}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={currentProblemIndex}
        totalProblems={positions.length}
        boardTheme={preferences.boardTheme}
        showCoordinates={preferences.showCoordinates}
        isTutorial={isTutorial}
        onNextProblem={handleNextProblem}
        onViewResults={finish}
        onFinishTutorial={handlePlayAgain}
      />
    );
  }

  // Final result phase
  if (phase === 'result') {
    const summary = summarizeFenSession({
      positions,
      problemResults,
      recreatedPositions,
      skippedProblems,
    });

    if (summary.empty) {
      const data = JSON.stringify({
        score: 0,
        total: 100,
        results: [],
        detailedStats: null,
      });
      const scoreText = `${t('accuracy')}: 0.0% (0/0)`;
      window.location.href = `/${locale}/practice/fen/result?data=${encodeURIComponent(data)}&scoreText=${encodeURIComponent(scoreText)}`;
      return <PracticeResultSkeleton />;
    }

    const { totalAccuracy, totalCorrect, totalPieces } = summary.aggregated;

    const data = JSON.stringify({
      score: summary.score,
      total: 100,
      results: summary.results,
      detailedStats: summary.detailedStats,
    });

    const scoreText = `${t('accuracy')}: ${totalAccuracy.toFixed(1)}% (${totalCorrect}/${totalPieces})`;

    window.location.href = `/${locale}/practice/fen/result?data=${encodeURIComponent(data)}&scoreText=${encodeURIComponent(scoreText)}`;
    return <PracticeResultSkeleton />;
  }

  return <PracticeResultSkeleton />;
}
