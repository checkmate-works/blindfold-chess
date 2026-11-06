"use client";

import { useEffect, useState } from "react";

import {
  COUNTDOWN_INITIAL_VALUE,
  getNextCountdownValue,
} from "../common/countdown";

/**
 * The pre-session "3, 2, 1, START!" countdown. It starts on mount and cannot
 * be restarted; `countdown` follows the states of `getNextCountdownValue`
 * (`0` while "START!" shows) and is `null` once it has finished.
 */
export function useCountdown() {
  const [countdown, setCountdown] = useState<number | null>(
    COUNTDOWN_INITIAL_VALUE,
  );

  useEffect(() => {
    const transition = getNextCountdownValue(countdown);
    if (!transition) return;

    const timer = setTimeout(() => {
      setCountdown(transition.nextValue);
    }, transition.delayMs);

    return () => clearTimeout(timer);
  }, [countdown]);

  return {
    countdown,
    isCountingDown: countdown !== null,
  };
}
