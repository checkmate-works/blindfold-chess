import type { PieceColor } from "@blindfold-chess/types";

import type { Attempt } from "./puzzle-match";
import { pairByFullmove } from "./solution-pairs";

/**
 * The puzzle result's attempt history: the player's attempts grouped per
 * solution move and laid out as the solution's numbered White / Black rows.
 * Pure, so the web's and the mobile app's `AttemptHistoryPanel` render the
 * same rows from the same attempts.
 */

export type PlayerStep = {
  /** All wrong attempts the user submitted while at this step. */
  wrongMoves: string[];
  /**
   * The user's literal correct input that closed this step, or `null` when
   * the user abandoned the step (left for the result without ever solving
   * it). `null` is the signal the panel uses to switch from a green "solved"
   * chip to a muted "answer revealed" chip.
   */
  correctMove: string | null;
};

export type AttemptCell =
  | {
      kind: "solved";
      wrongMoves: string[];
      correctMove: string;
      note?: string | null;
    }
  | {
      kind: "revealed";
      wrongMoves: string[];
      expectedMove: string;
      note?: string | null;
    }
  | { kind: "skipped"; expectedMove: string; note?: string | null }
  | { kind: "opponent"; san: string; note?: string | null }
  | { kind: "empty" };

export type AttemptRow = {
  moveNumber: number;
  white: AttemptCell;
  black: AttemptCell;
};

export type AttemptStatus = {
  /**
   * `solved` — every player slot was answered correctly.
   * `partial` — at least one but not all player slots were solved before
   *             the user left for the result.
   * `revealed` — the user gave up before solving any player slot.
   */
  state: "solved" | "partial" | "revealed";
  correctCount: number;
  totalPlayerSteps: number;
};

/**
 * Groups player attempts by the puzzle step they targeted. Walking the
 * chronological attempt log, every wrong attempt accumulates under the
 * current step; the first correct attempt closes the step and advances
 * the cursor. Trailing wrongs at a still-open step (puzzle abandoned mid-way)
 * are surfaced as a step with `correctMove === null` so the panel can
 * still render them.
 */
export function groupAttemptsByPlayerStep(
  attempts: readonly Attempt[],
): PlayerStep[] {
  const groups: PlayerStep[] = [];
  let current: PlayerStep = { wrongMoves: [], correctMove: null };

  for (const a of attempts) {
    if (a.isCorrect) {
      current.correctMove = a.move;
      groups.push(current);
      current = { wrongMoves: [], correctMove: null };
    } else {
      current.wrongMoves.push(a.move);
    }
  }

  if (current.wrongMoves.length > 0) {
    groups.push(current);
  }

  return groups;
}

/**
 * Derive the high-level outcome the user reached by the time they landed
 * on the result page. Counts how many player slots were solved and
 * compares against the total number of player slots in the chosen
 * solution line. Used both by the panel's cell renderer (to pick `solved` /
 * `revealed` / `skipped` styling per cell) and by the status badge (to label
 * the section as a whole).
 */
export function computeAttemptStatus(
  attempts: readonly Attempt[],
  solutionSans: readonly string[],
): AttemptStatus {
  const groups = groupAttemptsByPlayerStep(attempts);
  const correctCount = groups.filter((g) => g.correctMove !== null).length;
  const totalPlayerSteps = Math.ceil(solutionSans.length / 2);

  let state: AttemptStatus["state"];
  if (totalPlayerSteps > 0 && correctCount === totalPlayerSteps) {
    state = "solved";
  } else if (correctCount === 0) {
    state = "revealed";
  } else {
    state = "partial";
  }

  return { state, correctCount, totalPlayerSteps };
}

/**
 * Build the per-solution-move cell sequence. The player moves first in a
 * puzzle, so the even indices are the player's and the odd ones the
 * opponent's replies. Player turns become one of three cell kinds depending
 * on the user's progress:
 *   - `solved`: there is a matching attempt group with a recorded correct
 *               move — render the user's literal input as the green chip.
 *   - `revealed`: the user attempted this step and gave up mid-step — render
 *                 their wrong inputs followed by the canonical SAN as the
 *                 muted answer-reveal chip.
 *   - `skipped`: the user never reached this step — render only the
 *                muted answer-reveal chip.
 * Opponent turns are auto-played and rendered as plain SAN.
 *
 * `notes` is a parallel array to `solutionSans` (per-move commentary from
 * the puzzle's solution data). Optional and defaults to empty so callers
 * that only care about attempt grading are unaffected.
 */
export function buildCells(
  solutionSans: readonly string[],
  groups: readonly PlayerStep[],
  notes: readonly (string | null)[] = [],
): AttemptCell[] {
  return solutionSans.map((san, i): AttemptCell => {
    const note = notes[i] ?? undefined;
    if (i % 2 === 1) return { kind: "opponent", san, note };
    const group = groups[i / 2];
    if (!group) return { kind: "skipped", expectedMove: san, note };
    if (group.correctMove !== null) {
      return {
        kind: "solved",
        wrongMoves: group.wrongMoves,
        correctMove: group.correctMove,
        note,
      };
    }
    return {
      kind: "revealed",
      wrongMoves: group.wrongMoves,
      expectedMove: san,
      note,
    };
  });
}

/**
 * Pair the linear cell sequence into white/black rows with chess fullmove
 * numbering. When the puzzle starts from a black-to-move FEN, the first row
 * has an empty white cell and the move number stays at the FEN's starting
 * fullmove (it has not yet ticked over to the next number).
 */
export function buildRows(
  cells: readonly AttemptCell[],
  firstTurn: PieceColor,
  startFullmove: number,
): AttemptRow[] {
  return pairByFullmove(cells, firstTurn, startFullmove).map(
    ({ moveNumber, white, black }) => ({
      moveNumber,
      white: white ?? { kind: "empty" },
      black: black ?? { kind: "empty" },
    }),
  );
}
