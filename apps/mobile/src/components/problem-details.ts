/**
 * How one problem of a challenge ended, as the result's "Problem Details"
 * row reports it. `timeUp` is the problem the clock cut off: the player
 * never answered it, so it is neither right nor wrong.
 */
export type ProblemVerdict = "correct" | "incorrect" | "skipped" | "timeUp";

/**
 * Folds a module's result flags into one verdict.
 *
 * The clock is checked first: a module may also mark the cut-off problem as
 * not correct (the diagonal quiz does) or as skipped, and reporting either
 * would read as one more wrong or skipped answer than the score counts.
 * A correct answer wins over `skipped`, so a module that sets both cannot
 * hide a solved problem.
 */
export function problemVerdict({
  correct,
  skipped = false,
  timedOut = false,
}: {
  correct: boolean;
  skipped?: boolean;
  timedOut?: boolean;
}): ProblemVerdict {
  if (timedOut) return "timeUp";
  if (correct) return "correct";
  if (skipped) return "skipped";
  return "incorrect";
}

/**
 * The rows that start open: every problem the player did not get right,
 * the skipped and timed-out ones included. The result screen is read for
 * what went wrong, and a column of closed rows gives no hint of which to
 * open; the web gets the same rows open from the score's "Incorrect" link,
 * which the app has no counterpart for.
 */
export function initiallyOpenRows(
  verdicts: readonly ProblemVerdict[],
): Set<number> {
  return new Set(
    verdicts.flatMap((verdict, index) =>
      verdict === "correct" ? [] : [index],
    ),
  );
}

/** The theme colour a verdict is painted in. */
export type VerdictTone = "success" | "destructive" | "muted";

/**
 * What a verdict shows at the row's trailing edge.
 *
 * `label` is either the text itself (the web's untranslated "OK" / "NG") or
 * an i18n key. Skipped and time-up are muted, not red: neither is an answer,
 * and a red mark would read as a wrong one. Time-up alone carries a clock,
 * so it is told apart from a skip at a glance.
 */
export type VerdictPresentation = {
  label: { text: string } | { key: string };
  tone: VerdictTone;
  clock: boolean;
};

export function verdictPresentation(
  verdict: ProblemVerdict,
): VerdictPresentation {
  switch (verdict) {
    case "correct":
      return { label: { text: "OK" }, tone: "success", clock: false };
    case "incorrect":
      return { label: { text: "NG" }, tone: "destructive", clock: false };
    case "skipped":
      return {
        label: { key: "practiceResult.skipped" },
        tone: "muted",
        clock: false,
      };
    case "timeUp":
      return {
        label: { key: "practiceResult.timeUp" },
        tone: "muted",
        clock: true,
      };
  }
}
