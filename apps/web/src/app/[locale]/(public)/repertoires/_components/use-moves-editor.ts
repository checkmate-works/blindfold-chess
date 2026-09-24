'use client';

import { useReducer } from 'react';

import type { MoveCursor, MovesInputMode } from '../_lib/moves-editor';
import { initialMovesEditor, movesEditorReducer } from '../_lib/moves-editor';

/**
 * State for the Board / PGN moves editor of the repertoire import and line
 * forms — see {@link movesEditorReducer} for why the cursor lives only on the
 * board variant. The initial values are read on mount only.
 *
 * The setters are plain dispatch wrappers with a new identity per render;
 * `RepertoireBoardBuilder` reads its callbacks through latest-refs, so that
 * does not re-fire its effects.
 */
export function useMovesEditor(initialMode: MovesInputMode, initialPgn: string) {
  const [state, dispatch] = useReducer(movesEditorReducer, undefined, () =>
    initialMovesEditor(initialMode, initialPgn)
  );

  return {
    mode: state.mode,
    pgn: state.pgn,
    /** The board cursor's move; always null while the PGN tab is up. */
    cursor: state.mode === 'board' ? state.cursor : null,
    switchMode: (mode: MovesInputMode) => dispatch({ type: 'switchMode', mode }),
    setPgn: (pgn: string) => dispatch({ type: 'editPgn', pgn }),
    setCursor: (cursor: MoveCursor | null) => dispatch({ type: 'moveCursor', cursor }),
  };
}
