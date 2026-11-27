import { computeMoveNumber } from "@blindfold-chess/features/chess-core/move-numbering";
import type { MoveLogEntry } from "@blindfold-chess/features/recall";
import type { Side } from "@blindfold-chess/types";

/** The result of the latest action, shown above the board. */
export type RecallFeedback = {
  type: "correct" | "incorrect" | "skipped";
  moveNumber: number;
  isWhiteMove: boolean;
  /** The move entered (correct / incorrect) or the answer (skipped). */
  move: string;
};

export type RecallState = {
  /** The game's moves in SAN, in order. */
  moves: readonly string[];
  /** The side the first move belongs to (black for a FEN with black to move). */
  firstMover: Side;
  /** The fullmove number of the first move. */
  startMoveNumber: number;
  /** The side whose moves are the player's when `autoOpponent` is on. */
  playerColor: Side;
  autoOpponent: boolean;
  /** Plies done so far; the next move to recall is `moves[index]`. */
  index: number;
  log: MoveLogEntry[];
  /** "I don't know" presses; "Auto-fill All" is offered from the second. */
  dontKnowCount: number;
  lastFeedback: RecallFeedback | null;
};

export function sideOfPly(state: RecallState, ply: number): Side {
  const firstIsWhite = state.firstMover === "white";
  return (ply % 2 === 0) === firstIsWhite ? "white" : "black";
}

export function moveNumberOf(
  state: RecallState,
  ply: number,
): { moveNumber: number; isWhiteMove: boolean } {
  return computeMoveNumber(
    ply,
    state.firstMover === "black",
    state.startMoveNumber,
  );
}

export function isRecallComplete(state: RecallState): boolean {
  return state.index >= state.moves.length;
}

/** Whether the move to enter now is the player's (always, with auto-opponent off). */
export function isPlayerTurn(state: RecallState): boolean {
  return (
    !state.autoOpponent || sideOfPly(state, state.index) === state.playerColor
  );
}

function resolve(
  state: RecallState,
  status: "correct" | "auto" | "skipped",
): RecallState {
  const move = state.moves[state.index];
  return {
    ...state,
    index: state.index + 1,
    log: [...state.log, { ...moveNumberOf(state, state.index), move, status }],
  };
}

/** Plays the opponent's moves while auto-opponent is on and it is their turn. */
function advanceOpponent(state: RecallState): RecallState {
  let next = state;
  while (!isRecallComplete(next) && !isPlayerTurn(next)) {
    next = resolve(next, "auto");
  }
  return next;
}

export function createRecallState(options: {
  moves: readonly string[];
  firstMover: Side;
  startMoveNumber: number;
  playerColor: Side;
  autoOpponent: boolean;
}): RecallState {
  return advanceOpponent({
    ...options,
    index: 0,
    log: [],
    dontKnowCount: 0,
    lastFeedback: null,
  });
}

/**
 * Turns "Auto-fill opponent's moves" on or off mid-recall. Turned on at the
 * opponent's turn, their move is played at once, as on the web.
 */
export function setAutoOpponent(
  state: RecallState,
  autoOpponent: boolean,
): RecallState {
  return advanceOpponent({ ...state, autoOpponent });
}

/** Strips check and mate marks so `Qh5` matches `Qh5+`. */
function normalizeSan(san: string): string {
  return san.replace(/[+#!?]+$/u, "");
}

/**
 * Scores one entered move. A correct move advances (and lets the auto
 * opponent reply); a wrong one stays on the same move and is logged.
 */
export function submitRecallMove(state: RecallState, san: string): RecallState {
  if (isRecallComplete(state)) return state;
  const expected = state.moves[state.index];
  const numbering = moveNumberOf(state, state.index);
  if (normalizeSan(san) !== normalizeSan(expected)) {
    return {
      ...state,
      lastFeedback: { type: "incorrect", ...numbering, move: san },
      log: [
        ...state.log,
        {
          ...numbering,
          move: expected,
          status: "incorrect",
          incorrectMove: san,
        },
      ],
    };
  }
  return advanceOpponent({
    ...resolve(state, "correct"),
    lastFeedback: { type: "correct", ...numbering, move: expected },
  });
}

/** "I don't know": shows the move as given up and moves on. */
export function revealRecallMove(state: RecallState): RecallState {
  if (isRecallComplete(state)) return state;
  const numbering = moveNumberOf(state, state.index);
  return advanceOpponent({
    ...resolve(state, "skipped"),
    dontKnowCount: state.dontKnowCount + 1,
    lastFeedback: {
      type: "skipped",
      ...numbering,
      move: state.moves[state.index],
    },
  });
}

/**
 * "Auto-fill All": resolves every remaining move at once. With auto-opponent
 * on, the opponent's share is logged `auto`, as it would have been move by
 * move, so it is not counted as the player's misses.
 */
export function autoFillAll(state: RecallState): RecallState {
  const log = [...state.log];
  for (let ply = state.index; ply < state.moves.length; ply++) {
    const theirs =
      state.autoOpponent && sideOfPly(state, ply) !== state.playerColor;
    log.push({
      ...moveNumberOf(state, ply),
      move: state.moves[ply],
      status: theirs ? "auto" : "autoFilled",
    });
  }
  return {
    ...state,
    index: state.moves.length,
    log,
    lastFeedback: null,
  };
}

/**
 * The position (an index into `replayMoves`' list, 0 = the start) the log
 * entry at `entryIndex` shows when tapped in the summary, as the web's
 * quick-peek resolves it: a wrong try shows the board it was entered on, any
 * other entry the board right after its move. Wrong tries do not advance the
 * game, so the ply is the count of the other entries before it.
 */
export function positionOfEntry(
  log: readonly MoveLogEntry[],
  entryIndex: number,
): number {
  let ply = 0;
  for (let i = 0; i < entryIndex; i++) {
    if (log[i].status !== "incorrect") ply++;
  }
  return log[entryIndex]?.status === "incorrect" ? ply : ply + 1;
}
