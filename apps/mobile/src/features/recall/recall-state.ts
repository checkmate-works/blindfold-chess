import { computeMoveNumber } from "@blindfold-chess/features/chess-core/move-numbering";
import type { Side } from "@blindfold-chess/types";

/**
 * One line of the recall's move log, the web's `MoveLogEntry`.
 *
 * - `correct`: the player recalled and entered the move.
 * - `incorrect`: a wrong try (`incorrectMove` holds what was entered); it
 *   comes before the entry that resolves the same move.
 * - `skipped`: the player gave up on this move ("I don't know").
 * - `autoFilled`: the move was resolved by "Auto-fill All" rather than given
 *   up on one at a time. It counts as a miss like `skipped`, but stays apart
 *   so the summary can fold the whole run into one marker.
 * - `auto`: the opponent's move, played by "Auto-fill opponent's moves". Not
 *   the player's to recall, so it is left out of the stats.
 */
export type MoveLogEntry = {
  moveNumber: number;
  isWhiteMove: boolean;
  move: string;
  status: "correct" | "incorrect" | "auto" | "skipped" | "autoFilled";
  incorrectMove?: string;
};

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

/**
 * Wrong tries at one move after which the session offers the answer: a
 * one-line prompt appears and "I don't know" turns into the primary "Show
 * answer". The web's `DONT_KNOW_PROMPT_THRESHOLD`; the offer stays inline
 * rather than in a dialog, because giving up counts against the recall rate
 * and a dialog that takes focus turns a stray tap into a miss.
 */
export const DONT_KNOW_PROMPT_THRESHOLD = 3;

/** "I don't know" presses after which "Auto-fill All" appears. */
export const AUTO_FILL_ALL_THRESHOLD = 2;

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
 * Wrong tries at the move not yet resolved: the trailing run of `incorrect`
 * entries, since every resolution appends an entry of another kind.
 */
export function countCurrentMoveMistakes(log: readonly MoveLogEntry[]): number {
  let count = 0;
  for (let i = log.length - 1; i >= 0 && log[i].status === "incorrect"; i--) {
    count++;
  }
  return count;
}

export type RecallStats = {
  /** Moves the player had to recall: nailed + struggled + missed. */
  total: number;
  /** Recalled with no wrong try. */
  nailed: number;
  /** Recalled after one or more wrong tries. */
  struggled: number;
  /** Given up ("I don't know" / "Auto-fill All"). */
  missed: number;
  /** Wrong tries over the whole game (can exceed the move count). */
  mistakes: number;
  /** nailed + struggled. */
  recalled: number;
  /** `recalled / total`, 0..1; 0 when there was nothing to recall. */
  recallRate: number;
};

/** The web's `computeRecallStats`, over the same log. */
export function computeRecallStats(log: readonly MoveLogEntry[]): RecallStats {
  let nailed = 0;
  let struggled = 0;
  let missed = 0;
  let mistakes = 0;
  let mistakesForCurrent = 0;
  for (const entry of log) {
    switch (entry.status) {
      case "incorrect":
        mistakes++;
        mistakesForCurrent++;
        break;
      case "correct":
        if (mistakesForCurrent > 0) struggled++;
        else nailed++;
        mistakesForCurrent = 0;
        break;
      case "skipped":
      case "autoFilled":
        missed++;
        mistakesForCurrent = 0;
        break;
      case "auto":
        mistakesForCurrent = 0;
        break;
    }
  }
  const recalled = nailed + struggled;
  const total = recalled + missed;
  return {
    total,
    nailed,
    struggled,
    missed,
    mistakes,
    recalled,
    recallRate: total > 0 ? recalled / total : 0,
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
