'use client';

import type { ReactNode } from 'react';

import { ChallengeCountdownOverlay } from './ChallengeCountdownOverlay';
import { ChallengePauseOverlay } from './ChallengePauseOverlay';

type Props = {
  /** Seconds left, `0` for the "START!" beat, `null` when not counting down. */
  countdown: number | null;
  isPaused: boolean;
  /** Resume handler, forwarded to the pause curtain's button. */
  onTogglePause?: () => void;
  /**
   * Layout classes for the veiled region — padding, text alignment, vertical
   * rhythm. Every module tunes these against its own content, so the veil
   * ships none of its own beyond the positioning context.
   *
   * Include vertical padding: `overflow-hidden` clips the blur halo, so
   * content flush against the top or bottom edge gets its halo sliced off and
   * the rounded corners of the curtain bite into it.
   */
  className?: string;
  children: ReactNode;
};

/**
 * The positioning context plus curtain stack shared by every challenge-mode
 * session: the countdown curtain, the pause curtain, and the blur applied to
 * whatever sits underneath them.
 *
 * All seven sessions had hand-rolled this same three-part structure and the
 * copies had drifted badly — three different blur treatments (`blur-sm`,
 * `blur-md grayscale opacity-50 pointer-events-none`, none at all) under two
 * different conditions (`isPaused` alone vs `isPaused || countdown !== null`),
 * and two of them with no padding at all. Consolidating them here is what
 * makes the invariants below enforceable in one place.
 *
 * @design **The two curtains veil for different reasons, so they veil by
 * different amounts.** Pause must genuinely obscure the board — a paused timer
 * with a readable position is free study time — hence the heavy
 * `blur-md grayscale opacity-50`. The countdown is a 3.5s "get ready" beat
 * with nothing to protect, so it uses a light `blur-xs`; blurring it as hard
 * as pause erases the content's position entirely and makes the reveal read as
 * the layout jumping.
 *
 * @design **The veil never animates.** `BoardOverlay` mounts and unmounts in a
 * single frame, so a `transition` on the blur would keep resolving for 300ms
 * after the curtain had already vanished — measured as blur(8px) → none over
 * frames 3966–4280ms while the dark wash disappeared at 3966ms alone. That
 * trailing Gaussian is what reads as "the content settled into place"; it is
 * not a layout shift (the boxes are identical to the pixel across the
 * transition) but it is indistinguishable from one. Curtain and blur now
 * change in the same frame. Keep it that way: re-adding `transition-all`
 * reintroduces the exact symptom.
 *
 * @design **The quit control belongs OUTSIDE this veil.** `useQuitConfirm`
 * pauses the session and opens its modal, so quitting is reachable *from* the
 * paused state — a user who paused first and then decided to stop needs that
 * link legible and clickable. `pointer-events-none` on the pause veil would
 * strand them behind the curtain with only "resume" available. The score
 * counter has no such constraint and belongs inside, where it matches the
 * curtain's extent.
 */
export function ChallengeSessionVeil({
  countdown,
  isPaused,
  onTogglePause,
  className = '',
  children,
}: Props) {
  const veilClass = isPaused
    ? 'blur-md grayscale opacity-50 pointer-events-none'
    : countdown !== null
      ? 'blur-xs'
      : '';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <ChallengeCountdownOverlay countdown={countdown} />
      <ChallengePauseOverlay isPaused={isPaused} onTogglePause={onTogglePause} />

      <div className={veilClass}>{children}</div>
    </div>
  );
}
