import type { Side } from "@blindfold-chess/types";

/** How one ply of the game was recalled. */
export type RecallPlyOutcome =
  /** Entered by the player; `mistakes` wrong tries came first. */
  | { kind: "recalled"; mistakes: number }
  /** The player gave up ("I don't know") after `mistakes` wrong tries. */
  | { kind: "revealed"; mistakes: number }
  /** The opponent's move, played automatically. */
  | { kind: "auto" };

export type RecallState = {
  /** The game's moves in SAN, in order. */
  moves: readonly string[];
  /** The side the first move belongs to (black for a FEN with black to move). */
  firstMover: Side;
  /** The side whose moves the player recalls when `autoOpponent` is on. */
  playerColor: Side;
  autoOpponent: boolean;
  /** Plies done so far; the next move to recall is `moves[index]`. */
  index: number;
  /** Wrong tries at the current ply. */
  mistakes: number;
  /** One entry per ply done. */
  outcomes: RecallPlyOutcome[];
  /** The latest wrong try, for feedback; cleared by any other action. */
  lastWrong: string | null;
};

export function sideOfPly(state: RecallState, ply: number): Side {
  const firstIsWhite = state.firstMover === "white";
  const even = ply % 2 === 0;
  return even === firstIsWhite ? "white" : "black";
}

/** Plays the opponent's moves while auto-opponent is on and it is their turn. */
function advanceOpponent(state: RecallState): RecallState {
  if (!state.autoOpponent) return state;
  let { index } = state;
  const outcomes = [...state.outcomes];
  while (
    index < state.moves.length &&
    sideOfPly(state, index) !== state.playerColor
  ) {
    outcomes.push({ kind: "auto" });
    index += 1;
  }
  return { ...state, index, outcomes };
}

export function createRecallState(options: {
  moves: readonly string[];
  firstMover: Side;
  playerColor: Side;
  autoOpponent: boolean;
}): RecallState {
  return advanceOpponent({
    ...options,
    index: 0,
    mistakes: 0,
    outcomes: [],
    lastWrong: null,
  });
}

export function isRecallComplete(state: RecallState): boolean {
  return state.index >= state.moves.length;
}

/** Strips check and mate marks so `Qh5` matches `Qh5+`. */
function normalizeSan(san: string): string {
  return san.replace(/[+#!?]+$/u, "");
}

/**
 * Scores one entered move. A correct move advances (and lets the auto
 * opponent reply); a wrong one stays on the same ply and counts a mistake.
 */
export function submitRecallMove(state: RecallState, san: string): RecallState {
  if (isRecallComplete(state)) return state;
  const expected = state.moves[state.index];
  if (normalizeSan(san) !== normalizeSan(expected)) {
    return { ...state, mistakes: state.mistakes + 1, lastWrong: san };
  }
  return advanceOpponent({
    ...state,
    index: state.index + 1,
    mistakes: 0,
    lastWrong: null,
    outcomes: [
      ...state.outcomes,
      { kind: "recalled", mistakes: state.mistakes },
    ],
  });
}

/** "I don't know": shows the move as given up and moves on. */
export function revealRecallMove(state: RecallState): RecallState {
  if (isRecallComplete(state)) return state;
  return advanceOpponent({
    ...state,
    index: state.index + 1,
    mistakes: 0,
    lastWrong: null,
    outcomes: [
      ...state.outcomes,
      { kind: "revealed", mistakes: state.mistakes },
    ],
  });
}

export type RecallStats = {
  /** Plies the player had to recall (auto moves excluded). */
  total: number;
  /** Recalled with no wrong try. */
  nailed: number;
  /** Recalled after one or more wrong tries. */
  struggled: number;
  /** Given up. */
  missed: number;
  /** Wrong tries over the whole game. */
  mistakes: number;
  /** `nailed / total` as a percentage, 0 when there was nothing to recall. */
  rate: number;
};

export function computeRecallStats(state: RecallState): RecallStats {
  let nailed = 0;
  let struggled = 0;
  let missed = 0;
  let mistakes = 0;
  for (const outcome of state.outcomes) {
    if (outcome.kind === "auto") continue;
    mistakes += outcome.mistakes;
    if (outcome.kind === "revealed") missed += 1;
    else if (outcome.mistakes === 0) nailed += 1;
    else struggled += 1;
  }
  const total = nailed + struggled + missed;
  return {
    total,
    nailed,
    struggled,
    missed,
    mistakes,
    rate: total === 0 ? 0 : Math.round((nailed / total) * 100),
  };
}
