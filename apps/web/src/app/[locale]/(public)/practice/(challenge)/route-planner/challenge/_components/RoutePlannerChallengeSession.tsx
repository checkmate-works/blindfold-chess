'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useRoutePlannerSession } from '@blindfold-chess/features/route-planner/client';
import { LuPlay } from 'react-icons/lu';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { saveRoutePlannerResult } from '@/app/[locale]/(public)/practice/(challenge)/route-planner/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../../_lib/utils';
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
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();
  const router = useRouter();

  const [problemResults, setProblemResults] = useState<ProblemResult[]>([]);
  const [showQuitModal, setShowQuitModal] = useState(false);

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

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/route-planner/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

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
  });

  if (!currentProblem || isFinished) {
    return <PracticeResultSkeleton />;
  }

  const problemKey = `${currentProblem.piece}:${currentProblem.start}:${currentProblem.end}`;

  return (
    <div id="route-planner-challenge-session" className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div className="p-6 space-y-6 relative overflow-hidden">
        {/* Countdown Overlay */}
        <BoardOverlay
          isVisible={countdown !== null}
          className="backdrop-blur-md z-50"
          data-testid="countdown-overlay"
        >
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40 z-50">
          <button
            onClick={togglePause}
            className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label={tPractice('resume')}
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

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

          <div className="-mx-6 sm:mx-0">
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
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} />

      {/* Quit section (no Skip in challenge mode) */}
      <div className="flex flex-col items-center gap-2">
        <button onClick={handleQuitRequest} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
          {tPractice('quit')}
        </button>
      </div>

      <QuitConfirmModal
        isOpen={showQuitModal}
        onConfirm={handleQuitConfirm}
        onCancel={handleQuitCancel}
        labels={quitConfirmLabels}
      />
    </div>
  );
}
