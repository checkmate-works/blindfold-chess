/**
 * The value sets the global game preferences are built from. Each `as const`
 * array is the runtime source of truth for validating untyped input (stored
 * preferences, cookies, per-game play settings), and the type derives from it
 * so the two cannot drift.
 */
import type { BoardTheme } from "@blindfold-chess/types";

/**
 * How a player enters a move: typed algebraic notation, a pair of square
 * dropdowns, or on-screen piece/square buttons. Not every platform offers
 * every mode — the mobile app only has the button keypad — so a platform
 * narrows this list in its UI, not here, which keeps a stored value valid on
 * every platform that reads it.
 */
export const MOVE_INPUT_MODES = ["text", "select", "button"] as const;
export type MoveInputMode = (typeof MOVE_INPUT_MODES)[number];

/** The mode a new player starts with: the button keypad, available everywhere. */
export const DEFAULT_MOVE_INPUT_MODE: MoveInputMode = "button";

/**
 * Which modes the mode switcher offers by default; a single entry means no
 * switcher is shown. A mutable array because the preferences object stores
 * `MoveInputMode[]` — copy it before putting it into state.
 */
export const DEFAULT_ENABLED_MOVE_INPUT_MODES: MoveInputMode[] = ["button"];

/** How the button keypad labels its piece buttons: a letter or an icon. */
export const BUTTON_INPUT_PIECE_LABELS = ["text", "icon"] as const;
export type ButtonInputPieceLabel = (typeof BUTTON_INPUT_PIECE_LABELS)[number];

/** The board theme a new player sees: lichess brown. */
export const DEFAULT_BOARD_THEME: BoardTheme = "lichess";

/**
 * Three-state flag describing how the chessboard surfaces to the player
 * during gameplay:
 *
 * - `'always'` — the board is always visible. The blindfold experience is
 *   preserved (or graded down) through the visual settings (`pieceColors`,
 *   `pieceShapeMode`, `showOwnPieces`, `showOpponentPieces`) rather than by
 *   hiding the board entirely. This unlocks a "see the coordination but not
 *   the piece types" middle ground.
 * - `'peek'` — the board is hidden by default; the player invokes a peek
 *   action to view it.
 * - `'never'` — the board is never shown. Pure blindfold mode.
 *
 * This replaces the earlier boolean `showBoardButtonInGame`, which conflated
 * "is the board ever viewable?" with "is a peek button surfaced?" and left no
 * room for the always-visible mode.
 */
export const BOARD_VISIBILITY_VALUES = ["always", "peek", "never"] as const;
export type BoardVisibility = (typeof BOARD_VISIBILITY_VALUES)[number];

/** Default for new sessions — the historical behaviour of "show a peek button". */
export const DEFAULT_BOARD_VISIBILITY: BoardVisibility = "peek";

/**
 * Translate the legacy `showBoardButtonInGame: boolean` into a
 * `BoardVisibility`. The mapping is exact: `true` (a button was shown) →
 * `'peek'`, `false` (no button, the board was never shown) → `'never'`.
 *
 * Used at every read boundary (stored-preference validators, cookie decoder,
 * change-log normalisation) so in-memory state never sees the legacy boolean.
 * `'always'` cannot arise from migration; it only enters through an explicit
 * user choice.
 */
export function legacyToBoardVisibility(
  showBoardButtonInGame: boolean,
): BoardVisibility {
  return showBoardButtonInGame ? "peek" : "never";
}

/** Type guard for runtime validators reading data from disk / cookies. */
export function isBoardVisibility(value: unknown): value is BoardVisibility {
  return (
    typeof value === "string" &&
    (BOARD_VISIBILITY_VALUES as readonly string[]).includes(value)
  );
}

/**
 * How long the AI-reply indicator keeps the opponent's last move visible
 * after the AI replies, in milliseconds.
 *
 * `0` is the sentinel for "keep it visible indefinitely" — the move stays
 * until the AI's next reply re-triggers the indicator, which in practice
 * means through the player's whole turn.
 *
 * Only meaningful in blindfold modes (`boardVisibility !== 'always'`); with
 * the board always shown the move is read straight off the board.
 */
export const AI_REPLY_DURATION_VALUES = [0, 5000, 10000] as const;
export type AiReplyDuration = (typeof AI_REPLY_DURATION_VALUES)[number];

/** Sentinel value meaning "never auto-dismiss the AI move". */
export const AI_REPLY_DURATION_KEEP = 0;

/** Default — a 5-second auto-dismiss window. */
export const DEFAULT_AI_REPLY_DURATION: AiReplyDuration = 5000;

/** Type guard for runtime validators reading stored data. */
export function isAiReplyDuration(value: unknown): value is AiReplyDuration {
  return (
    typeof value === "number" &&
    (AI_REPLY_DURATION_VALUES as readonly number[]).includes(value)
  );
}
