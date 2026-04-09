'use client';

import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';

type ChallengePlayingHeaderProps = {
  remainingLives?: number;
  maxLives?: number;
  isPaused: boolean;
  onTogglePause?: () => void;
  countdown: number | null;
  timeRemaining: number;
  timeLimit: number;
};

export function ChallengePlayingHeader({
  remainingLives,
  maxLives,
  isPaused,
  onTogglePause,
  countdown,
  timeRemaining,
  timeLimit,
}: ChallengePlayingHeaderProps) {
  const timeElapsed = timeLimit - timeRemaining;

  return (
    <div className="flex justify-between items-center mb-4 min-h-[40px] relative">
      {/* Lives */}
      <div className="flex items-center gap-1">
        {maxLives !== undefined &&
          remainingLives !== undefined &&
          Array.from({ length: maxLives }, (_, i) => (
            <span key={i} className="text-destructive">
              {i < remainingLives ? (
                <FaHeart className="w-5 h-5" />
              ) : (
                <FaRegHeart className="w-5 h-5 opacity-30" />
              )}
            </span>
          ))}
      </div>
      <div className="flex items-center gap-2 z-20">
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
            disabled={countdown !== null}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <LuPlay size={18} className="fill-current" />
            ) : (
              <LuPause size={18} className="fill-current" />
            )}
          </button>
        )}
        <QuizTimer
          timeRemaining={timeRemaining}
          progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
          size={40}
          fontSize="text-xs"
          strokeWidth={4}
        />
      </div>
    </div>
  );
}
