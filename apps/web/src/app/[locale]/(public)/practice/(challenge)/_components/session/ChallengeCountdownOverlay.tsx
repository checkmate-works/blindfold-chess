import { BoardOverlay } from '@/app/_components';

type Props = {
  /** Seconds left, `0` for the "START!" beat, `null` when not counting down. */
  countdown: number | null;
  /** Passed through to {@link BoardOverlay} for boards that go flush-edge. */
  rounded?: string;
};

/**
 * The "3 · 2 · 1 · START!" curtain drawn over a challenge session's question
 * area before the first question. Hidden (renders nothing) unless a countdown
 * is running.
 *
 * `BoardOverlay` already emits `z-50`, so the `z-50` several call sites used to
 * pass alongside `backdrop-blur-md` was a no-op and is not reproduced here.
 */
export function ChallengeCountdownOverlay({ countdown, rounded }: Props) {
  return (
    <BoardOverlay
      isVisible={countdown !== null}
      className="backdrop-blur-md"
      rounded={rounded}
      data-testid="countdown-overlay"
    >
      <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
        {countdown !== null && (countdown > 0 ? countdown : 'START!')}
      </span>
    </BoardOverlay>
  );
}
