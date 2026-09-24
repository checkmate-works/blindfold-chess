/**
 * The move the board builder's cursor rests on: the position key its note and
 * markup are stored under, and the move's display label.
 */
export type MoveCursor = { positionKey: string; label: string };

export type MovesInputMode = 'pgn' | 'board';

/**
 * The moves editor shared by the repertoire import form and the line form: a
 * Board / PGN switcher over one PGN string.
 *
 * Both modes read and write the same `pgn` — the board serializes its move
 * tree through it — so detection, validation and submission never care which
 * mode filled it. The cursor, though, is a board-only notion: it is the move
 * the note field under the board annotates. It exists only on the `board`
 * variant, so leaving the board drops it and coming back starts from `null`
 * until the freshly mounted builder reports where its cursor sits.
 *
 * This replaces independent `inputMode` / `pgn` / `cursor` states in which the
 * cursor outlived the board: switching to PGN left it set, and on the way back
 * the note field rendered for that stale move until the builder's first report
 * overwrote it.
 */
export type MovesEditorState =
  { mode: 'pgn'; pgn: string } | { mode: 'board'; pgn: string; cursor: MoveCursor | null };

export type MovesEditorAction =
  | { type: 'switchMode'; mode: MovesInputMode }
  | { type: 'editPgn'; pgn: string }
  | { type: 'moveCursor'; cursor: MoveCursor | null };

export function initialMovesEditor(mode: MovesInputMode, pgn: string): MovesEditorState {
  return mode === 'board' ? { mode, pgn, cursor: null } : { mode, pgn };
}

/**
 * - `switchMode` keeps the PGN and rebuilds the variant: into `board` with no
 *   cursor yet, into `pgn` without one at all.
 * - `editPgn` replaces the PGN in either mode.
 * - `moveCursor` applies only in `board` mode; outside it there is no board to
 *   have a cursor, so the report is dropped.
 *
 * An action that changes nothing returns the same state object, so React
 * skips the re-render.
 */
export function movesEditorReducer(
  state: MovesEditorState,
  action: MovesEditorAction
): MovesEditorState {
  switch (action.type) {
    case 'switchMode':
      return state.mode === action.mode ? state : initialMovesEditor(action.mode, state.pgn);
    case 'editPgn':
      return state.pgn === action.pgn ? state : { ...state, pgn: action.pgn };
    case 'moveCursor':
      if (state.mode !== 'board') return state;
      if (sameCursor(state.cursor, action.cursor)) return state;
      return { ...state, cursor: action.cursor };
  }
}

function sameCursor(a: MoveCursor | null, b: MoveCursor | null): boolean {
  if (a === null || b === null) return a === b;
  return a.positionKey === b.positionKey && a.label === b.label;
}
