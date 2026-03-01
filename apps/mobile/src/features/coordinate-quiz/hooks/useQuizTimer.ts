import { useState, useEffect, useCallback, useRef } from "react";

type UseQuizTimerProps = {
  duration: number; // in seconds
  onTimeUp: () => void;
  autoStart?: boolean;
};

export function useQuizTimer({
  duration,
  onTimeUp,
  autoStart = false,
}: UseQuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Keep onTimeUp ref up to date
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setIsRunning(false);
            // Defer onTimeUp to avoid calling setState (e.g., router.replace)
            // during React's rendering phase
            setTimeout(() => onTimeUpRef.current(), 0);
            return 0;
          }
          return newTime;
        });
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeRemaining]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setTimeRemaining(duration);
    setElapsedTime(0);
    setIsRunning(false);
  }, [duration]);

  // Progress from 0 to 1
  const progress = 1 - timeRemaining / duration;

  return {
    timeRemaining,
    elapsedTime,
    isRunning,
    progress,
    start,
    pause,
    reset,
  };
}
