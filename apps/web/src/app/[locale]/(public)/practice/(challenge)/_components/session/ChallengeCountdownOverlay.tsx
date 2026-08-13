import { BoardOverlay } from '@/app/_components';

type Props = {
  /** Seconds left, `0` for the "START!" beat, `null` when not counting down. */
  countdown: number | null;
  /** Passed through to {@link BoardOverlay} for boards that go flush-edge. */
  rounded?: string;
};

/**
 * The "3 · 2 · 1 · START!" curtain drawn over a challenge session before the
 * first question. Hidden (renders nothing) unless a countdown is running.
 *
 * `BoardOverlay` already emits `z-50`, so the `z-50` several call sites used to
 * pass alongside the backdrop filter was a no-op and is not reproduced here.
 *
 * @design **No `backdrop-blur`.** Hiding the question is
 * {@link ChallengeSessionVeil}'s job and it already clears that bar on its own;
 * a backdrop filter here only composed a second blur over the first. Splitting
 * one requirement across two components is what let them drift apart in the
 * first place — three of the seven sessions had leaned on this filter as their
 * only countdown veil, so tuning the veil silently did nothing for them.
 */
export function ChallengeCountdownOverlay({ countdown, rounded }: Props) {
  return (
    <BoardOverlay isVisible={countdown !== null} rounded={rounded} data-testid="countdown-overlay">
      <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
        {countdown !== null && (countdown > 0 ? countdown : 'START!')}
      </span>
    </BoardOverlay>
  );
}
