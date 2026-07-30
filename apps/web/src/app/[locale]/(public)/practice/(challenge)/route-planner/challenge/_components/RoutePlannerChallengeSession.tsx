'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRoutePlannerSession } from '@blindfold-chess/features/route-planner/client';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeCountdownOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeCountdownOverlay';
import { ChallengePauseOverlay } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengePauseOverlay';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { saveRoutePlannerResult } from '@/app/[locale]/(public)/practice/(challenge)/route-planner/_actions/save-result';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerPlaySkeleton } from '../../_components/RoutePlannerPlaySkeleton';
import { RoutePlannerResultSkeleton } from '../../_components/RoutePlannerResultSkeleton';
import type { PieceType } from '../../_lib/pieces';
import type { ProblemResult } from './_parts/ProblemBody';
import { ProblemBody } from './_parts/ProblemBody';
import { SessionHeader } from './_parts/SessionHeader';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  allowedPieces: PieceType[];
};

export default function RoutePlannerChallengeSession({
  locale,
  initialTimeLimit,
  allowedPieces,
}: Props) {
  const [problemResults, setProblemResults] = useState<ProblemResult[]>([]);

  const piecesForGeneration = useMemo(
    () => (allowedPieces.length > 0 ? allowedPieces : (['n', 'b'] as PieceType[])),
    [allowedPieces]
  );

  const {
    currentProblem,
    timeRemaining,
    timeElapsed,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    handleAnswer: hookHandleAnswer,
    togglePause,
    finishSession,
  } = useRoutePlannerSession({
    selectedPieces: piecesForGeneration,
    timeLimit: initialTimeLimit,
    mistakeAllowance: MISTAKE_LIMIT,
  });

  useScrollToElement('route-planner-challenge-session');

  const isDisabled = showFeedback || isPaused || countdown !== null;

  const recordProblemResult = useCallback((result: ProblemResult) => {
    setProblemResults((prev) => [...prev, result]);
  }, []);

  // Set when the user quits mid-run. The run still lands on the result/feedback
  // screen, but `skipSave` below suppresses leaderboard recording, EXP, and rank
  // evaluation — a voluntarily-abandoned run is not rewarded.
  const [isAborted, setIsAborted] = useState(false);
  const handleAbort = useCallback(() => {
    setIsAborted(true);
    finishSession();
  }, [finishSession]);

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'route-planner',
    isPaused,
    togglePause,
    onConfirm: handleAbort,
  });

  const total = correctCount + incorrectCount;

  const resultUrl = useMemo(() => {
    const dataStr = encodeURIComponent(JSON.stringify(problemResults));
    const piecesStr = allowedPieces.join('');

    const params = new URLSearchParams();
    params.set('data', dataStr);
    params.set('mode', 'standard');
    params.set('count', total.toString());
    params.set('pieces', piecesStr);
    params.set('time', timeElapsed.toString());
    if (allowedPieces.length === 1) {
      const pieceName = allowedPieces[0] === 'n' ? 'knight' : 'bishop';
      params.set('piece', pieceName);
    }

    return `/${locale}/practice/route-planner/result?${params.toString()}`;
  }, [problemResults, allowedPieces, total, locale, timeElapsed]);

  const pieceName = useMemo(() => {
    if (allowedPieces.length === 1) {
      return allowedPieces[0] === 'n' ? 'knight' : 'bishop';
    }
    return 'knight';
  }, [allowedPieces]);

  const saveResult = useCallback(
    () =>
      saveRoutePlannerResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: timeElapsed,
        piece: pieceName,
      }),
    [correctCount, incorrectCount, timeElapsed, pieceName]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    saveResult,
    moduleName: 'route_planner',
    skipSave: isAborted,
  });

  if (isFinished) {
    return <RoutePlannerResultSkeleton />;
  }
  if (!currentProblem) {
    return <RoutePlannerPlaySkeleton showHeader />;
  }

  const problemKey = `${currentProblem.piece}:${currentProblem.start}:${currentProblem.end}`;

  return (
    <div id="route-planner-challenge-session" className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div className="space-y-6 relative overflow-hidden">
        <ChallengeCountdownOverlay countdown={countdown} />
        <ChallengePauseOverlay isPaused={isPaused} onTogglePause={togglePause} />

        <div
          className={`transition-all duration-300 ${isPaused || countdown !== null ? 'blur-sm' : ''}`}
        >
          <SessionHeader
            incorrectCount={incorrectCount}
            currentProblem={currentProblem}
            initialTimeLimit={initialTimeLimit}
            timeRemaining={timeRemaining}
            timeElapsed={timeElapsed}
            isPaused={isPaused}
            showFeedback={showFeedback}
            countdown={countdown}
            onTogglePause={togglePause}
          />

          <ProblemBody
            key={problemKey}
            currentProblem={currentProblem}
            isDisabled={isDisabled}
            showFeedback={showFeedback}
            isPaused={isPaused}
            countdown={countdown}
            onAnswer={hookHandleAnswer}
            onRecordResult={recordProblemResult}
          />
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} />

      {/* Quit section (no Skip in challenge mode) */}
      <ChallengeQuitControl
        className="flex flex-col items-center gap-2"
        onQuitRequest={handleQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={handleQuitCancel}
      />
    </div>
  );
}
