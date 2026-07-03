import { parseUciScore } from "../uci-protocol";

/**
 * Accumulates the engine's streamed `info` lines into the latest evaluation.
 *
 * The interpretation rules live here, apart from the Promise / timeout /
 * subscription plumbing in `getEvaluation`, so they are testable with plain
 * strings:
 * - a `cp` score replaces any earlier value and clears a stale mate,
 * - a `mate` score is kept alongside a saturated ±10000 cp stand-in so
 *   downstream consumers that only read `score` still order mates above
 *   any centipawn evaluation.
 */
export type EvaluationAccumulator = {
  /** Feed one raw engine `info` line. Non-score lines are ignored. */
  onInfo: (message: string) => void;
  /** Latest centipawn score (side-to-move perspective), or null if none seen. */
  readonly score: number | null;
  /** Latest mate-in-N, or undefined when the last score was a plain cp. */
  readonly mate: number | undefined;
};

export function createEvaluationAccumulator(): EvaluationAccumulator {
  let latestScore: number | null = null;
  let latestMate: number | undefined;

  return {
    onInfo(message: string) {
      const score = parseUciScore(message);
      if (!score) return;

      if (score.kind === "cp") {
        latestScore = score.value;
        latestMate = undefined;
      } else {
        latestMate = score.value;
        latestScore = score.value > 0 ? 10000 : -10000;
      }
    },
    get score() {
      return latestScore;
    },
    get mate() {
      return latestMate;
    },
  };
}
