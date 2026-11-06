import type { MoveInputMode } from "@blindfold-chess/features/game-preferences";

/**
 * The move-input modes the mobile app can actually render. The shared
 * preference accepts the web's `'text'` and `'select'` too, so a stored value
 * stays valid on every platform, but mobile has only the button keypad; the
 * settings picker offers this list, and the AI game renders the keypad
 * whatever the stored mode says. A mode added here needs its input component
 * in the AI-game session first.
 */
export const MOBILE_MOVE_INPUT_MODES = [
  "button",
] as const satisfies readonly MoveInputMode[];
