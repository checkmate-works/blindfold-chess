'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useMachine } from '@xstate/react';

import { usePieceAccuracy } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-piece-accuracy';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { positionMemoryMachine } from '../_lib/machines/positionMemoryMachine';
import type { PositionData } from '../_lib/types';
import { calculateAccuracy } from '../_lib/utils';
import { PositionMemoryMemorize } from './PositionMemoryMemorize';
import { PositionMemoryProblemResult } from './PositionMemoryProblemResult';
import { PositionMemoryRecreate } from './PositionMemoryRecreate';

type Props = {
  locale: Locale;
  positionId: string;
  fen: string;
  timeLimit: number;
};

export function SinglePositionSession({ locale, positionId, fen, timeLimit }: Props) {
  const t = useTranslations('practice.positionMemory');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();
  const quitModalLabels = useQuitConfirmLabels({
    message: t('quitConfirmMessage'),
    confirmButton: t('quitConfirmYes'),
    cancelButton: t('quitConfirmNo'),
  });
  const { pieceNames, accuracyDescriptions } = usePieceAccuracy(t);

  const [hasMounted, setHasMounted] = useState(false);

  const position = useMemo<PositionData>(
    () => ({
      fen,
      isBlackToMove: fen.split(' ')[1] === 'b',
    }),
    [fen]
  );

  const [state, send] = useMachine(positionMemoryMachine, {
    input: {
      positions: [position],
      timeLimit,
      mode: 'custom',
    },
  });

  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
    }
  }, [hasMounted]);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);

  useScrollToElement('position-memory-session', hasMounted);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Timer effect for memorize phase
  useEffect(() => {
    if (countdown !== null) return;

    if (state.value === 'memorize' && state.context.memorizeTimeLeft >= 0) {
      const timer = setTimeout(() => {
        send({ type: 'TICK' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.value, state.context.memorizeTimeLeft, send, countdown]);

  const { recreatedPosition, memorizeTimeLeft, currentAccuracy, problemResults, showQuitModal } =
    state.context;

  // Navigate to result page when session ends
  useEffect(() => {
    if (state.value !== 'sessionResult') return;

    const result = problemResults.get(0);
    const isSkipped = state.context.skippedProblems.has(0) || !result;

    const serializedResults = [
      {
        f: position.fen,
        r: state.context.recreatedPositions.get(0) || '',
        b: position.isBlackToMove ? 1 : 0,
        a: result?.accuracy ?? 0,
        c: result?.correctPieces ?? 0,
        t: result?.totalPieces ?? 0,
        i: result?.incorrectPieces ?? 0,
        m: result?.missingPieces ?? 0,
        e: result?.extraPieces ?? 0,
        o: 0,
        s: isSkipped ? 1 : 0,
      },
    ];

    const serializedStats = {
      c: result?.correctPieces ?? 0,
      t: result?.totalPieces ?? 0,
      i: result?.incorrectPieces ?? 0,
      m: result?.missingPieces ?? 0,
      e: result?.extraPieces ?? 0,
    };

    const params = new URLSearchParams();
    params.set('score', (result?.accuracy ?? 0).toFixed(1));
    params.set('total', '100');
    params.set('data', encodeURIComponent(JSON.stringify(serializedResults)));
    params.set('stats', encodeURIComponent(JSON.stringify(serializedStats)));
    params.set('timeLimit', timeLimit.toString());

    router.push(`/${locale}/practice/position-memory/${positionId}/result?${params.toString()}`);
  }, [state.value, problemResults, state.context, position, locale, positionId, router, timeLimit]);

  const handleMemorized = useCallback(() => {
    send({ type: 'MEMORIZED' });
  }, [send]);

  const handleSubmit = useCallback(() => {
    const accuracy = calculateAccuracy(
      position.fen,
      recreatedPosition,
      pieceNames,
      accuracyDescriptions
    );
    send({ type: 'SUBMIT', accuracy });
  }, [position.fen, recreatedPosition, pieceNames, accuracyDescriptions, send]);

  const handleSkip = useCallback(() => {
    // 1-problem mode: skip goes directly to session result
    send({ type: 'SKIP' });
  }, [send]);

  const handleViewAgain = useCallback(() => {
    send({ type: 'VIEW_AGAIN' });
  }, [send]);

  const handleQuitClick = useCallback(() => {
    send({ type: 'OPEN_QUIT_MODAL' });
  }, [send]);

  const handleQuitConfirm = useCallback(() => {
    send({ type: 'CONFIRM_QUIT' });
  }, [send]);

  const handleQuitCancel = useCallback(() => {
    send({ type: 'CANCEL_QUIT' });
  }, [send]);

  const handlePositionChange = useCallback(
    (newFen: string) => {
      send({ type: 'UPDATE_POSITION', fen: newFen });
    },
    [send]
  );

  const handleViewResults = useCallback(() => {
    send({ type: 'VIEW_RESULTS' });
  }, [send]);

  // Wait for mount and preferences to load
  if (!hasMounted || !isLoaded) {
    return null;
  }

  // Memorize phase
  if (state.value === 'memorize') {
    return (
      <div id="position-memory-session" className="min-h-screen">
        <PositionMemoryMemorize
          position={position}
          memorizeTimeLeft={memorizeTimeLeft}
          currentProblemIndex={0}
          problemCount={1}
          boardTheme={preferences.boardTheme}
          onMemorized={handleMemorized}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
          countdown={countdown}
          timeLimit={timeLimit}
        />
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={handleQuitConfirm}
          onCancel={handleQuitCancel}
          labels={quitModalLabels}
        />
      </div>
    );
  }

  // Recreate phase
  if (state.value === 'recreate') {
    return (
      <>
        <PositionMemoryRecreate
          originalPosition={position}
          recreatedPosition={recreatedPosition}
          currentProblemIndex={0}
          problemCount={1}
          boardTheme={preferences.boardTheme}
          onPositionChange={handlePositionChange}
          onSubmit={handleSubmit}
          onViewAgain={handleViewAgain}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
        />
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
  if (state.value === 'problemResult' && currentAccuracy) {
    return (
      <PositionMemoryProblemResult
        accuracy={currentAccuracy}
        originalPosition={position}
        recreatedPosition={recreatedPosition}
        currentProblemIndex={0}
        totalProblems={1}
        boardTheme={preferences.boardTheme}
        onNextProblem={handleViewResults}
        onViewResults={handleViewResults}
      />
    );
  }

  return <PracticeResultSkeleton />;
}
