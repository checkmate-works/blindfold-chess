import { useEffect, useState } from 'react';

type Options = {
  /** Initial countdown value (seconds). Pass `null` to skip countdown entirely. */
  initial: number | null;
  /** When true, the countdown tick is suspended. */
  paused?: boolean;
  /** How long the final "GO" frame (`0`) is held before completing. Defaults to 500ms. */
  finalHoldMs?: number;
};

/**
 * Simple pre-session countdown timer.
 *
 * Starts at `initial` and decrements once per second. When it reaches `0`
 * the hook holds that frame for `finalHoldMs` and then resolves to `null`,
 * signalling that the session proper should begin.
 */
export function useCountdown({ initial, paused = false, finalHoldMs = 500 }: Options) {
  const [countdown, setCountdown] = useState<number | null>(initial);

  useEffect(() => {
    if (countdown === null) return;
    if (paused) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, finalHoldMs);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, paused, finalHoldMs]);

  return countdown;
}
