'use client';

import { useEffect, useRef } from 'react';

type Props = {
  /**
   * Monotonically increasing counter — bumped once each time the AI
   * completes a move (see `useGameSession`). A *change* in this value is
   * the trigger to fire one pulse; the absolute number is irrelevant.
   */
  signal: number;
};

/**
 * A single, soft full-screen pulse fired the moment the AI's move lands.
 *
 * @why
 * Maia returns non-first moves with no perceptible delay, and this is a
 * blindfold app — there is no board animation, and because it is used on
 * mobile in public spaces, no sound either. Without a cue the opponent's
 * move is easy to miss: the only change is the status-line text swapping.
 * A brief whole-screen tint is caught by *peripheral* vision, so the user
 * notices even when not staring at the status line.
 *
 * Deliberately gentle: one ~380 ms fade peaking at ~14 % opacity — not a
 * strobe. Repeated 40+ times per game it must not fatigue the eye, and a
 * hard flash would risk the WCAG 2.3.1 photosensitivity threshold. Honors
 * `prefers-reduced-motion` by skipping the animation entirely.
 */
export function AiMovePulse({ signal }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // Seed with the initial `signal` so the mount pass — and React
  // StrictMode's re-invoked mount effect — is a no-op. Only a genuine
  // change pulses.
  const lastPulsed = useRef(signal);

  useEffect(() => {
    if (signal === lastPulsed.current) return;
    lastPulsed.current = signal;

    const el = overlayRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = el.animate(
      [{ opacity: 0 }, { opacity: 0.14, offset: 0.35 }, { opacity: 0 }],
      { duration: 380, easing: 'ease-out' }
    );
    // A faster follow-up move cancels the in-flight pulse and restarts it.
    return () => animation.cancel();
  }, [signal]);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 bg-primary opacity-0"
    />
  );
}
