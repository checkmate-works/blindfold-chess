import type { EarnedRankSlug } from "@blindfold-chess/features/dojo-ranks";

/**
 * A dojo exam: a fixed set of position-memory problems the app grades on
 * the device. Passing it stands in for a rank's web-only requirement.
 */
export type DojoExam = {
  readonly rank: EarnedRankSlug;
  /** The positions, shown in this order. */
  readonly fens: readonly string[];
  /** How long each position is shown before it is recreated. */
  readonly memorizeSeconds: number;
  /** The average piece accuracy (percent) a pass needs. */
  readonly minAccuracy: number;
};

/**
 * 2kyu certifies seeing several pieces as one meaningful chunk. On the web
 * it asks for posting a position-memory problem or a puzzle; the app, which
 * leaves posting out, asks for solving these instead. Each position is
 * built from patterns a player learns to read at a glance — castled kings,
 * a fianchetto, a pawn chain, a developed opening — so recreating it in
 * time takes chunking rather than piece-by-piece recall.
 */
const RANK_2KYU_EXAM: DojoExam = {
  rank: "2kyu",
  fens: [
    // Both sides castled short, rooks still on their home squares.
    "r4rk1/5ppp/8/8/8/8/5PPP/R4RK1 w - - 0 1",
    // A fianchettoed bishop on each side.
    "6k1/5pbp/6p1/8/8/6P1/5PBP/6K1 w - - 0 1",
    // Opposite-side castling.
    "2kr4/ppp5/8/8/8/8/5PPP/5RK1 w - - 0 1",
    // Interlocked pawn chains.
    "4k3/8/8/2p1p3/1pPpP3/1P1P4/8/4K3 w - - 0 1",
    // The Italian Game with both sides' knights out.
    "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1",
  ],
  memorizeSeconds: 30,
  minAccuracy: 80,
};

export const DOJO_EXAMS: Readonly<Partial<Record<EarnedRankSlug, DojoExam>>> = {
  "2kyu": RANK_2KYU_EXAM,
};

export function examFor(rank: string): DojoExam | undefined {
  return (DOJO_EXAMS as Record<string, DojoExam | undefined>)[rank];
}

/**
 * Whether a finished run passes: every problem submitted (none skipped)
 * and the average accuracy at or above the exam's bar.
 */
export function isExamPassed(
  exam: DojoExam,
  result: { readonly accuracy: number; readonly solved: number },
): boolean {
  return (
    result.solved >= exam.fens.length && result.accuracy >= exam.minAccuracy
  );
}
