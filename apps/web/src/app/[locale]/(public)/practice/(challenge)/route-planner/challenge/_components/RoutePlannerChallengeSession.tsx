'use client';

import { useCallback, useMemo, useState } from 'react';

import type { RemoteChallengePort } from '@blindfold-chess/features/challenge-attempt';
import {
  ROUTE_PLANNER_CHALLENGE_PIECES,
  type RoutePlannerChallengePiece,
  type RoutePlannerProblem,
  type RoutePlannerProblemResult,
} from '@blindfold-chess/features/route-planner';
import { useRoutePlannerSession } from '@blindfold-chess/features/route-planner/client';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import {
  AwaitingServerVeil,
  ChallengeAttemptGate,
} from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeAttemptGate';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { ChallengeQuitControl } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeQuitControl';
import { ChallengeSessionVeil } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeSessionVeil';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RoutePlannerPlaySkeleton } from '../../_components/RoutePlannerPlaySkeleton';
import { RoutePlannerResultSkeleton } from '../../_components/RoutePlannerResultSkeleton';
import type { PieceType } from '../../_lib/pieces';
import { findShortestPath } from '../../_lib/route-planner-api';
import { ProblemBody } from './_parts/ProblemBody';
import { SessionHeader } from './_parts/SessionHeader';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  selectedPiece: RoutePlannerChallengePiece;
};

export default function RoutePlannerChallengeSession({
  locale,
  initialTimeLimit,
  selectedPiece,
}: Props) {
  const settings = useMemo(() => ({ selectedPiece }), [selectedPiece]);

  return (
    <ChallengeAttemptGate<RoutePlannerProblem>
      menuType="route_planner"
      settings={settings}
      fallback={<RoutePlannerPlaySkeleton showHeader />}
    >
      {(attempt) => (
        <RoutePlannerChallengeRun
          locale={locale}
          initialTimeLimit={initialTimeLimit}
          selectedPiece={selectedPiece}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

type RunProps = {
  locale: Locale;
  initialTimeLimit: number;
  selectedPiece: RoutePlannerChallengePiece;
  attemptId: string | null;
  remote: RemoteChallengePort<RoutePlannerProblem> | undefined;
};

function RoutePlannerChallengeRun({
  locale,
  initialTimeLimit,
  selectedPiece,
  attemptId,
  remote,
}: RunProps) {
  const [problemResults, setProblemResults] = useState<RoutePlannerProblemResult[]>([]);

  // The same piece the server generates the attempt's problems for.
  const allowedPieces = useMemo<PieceType[]>(
    () => [ROUTE_PLANNER_CHALLENGE_PIECES[selectedPiece]],
    [selectedPiece]
  );

  const {
    currentProblem,
    timeRemaining,
    timeElapsed,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    finishReason,
    countdown,
    isPaused,
    remoteFailed,
    awaitingServer,
    handleAnswer: hookHandleAnswer,
    togglePause,
    finishSession,
  } = useRoutePlannerSession({
    selectedPieces: allowedPieces,
    timeLimit: initialTimeLimit,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
  });

  useScrollToElement('route-planner-challenge-session');

  const isDisabled = showFeedback || isPaused || countdown !== null || awaitingServer;

  const recordProblemResult = useCallback((result: RoutePlannerProblemResult) => {
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
    // Drop an optimistic detail if the server did not count its answer.
    const countedResults = problemResults.slice(0, total);
    // The time limit is the one ending that leaves a problem on screen
    // unanswered (the timer is paused during the feedback flash). Keep it in
    // the list so the result shows its answer; it carries no user path and
    // the result page leaves it out of the score.
    const results: RoutePlannerProblemResult[] =
      finishReason === 'timeUp' && currentProblem
        ? [
            ...countedResults,
            {
              piece: currentProblem.piece,
              start: currentProblem.start,
              end: currentProblem.end,
              success: false,
              userPath: [],
              shortestPath:
                findShortestPath(currentProblem.piece, currentProblem.start, currentProblem.end) ??
                [],
              timedOut: true,
            },
          ]
        : countedResults;
    const dataStr = encodeURIComponent(JSON.stringify(results));
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
  }, [finishReason, currentProblem, problemResults, allowedPieces, total, locale, timeElapsed]);

  useChallengeResultSave({
    isFinished,
    totalAnswers: total,
    resultUrl,
    attemptId,
    remoteFailed,
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
    <div id="route-planner-challenge-session" className="min-h-screen max-w-2xl mx-auto">
      <ChallengeSessionVeil
        countdown={countdown}
        isPaused={isPaused}
        onTogglePause={togglePause}
        className="pt-2 space-y-6"
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
          awaitingServer={awaitingServer}
        />

        <AwaitingServerVeil active={awaitingServer}>
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
        </AwaitingServerVeil>

        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
      </ChallengeSessionVeil>

      {/* Quit section (no Skip in challenge mode) */}
      <ChallengeQuitControl
        onQuitRequest={handleQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={handleQuitCancel}
      />
    </div>
  );
}
