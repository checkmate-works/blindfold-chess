"use client";

import { useEffect, useState } from "react";

import {
  COUNTDOWN_INITIAL_VALUE,
  getNextCountdownValue,
} from "../common/countdown";

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
