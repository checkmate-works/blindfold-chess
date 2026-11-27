/**
 * The dojo's exam problems, how an answer to one is graded, and who may have a
 * pass recorded.
 *
 * @description
 * The problems are constants here rather than rows in the database's
 * `positions` table. A row there would bring the features built for user
 * posts along with it — an author, likes, comments — and editing or deleting
 * it would silently change what a rank asks for. As constants, the web, the
 * app and the server all read the same problem, and changing one is a
 * reviewed code change.
 *
 * 2kyu's exam: recreate two castled kings from memory (30 seconds to look,
 * every piece in place to pass), and solve a two-move mate (a queen
 * sacrifice into a smothered mate).
 */
import { validateFenFormat } from "../chess-core/fen-pure";
import { calculateAccuracy } from "../common/accuracy";
import {
  EARNED_RANK_SLUGS,
  EXAM_PROBLEM_KINDS,
  type EarnedRankSlug,
  type ExamProblemKind,
  type RankSlug,
  isExamProblemKind,
  rankStanding,
} from "../dojo-ranks/ranks";
import { MAX_SOLUTION_MOVES } from "../puzzle/limits";
import {
  type SessionState,
  evaluatePuzzleSubmit,
  parseSolutionLines,
} from "../puzzle/puzzle-match";
import type { PuzzleSolutionMove } from "../puzzle/types";

/** A piece pattern that helps with an exam problem, named by its message key. */
export type ExamPatternKey =
  "kingside_castle" | "kingside_fianchetto" | "smothered_mate";

/**
 * A pattern the exam page lists as useful for solving, the way a saved
 * position-memory problem or puzzle lists the chunks tagged on it. Kept here rather
 * than as a reference to a row in `chunks`: chunks are posted, edited and
 * deleted by users, and an exam's hints should change only through a
 * reviewed code change, like the problem itself.
 */
export type ExamPattern = {
  key: ExamPatternKey;
  /** The pattern on its own, drawn as the card's thumbnail. */
  fen: string;
};

/** Recreate `fen` after looking at it for `memorizeSeconds`. */
export type MemoryExamProblem = {
  kind: "position_memory";
  fen: string;
  memorizeSeconds: number;
  /** The accuracy (percent, as {@link calculateAccuracy} computes it) a pass needs. */
  minAccuracy: number;
  patterns: readonly ExamPattern[];
};

/**
 * Solve the puzzle at `fen`. `solutions` are full lines starting with the
 * player's move, in the same shape stored puzzles use, so the puzzle session
 * and its matcher run them unchanged.
 */
export type PuzzleExamProblem = {
  kind: "puzzle";
  fen: string;
  solutions: PuzzleSolutionMove[][];
  patterns: readonly ExamPattern[];
};

export type ExamProblem = MemoryExamProblem | PuzzleExamProblem;

function solutionLine(...sans: string[]): PuzzleSolutionMove[] {
  return sans.map((san) => ({ san, note: null }));
}

/** Each rank's exam, by problem kind. Only ranks with an exam appear. */
export const DOJO_EXAMS: Readonly<
  Partial<
    Record<EarnedRankSlug, Readonly<Record<ExamProblemKind, ExamProblem>>>
  >
> = {
  "2kyu": {
    position_memory: {
      kind: "position_memory",
      // Two castled kings, each with one piece more than the 2kyu guide's
      // example (a fianchettoed bishop for white, a knight on f6 for black).
      // The guide's own position stays a practice problem; the exam asks
      // for the same chunking on twelve pieces the player has not seen, and
      // with only two chunks to hold, a pass means every piece in place.
      fen: "5rk1/5ppp/5n2/8/8/6P1/5PBP/5RK1 w - - 0 1",
      memorizeSeconds: 30,
      minAccuracy: 100,
      patterns: [
        { key: "kingside_castle", fen: "5rk1/5ppp/8/8/8/8/8/8 w - - 0 1" },
        { key: "kingside_fianchetto", fen: "8/8/8/8/8/6P1/5PBP/8 w - - 0 1" },
      ],
    },
    puzzle: {
      kind: "puzzle",
      // White mates in two: the queen sacrifice on g8 forces the rook to
      // take, and the knight then mates the king boxed in by its own pieces.
      fen: "5r1k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1",
      solutions: [solutionLine("Qg8+", "Rxg8", "Nf7#")],
      // The mate the solution ends in, rather than the start position.
      patterns: [
        { key: "smothered_mate", fen: "6rk/5Npp/8/8/8/8/8/8 w - - 0 1" },
      ],
    },
  },
};

/** The ranks that have an exam, lowest first. */
export const EXAM_RANKS: readonly EarnedRankSlug[] = EARNED_RANK_SLUGS.filter(
  (slug) => DOJO_EXAMS[slug] !== undefined,
);

/**
 * `value` as a rank that has an exam, or undefined. Safe on untrusted input
 * (a URL segment, a route param, a request body): only known ranks match.
 */
export function examRankOf(value: unknown): EarnedRankSlug | undefined {
  return EXAM_RANKS.find((rank) => rank === value);
}

/**
 * The problem kinds of `rank`'s exam, in {@link EXAM_PROBLEM_KINDS} order —
 * the order every list of an exam's problems shows them in.
 */
export function examProblemKinds(rank: EarnedRankSlug): ExamProblemKind[] {
  const exam = DOJO_EXAMS[rank];
  return exam
    ? EXAM_PROBLEM_KINDS.filter((kind) => exam[kind] !== undefined)
    : [];
}

