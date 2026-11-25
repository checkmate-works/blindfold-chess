import { useEffect, useState } from "react";

/** How long the prompt stands alone, then how long the answer stays shown. */
const PROMPT_MS = 1800;
const ANSWER_MS = 900;

/**
 * Drives a setup screen's how-to-play demo: false while the demo shows the
 * question alone, true while it shows the answer being given, on a loop. The
 * web's demos are still pictures; on a phone the demo plays the tap the
 * description asks for, so the player sees the move instead of reading it.
 * Every module's demo uses the same beat, so they feel like one app.
 */
export function useDemoAnswerLoop(): boolean {
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setAnswered((shown) => !shown),
      answered ? ANSWER_MS : PROMPT_MS,
    );
    return () => clearTimeout(timer);
  }, [answered]);

  return answered;
}
