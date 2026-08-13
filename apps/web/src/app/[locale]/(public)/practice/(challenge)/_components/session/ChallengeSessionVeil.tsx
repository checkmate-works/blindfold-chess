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
 * @design **Both curtains veil to the same strength, because both are hiding
 * something.** Pause is the obvious one: a stopped timer over a readable board
 * is free study time. The countdown is the easy one to get wrong — it looks
 * like a decorative "get ready" beat, but the first question is already
 * mounted behind it, so a legible question during "3 · 2 · 1" is a three-second
 * head start on a timed run that lands on a leaderboard. The bar for both is
 * therefore the same: the question must not be recoverable through the veil.
 * `blur-md grayscale opacity-50` clears it — the 60px question glyph reduces
 * to a smudge with no character shapes left at 3× magnification, verified
 * against this exact combination. Weakening any one of the three (notably to a
 * bare `blur-xs`, which was tried) puts the question back on screen.
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
  const veilClass =
    isPaused || countdown !== null ? 'blur-md grayscale opacity-50 pointer-events-none' : '';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <ChallengeCountdownOverlay countdown={countdown} />
      <ChallengePauseOverlay isPaused={isPaused} onTogglePause={onTogglePause} />

      <div className={veilClass}>{children}</div>
    </div>
  );
}
