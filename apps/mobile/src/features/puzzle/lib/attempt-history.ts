import type { Attempt } from "@blindfold-chess/features/puzzle";

/**
 * The web's attempt history (`AttemptHistoryPanel`'s pure half): the
 * player's attempts grouped per solution move, laid out as the solution's
 * numbered White / Black rows. Kept in step with the web by hand; both
 * would move to `@blindfold-chess/features/puzzle` together.
 */

/** One of the player's moves in the solution: the wrong tries, then the right one. */
export type PlayerStep = { wrongMoves: string[]; correctMove: string | null };

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
  state: "solved" | "partial" | "revealed";
  correctCount: number;
  totalPlayerSteps: number;
};

/**
 * Attempts arrive in order with no step marker, but a step only advances on
 * a correct move, so every correct attempt closes one step. Trailing wrong
 * tries (the player gave up mid-step) form a step with no correct move.
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
  if (current.wrongMoves.length > 0) groups.push(current);
  return groups;
}

/** Solved when every player step was found, revealed when none was. */
export function computeAttemptStatus(
  attempts: readonly Attempt[],
  solutionSans: readonly string[],
): AttemptStatus {
  const correctCount = groupAttemptsByPlayerStep(attempts).filter(
    (g) => g.correctMove !== null,
  ).length;
  const totalPlayerSteps = Math.ceil(solutionSans.length / 2);
  const state =
    totalPlayerSteps > 0 && correctCount === totalPlayerSteps
      ? "solved"
      : correctCount === 0
        ? "revealed"
        : "partial";
  return { state, correctCount, totalPlayerSteps };
}

/**
 * One cell per solution move. The player moves first in a puzzle, so the
 * even indices are the player's and the odd ones the opponent's replies.
 */
export function buildCells(
  solutionSans: readonly string[],
  groups: readonly PlayerStep[],
  notes: readonly (string | null)[] = [],
): AttemptCell[] {
  return solutionSans.map((san, i) => {
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

/** Pairs the cells into numbered rows; Black to move leaves the first White cell empty. */
export function buildRows(
  cells: readonly AttemptCell[],
  blackFirst: boolean,
  startFullmove: number,
): AttemptRow[] {
  const rows: AttemptRow[] = [];
  let i = 0;
  let moveNumber = startFullmove;
  if (blackFirst && cells.length > 0) {
    rows.push({ moveNumber, white: { kind: "empty" }, black: cells[0] });
    i = 1;
    moveNumber += 1;
  }
  for (; i < cells.length; i += 2) {
    rows.push({
      moveNumber,
      white: cells[i],
      black: cells[i + 1] ?? { kind: "empty" },
    });
    moveNumber += 1;
  }
  return rows;
}
