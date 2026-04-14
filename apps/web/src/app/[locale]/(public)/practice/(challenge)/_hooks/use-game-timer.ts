'use client';

import { useEffect, useRef, useState } from 'react';

type UseGameTimerProps = {
  timeLimit: number;
  isActive: boolean;
  onTimeLimitReached?: () => void;
  intervalMs?: number;
};

export function useGameTimer({
  timeLimit,
  isActive,
  onTimeLimitReached,
  intervalMs = 100,
}: UseGameTimerProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Refs for precise time tracking
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Check time limit
  useEffect(() => {
    // Only set up the interval if active
    if (!isActive) {
      return;
    }

    // Set start time if not already running (resume or start)
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSinceStart = now - (startTimeRef.current ?? now);
      const totalElapsedMs = accumulatedTimeRef.current + elapsedSinceStart;

      // Update UI state (seconds)
      const currentElapsedSeconds = Math.floor(totalElapsedMs / 1000);
      setTimeElapsed(currentElapsedSeconds);

      // Check time limit
      if (totalElapsedMs >= timeLimit * 1000) {
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // Accumulate final time
        accumulatedTimeRef.current = totalElapsedMs;
        startTimeRef.current = null;

        // Notify parent
        if (onTimeLimitReached) {
          onTimeLimitReached();
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // When becoming inactive (pause/unmount), accumulate the elapsed time
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
    // Return precise total seconds (float) for stats
    totalTime: accumulatedTimeRef.current / 1000,
    reset,
  };
}
