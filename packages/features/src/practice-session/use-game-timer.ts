"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseGameTimerProps = {
  /** Limit in seconds. */
  timeLimit: number;
  /** Time accumulates only while true; toggling it pauses/resumes without loss. */
  isActive: boolean;
  /**
   * Fired once, from the polling interval, when accumulated active time
   * reaches the limit — so up to `intervalMs` late.
   */
  onTimeLimitReached?: () => void;
  /** Polling period in ms. Default 100. */
  intervalMs?: number;
};

/**
 * A pausable stopwatch. `timeElapsed` is whole seconds (floored) and updates
 * on each poll while active. `totalTime` is the precise active time in
 * seconds, but it is read from a ref at render time and is only current up to
 * the last pause (or the limit being reached), not while running.
 *
 * `setElapsedMs` overwrites the accumulated time, for a caller whose clock is
 * owned elsewhere (a server-run challenge re-syncs to the server's count).
 * Durations use the monotonic clock: correcting the device's calendar clock
 * must not end a run early or give it extra time.
 */
export function useGameTimer({
  timeLimit,
  isActive,
  onTimeLimitReached,
  intervalMs = 100,
}: UseGameTimerProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    timerRef.current = setInterval(() => {
      const now = performance.now();
      const elapsedSinceStart = now - (startTimeRef.current ?? now);
      const totalElapsedMs = accumulatedTimeRef.current + elapsedSinceStart;

      const currentElapsedSeconds = Math.floor(totalElapsedMs / 1000);
      setTimeElapsed(currentElapsedSeconds);

      if (totalElapsedMs >= timeLimit * 1000) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        accumulatedTimeRef.current = totalElapsedMs;
        startTimeRef.current = null;

        if (onTimeLimitReached) {
          onTimeLimitReached();
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (startTimeRef.current !== null) {
        const now = performance.now();
        accumulatedTimeRef.current += now - startTimeRef.current;
        startTimeRef.current = null;
      }
    };
  }, [isActive, timeLimit, intervalMs, onTimeLimitReached]);

  /**
   * Replace the accumulated active time with `ms`. A running stopwatch keeps
   * running from the new value. The limit is checked on the next poll, so a
   * value at or past the limit ends the run only once the stopwatch is active.
   */
  const setElapsedMs = useCallback((ms: number) => {
    accumulatedTimeRef.current = ms;
    if (startTimeRef.current !== null) startTimeRef.current = performance.now();
    setTimeElapsed(Math.floor(ms / 1000));
  }, []);

  const reset = () => {
    setTimeElapsed(0);
    startTimeRef.current = null;
    accumulatedTimeRef.current = 0;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  return {
    timeElapsed,
    totalTime: accumulatedTimeRef.current / 1000,
    reset,
    setElapsedMs,
  };
}
