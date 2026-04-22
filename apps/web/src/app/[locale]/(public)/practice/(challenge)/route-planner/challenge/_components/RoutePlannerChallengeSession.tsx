'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { LuPlay } from 'react-icons/lu';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../../_lib/utils';
import { useRoutePlannerSession } from './_hooks/useRoutePlannerSession';
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

  const {
    currentProblem,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    timeElapsed,
    isDisabled,
    hookHandleAnswer,
    togglePause,
    recordProblemResult,
    showQuitModal,
    handleQuitRequest,
    handleQuitConfirm,
    handleQuitCancel,
  } = useRoutePlannerSession({ locale, initialTimeLimit, allowedPieces });

  if (!currentProblem || isFinished) {
    return <PracticeResultSkeleton />;
  }

  // Identity key for the per-problem view — React remounts ProblemBody on
  // change, which discards moves / staged coord / feedback marker without
  // any manual effect-based reset.
  const problemKey = `${currentProblem.piece}:${currentProblem.start}:${currentProblem.end}`;

  return (
    <div id="route-planner-challenge-session" className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6 relative overflow-hidden">
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
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleQuitRequest}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
        >
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
