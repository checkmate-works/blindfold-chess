import { useEffect } from 'react';

type Options = {
  /** Whether the session machine is currently in the `memorize` phase. */
  active: boolean;
  /** Remaining seconds in the memorize phase. */
  timeLeft: number;
  /** When true, the tick is suspended (countdown or pause). */
  paused?: boolean;
  /** Called once per second while the memorize phase is active. */
  onTick: () => void;
};

/**
 * Ticks the XState memorize timer once per second while the session is in
 * the `memorize` phase and not paused.
 */
export function useMemorizeTimer({ active, timeLeft, paused = false, onTick }: Options) {
  useEffect(() => {
    if (!active) return;
    if (paused) return;
    if (timeLeft < 0) return;

    const timer = setTimeout(() => {
      onTick();
    }, 1000);
    return () => clearTimeout(timer);
  }, [active, timeLeft, paused, onTick]);
}
