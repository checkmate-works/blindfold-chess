'use client';

import { BoardOverlay } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { LuPlay } from 'react-icons/lu';

type Props = {
  isPaused: boolean;
  /** Resume handler — the whole curtain exists to host this one button. */
  onTogglePause?: () => void;
  /** Passed through to {@link BoardOverlay} for boards that go flush-edge. */
  rounded?: string;
};

/**
 * The dimmed curtain with a central resume button shown while a challenge
 * session is paused. Hidden (renders nothing) unless paused.
 *
 * `BoardOverlay` already emits `z-50`, so the `z-50` several call sites used to
 * pass alongside `bg-black/40` was a no-op and is not reproduced here.
 */
export function ChallengePauseOverlay({ isPaused, onTogglePause, rounded }: Props) {
  const tPractice = useTranslations('practice');

  return (
    <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40" rounded={rounded}>
      <button
        onClick={onTogglePause}
        className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110 active:scale-95 pointer-events-auto"
        aria-label={tPractice('resume')}
      >
        <LuPlay size={48} className="fill-current ml-1" />
      </button>
    </BoardOverlay>
  );
}
