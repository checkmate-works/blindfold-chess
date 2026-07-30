'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { QuizTimer } from '@/app/[locale]/(public)/practice/_components/QuizTimer';

type Props = {
  /**
   * Lives remaining / total. Both omitted → the lives slot renders empty but
   * still occupies its side of the row, so the timer stays right-aligned
   * (diagonal-quiz's training mode has no mistake limit).
   */
  remainingLives?: number;
  maxLives?: number;
  isPaused: boolean;
  /** Omitted → no pause button (a session that cannot be paused). */
  onTogglePause?: () => void;
  /**
   * Whether the pause button is inert. Each module computes this from its own
   * "input is frozen" state — countdown running, feedback showing, a result
   * being displayed — which is why it is passed in rather than derived here.
   */
  pauseDisabled?: boolean;
  timeRemaining: number;
  timeLimit: number;
  /**
   * Elapsed time driving the timer ring. Defaults to `timeLimit -
   * timeRemaining`; pass it explicitly for sessions that track elapsed time
   * separately from the countdown (legal-moves, coordinate-quiz).
   */
  timeElapsed?: number;
  /**
   * Layout classes for the row itself. Required in practice — every module
   * tunes its own spacing / min-height against the surrounding content, so
   * the row deliberately ships no margin of its own.
   */
  className?: string;
};

/**
 * The lives / pause / timer row shown at the top of every challenge-mode
 * session.
 *
 * This markup was previously hand-copied into all seven challenge sessions
 * (and extracted twice, independently, as diagonal-quiz's
 * `ChallengePlayingHeader` and inside route-planner's `SessionHeader`). The
 * copies had drifted: some labelled the pause button with hardcoded English
 * while route-planner translated it. The translated form won — the
 * `practice.pause` / `practice.resume` keys already existed in every locale.
 *
 * Only the row's own layout classes vary between modules, so those come in
 * via {@link Props.className}; everything inside is fixed.
 */
export function ChallengeStatusHeader({
  remainingLives,
  maxLives,
  isPaused,
  onTogglePause,
  pauseDisabled = false,
  timeRemaining,
  timeLimit,
  timeElapsed,
  className,
}: Props) {
  const tPractice = useTranslations('practice');
  const elapsed = timeElapsed ?? timeLimit - timeRemaining;

  return (
    <div className={className}>
      {/* Lives — left side */}
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
      {/* Timer and pause — right side */}
      <div className="flex items-center gap-2">
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            disabled={pauseDisabled}
            className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
            aria-label={isPaused ? tPractice('resume') : tPractice('pause')}
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
          progress={timeLimit > 0 ? elapsed / timeLimit : 0}
          size={40}
          fontSize="text-xs"
          strokeWidth={4}
        />
      </div>
    </div>
  );
}
