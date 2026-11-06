"use client";

import { useEffect, useRef, useState } from "react";

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
      startTimeRef.current = Date.now();
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
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
        const now = Date.now();
        accumulatedTimeRef.current += now - startTimeRef.current;
        startTimeRef.current = null;
      }
    };
  }, [isActive, timeLimit, intervalMs, onTimeLimitReached]);

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
  };
}
