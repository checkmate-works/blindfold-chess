/**
 * Pure state transitions for one Knight's Tour attempt.
 *
 * Both apps drive the same rules — a move is accepted only if it is a knight
 * move to an unvisited square, undo pops the last square, the tour is
 * finished at 64 squares — so the transitions live here and the platform
 * hooks/screens only hold the resulting state.
 */
import { generateRandomSquare } from "../common/utils";
import {
  isClosedTourPossible,
  isTourComplete,
  isValidKnightMove,
} from "./knight-tour";

/** `"random"` or a concrete square such as `"e4"`. */
export type KnightTourStartingSquare = string;

export const RANDOM_STARTING_SQUARE = "random";

/** The settings a player picks before a tour. */
export type KnightTourSettings = {
  startingSquare: KnightTourStartingSquare;
  /** Play from coordinates alone, without the board. */
  blindfoldMode: boolean;
};

export const DEFAULT_KNIGHT_TOUR_SETTINGS: KnightTourSettings = {
  startingSquare: RANDOM_STARTING_SQUARE,
  blindfoldMode: false,
};

/**
 * The concrete square a tour starts on: a random one for `"random"`, the
 * option itself otherwise.
 */
export function resolveStartingSquare(
  option: KnightTourStartingSquare,
  pickRandom: () => string = generateRandomSquare,
): string {
  return option === RANDOM_STARTING_SQUARE ? pickRandom() : option;
}

export type KnightTourState = {
  startingSquare: string;
  currentSquare: string;
  /** Square → 1-based move number on which it was reached. */
  visitedSquares: ReadonlyMap<string, number>;
  /** Squares in the order they were visited, starting square first. */
  moveHistory: readonly string[];
};

/**
 * The placeholder before a tour starts. An empty `currentSquare` has no
 * knight moves, so nothing can be applied to it.
 */
export const EMPTY_KNIGHT_TOUR_STATE: KnightTourState = {
  startingSquare: "",
  currentSquare: "",
  visitedSquares: new Map(),
  moveHistory: [],
};

/** A fresh tour with the knight on `square` (counted as move 1). */
export function createKnightTourState(square: string): KnightTourState {
  return {
    startingSquare: square,
    currentSquare: square,
    visitedSquares: new Map([[square, 1]]),
    moveHistory: [square],
  };
}

/**
 * The state after moving to `target`, or the same `state` object when the
 * move is not a knight move or lands on a visited square — callers can
 * compare by identity to tell whether the move was accepted.
 */
export function applyKnightMove(
  state: KnightTourState,
  target: string,
): KnightTourState {
  if (!isValidKnightMove(state.currentSquare, target)) return state;
  if (state.visitedSquares.has(target)) return state;

  const visitedSquares = new Map(state.visitedSquares);
  visitedSquares.set(target, state.visitedSquares.size + 1);
  return {
    ...state,
    currentSquare: target,
    visitedSquares,
    moveHistory: [...state.moveHistory, target],
  };
}

/**
 * The state with the last move taken back. The starting square cannot be
 * undone, so a one-square tour comes back unchanged (same object).
 */
export function undoKnightMove(state: KnightTourState): KnightTourState {
  if (state.moveHistory.length <= 1) return state;

  const moveHistory = state.moveHistory.slice(0, -1);
  const visitedSquares = new Map(state.visitedSquares);
  visitedSquares.delete(state.currentSquare);
  return {
    ...state,
    currentSquare: moveHistory[moveHistory.length - 1],
    visitedSquares,
    moveHistory,
  };
}

/** What a finished (completed or abandoned) tour reports. */
export type KnightTourSummary = {
  startingSquare: string;
  lastSquare: string;
  visitedSquares: ReadonlyMap<string, number>;
  /** All 64 squares visited. */
  success: boolean;
  /** Complete, and the last square is a knight move from the first. */
  isClosedTour: boolean;
};

/** Summarise a tour state for the result screen. */
export function summarizeKnightTour(state: KnightTourState): KnightTourSummary {
  const visited = state.visitedSquares;
  return {
    startingSquare: state.startingSquare,
    lastSquare: state.currentSquare,
    visitedSquares: state.visitedSquares,
    success: isTourComplete(visited),
    isClosedTour: isClosedTourPossible(
      state.currentSquare,
      state.startingSquare,
      visited,
    ),
  };
}

/**
 * Rebuild a tour state from its visit order, e.g. after passing the path
 * through route params. Squares that would not be accepted as moves are
 * dropped, so a tampered path cannot produce an impossible tour.
 */
export function knightTourStateFromPath(
  path: readonly string[],
): KnightTourState {
  const [first, ...rest] = path;
  if (!first) return EMPTY_KNIGHT_TOUR_STATE;
  return rest.reduce(applyKnightMove, createKnightTourState(first));
}
