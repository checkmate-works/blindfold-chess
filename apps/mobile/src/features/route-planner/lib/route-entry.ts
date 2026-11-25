import { isValidSquare } from "@blindfold-chess/features/common";
import type { Square } from "@blindfold-chess/types";

/**
 * The route being typed on the keypad: the squares committed so far, plus a
 * file and a rank staged towards the next one.
 */
export type RouteEntry = {
  moves: Square[];
  selectedFile: string | null;
  selectedRank: string | null;
};

export type RouteEntryAction =
  | { type: "file"; file: string }
  | { type: "rank"; rank: string }
  | { type: "undo" }
  | { type: "replace"; moves: Square[] }
  | { type: "reset" };

export const EMPTY_ROUTE_ENTRY: RouteEntry = {
  moves: [],
  selectedFile: null,
  selectedRank: null,
};

/**
 * The web's keypad rules (`useStagedCoordinate` with the route planner's
 * press handlers): a file and a rank may be pressed in either order, the
 * same key pressed again takes it back, and once both are staged they
 * become the next square of the route. Undo drops the last square and
 * whatever was staged.
 */
export function routeEntryReducer(
  state: RouteEntry,
  action: RouteEntryAction,
): RouteEntry {
  switch (action.type) {
    case "file": {
      const file = action.file === state.selectedFile ? null : action.file;
      return commitIfComplete({ ...state, selectedFile: file });
    }
    case "rank": {
      const rank = action.rank === state.selectedRank ? null : action.rank;
      return commitIfComplete({ ...state, selectedRank: rank });
    }
    case "undo":
      return { ...EMPTY_ROUTE_ENTRY, moves: state.moves.slice(0, -1) };
    case "replace":
      return { ...EMPTY_ROUTE_ENTRY, moves: action.moves };
    case "reset":
      return EMPTY_ROUTE_ENTRY;
  }
}

function commitIfComplete(state: RouteEntry): RouteEntry {
  const { selectedFile, selectedRank } = state;
  if (selectedFile === null || selectedRank === null) return state;
  const square = `${selectedFile}${selectedRank}`;
  if (!isValidSquare(square)) return state;
  return { ...EMPTY_ROUTE_ENTRY, moves: [...state.moves, square] };
}
