/**
 * How a player enters a move: typed algebraic notation, a pair of square
 * dropdowns, or on-screen piece/square buttons.
 *
 * The `as const` array is the runtime source of truth for validating untyped
 * input — the preference cookie, localStorage records, per-game play settings —
 * and the type derives from it so the two cannot drift. Five modules used to
 * spell the three values out, two of them as bare unions no validator could
 * check against.
 */
export const MOVE_INPUT_MODES = ['text', 'select', 'button'] as const;

export type MoveInputMode = (typeof MOVE_INPUT_MODES)[number];
