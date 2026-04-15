'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';

import type { PieceType } from '../../../_lib/utils';

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
  const tPractice = useTranslations('practice');

  return (
    <>
      {/* Header: Lives and Timer */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: MISTAKE_LIMIT }, (_, i) => (
            <span key={i} className="text-destructive">
              {i < MISTAKE_LIMIT - incorrectCount ? (
                <FaHeart className="w-5 h-5" />
              ) : (
                <FaRegHeart className="w-5 h-5 opacity-30" />
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            disabled={countdown !== null || showFeedback}
            className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
            aria-label={isPaused ? tPractice('resume') : tPractice('pause')}
          >
            {isPaused ? (
              <LuPlay size={18} className="fill-current" />
            ) : (
              <LuPause size={18} className="fill-current" />
            )}
          </button>
          <QuizTimer
            timeRemaining={timeRemaining}
            progress={initialTimeLimit > 0 ? timeElapsed / initialTimeLimit : 0}
            size={40}
            fontSize="text-xs"
            strokeWidth={4}
          />
        </div>
      </div>

      {/* Problem Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
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
