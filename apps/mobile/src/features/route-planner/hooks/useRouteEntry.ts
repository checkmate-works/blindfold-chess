import { useCallback, useMemo, useReducer } from "react";
import type { Square } from "@blindfold-chess/types";

import { EMPTY_ROUTE_ENTRY, routeEntryReducer } from "../lib/route-entry";

/**
 * The keypad's route for one problem (`routeEntryReducer`). While
 * `disabled` (the countdown, the verdict being shown, a wait for the
 * server) the keys and undo do nothing; `replaceMoves` and `reset` still
 * work, for the submitted route and the next problem.
 */
export function useRouteEntry({ disabled }: { disabled: boolean }) {
  const [state, dispatch] = useReducer(routeEntryReducer, EMPTY_ROUTE_ENTRY);

  const pressFile = useCallback(
    (file: string) => {
      if (!disabled) dispatch({ type: "file", file });
    },
    [disabled],
  );
  const pressRank = useCallback(
    (rank: string) => {
      if (!disabled) dispatch({ type: "rank", rank });
    },
    [disabled],
  );
  const undo = useCallback(() => {
    if (!disabled) dispatch({ type: "undo" });
  }, [disabled]);
  const replaceMoves = useCallback(
    (moves: Square[]) => dispatch({ type: "replace", moves }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return useMemo(
    () => ({ ...state, pressFile, pressRank, undo, replaceMoves, reset }),
    [state, pressFile, pressRank, undo, replaceMoves, reset],
  );
}
