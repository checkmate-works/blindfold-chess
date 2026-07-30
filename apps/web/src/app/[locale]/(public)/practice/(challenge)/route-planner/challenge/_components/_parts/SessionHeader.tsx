'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight } from 'react-icons/fa';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeStatusHeader } from '@/app/[locale]/(public)/practice/(challenge)/_components/session/ChallengeStatusHeader';

import type { PieceType } from '../../../_lib/pieces';

type Props = {
  incorrectCount: number;
  currentProblem: { piece: PieceType; start: string; end: string };
  initialTimeLimit: number;
  timeRemaining: number;
  timeElapsed: number;
  isPaused: boolean;
  showFeedback: boolean;
  countdown: number | null;
  onTogglePause: () => void;
};

/**
 * Route-planner's session header: the shared lives / pause / timer row,
 * followed by this module's own problem statement (piece + start → target
 * squares). Lives are derived from the mistake count rather than tracked
 * separately, which is why the run's remaining lives are computed here.
 */
export function SessionHeader({
  incorrectCount,
  currentProblem,
  initialTimeLimit,
  timeRemaining,
  timeElapsed,
  isPaused,
  showFeedback,
  countdown,
  onTogglePause,
}: Props) {
  const t = useTranslations('practice.routePlanner');

  return (
    <>
      <ChallengeStatusHeader
        className="flex justify-between items-center mb-4"
        remainingLives={MISTAKE_LIMIT - incorrectCount}
        maxLives={MISTAKE_LIMIT}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        pauseDisabled={countdown !== null || showFeedback}
        timeRemaining={timeRemaining}
        timeLimit={initialTimeLimit}
        timeElapsed={timeElapsed}
      />

      {/* Problem Header */}
      <div className="flex justify-between items-center pb-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-2 rounded-lg text-primary w-14 h-14 flex items-center justify-center border border-primary/20">
            <ChessPiece type={currentProblem.piece} color="w" size={32} />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('startSquare')}</div>
              <div className="text-xl font-mono font-bold">{currentProblem.start}</div>
            </div>
            <div className="text-muted-foreground pt-4">
              <FaArrowRight />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('targetSquare')}</div>
              <div className="text-xl font-mono font-bold">{currentProblem.end}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