/**
 * The `kind` problem of the exam `exam` names, narrowed to that kind's shape,
 * or undefined when `exam` is not a rank with an exam. `exam` may be untrusted.
 */
export function examProblemOf<K extends ExamProblemKind>(
  exam: unknown,
  kind: K,
): Extract<ExamProblem, { kind: K }> | undefined {
  const rank = examRankOf(exam);
  const problem = rank ? DOJO_EXAMS[rank]?.[kind] : undefined;
  return problem?.kind === kind
    ? (problem as Extract<ExamProblem, { kind: K }>)
    : undefined;
}

/**
 * The problem named by an untrusted `(exam, problem)` pair, or undefined when
 * the rank has no exam or the kind is unknown. Safe to call with request
 * input: only known slugs and kinds are looked up.
 */
export function examProblemFor(
  exam: string,
  problem: string,
): ExamProblem | undefined {
  return isExamProblemKind(problem) ? examProblemOf(exam, problem) : undefined;
}

/** A recreated position (memory) or the player's moves in SAN (puzzle). */
export type ExamAnswer = { fen: string } | { moves: string[] };

/** `accuracy` is set for memory problems only; puzzles have none. */
export type ExamGrade = { passed: boolean; accuracy: number | null };

function failed(): ExamGrade {
  return { passed: false, accuracy: null };
}

/**
 * Longer than any FEN of a real position; an answer past it is not one and is
 * failed before it is parsed.
 */
const MAX_ANSWER_FEN_LENGTH = 100;

// `calculateAccuracy` also builds per-square descriptions for the result
// screen. Grading only needs the number, so the names and texts are blanks.
const NO_PIECE_NAMES: Record<string, string> = {};
const NO_DESCRIPTIONS = {
  correct: () => "",
  wrongPiece: () => "",
  missing: () => "",
  extra: () => "",
};

function gradeMemory(problem: MemoryExamProblem, answer: unknown): ExamGrade {
  if (typeof answer !== "object" || answer === null) return failed();
  const fen: unknown = (answer as { fen?: unknown }).fen;
  if (
    typeof fen !== "string" ||
    fen.length > MAX_ANSWER_FEN_LENGTH ||
    !validateFenFormat(fen)
  ) {
    return failed();
  }
  // The same function the position-memory sessions call on the web and in
  // the app, so a recreation scores the same here as on the result screen.
  const { accuracy } = calculateAccuracy(
    problem.fen,
    fen,
    NO_PIECE_NAMES,
    NO_DESCRIPTIONS,
  );
  return { passed: accuracy >= problem.minAccuracy, accuracy };
}

function gradePuzzle(problem: PuzzleExamProblem, answer: unknown): ExamGrade {
  if (typeof answer !== "object" || answer === null) return failed();
  const moves: unknown = (answer as { moves?: unknown }).moves;
  if (
    !Array.isArray(moves) ||
    moves.length === 0 ||
    moves.length > MAX_SOLUTION_MOVES ||
    !moves.every((move): move is string => typeof move === "string")
  ) {
    return failed();
  }

  const parsed = parseSolutionLines(problem.solutions);
  let session: SessionState = {
    currentFen: problem.fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
    lastOpponentMove: null,
  };
  // Every move has to match a solution line, the opponent's replies are
  // played as the puzzle session plays them, and the last move has to be the
  // one that completes the line: a wrong move, a missing move or a move after
  // the line is complete all fail.
  for (const [index, move] of moves.entries()) {
    const outcome = evaluatePuzzleSubmit(
      session,
      move,
      parsed,
      problem.solutions,
    );
    if (outcome.kind !== "accepted") return failed();
    const isLast = index === moves.length - 1;
    if ((outcome.solve !== null) !== isLast) return failed();
    session = outcome.nextSession;
  }
  return { passed: true, accuracy: null };
}

/**
 * Grades an answer to an exam problem. The server calls this for both the
 * web's Server Action and the mobile API, so the pass mark lives in one
 * place; clients send the raw answer (the recreated FEN, or the player's own
 * moves in SAN) and never a verdict.
 *
 * A memory answer passes when its accuracy reaches `minAccuracy`; the
 * accuracy is returned unrounded, exactly as the sessions compute it. A
 * puzzle answer passes when the player's moves, played in turn with the
 * opponent's replies, complete a solution line exactly.
 *
 * Never throws: an answer of the wrong shape, an unparseable FEN or an
 * illegal move is a fail.
 */
export function gradeExamProblem(
  problem: ExamProblem,
  answer: unknown,
): ExamGrade {
  try {
    return problem.kind === "position_memory"
      ? gradeMemory(problem, answer)
      : gradePuzzle(problem, answer);
  } catch {
    return failed();
  }
}

/**
 * Whether a pass at `exam` may be recorded for a user whose highest rank is
 * `highest`: the exam has to be the rank right above it, or one already held.
 * Everyone else — including a signed-out player — may still take the exam,
 * but it is graded as practice and nothing is written.
 *
 * The app reads the highest rank as covering every rank below it, so letting
 * someone skip ahead (pass 2kyu while holding only 5kyu) would show 4kyu and
 * 3kyu as done too. Requiring the ranks in order keeps that reading true.
 */
export function isExamEligible(
  exam: EarnedRankSlug,
  highest: RankSlug | undefined,
): boolean {
  return rankStanding(exam, highest) !== "locked";
}
